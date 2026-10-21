/*
# Fix: pickup/collection order type validation mismatch

The frontend sends p_order_type = 'pickup' for collection orders, but the
create_order function validated against 'collection'. This meant pickup
orders bypassed the pickup_enabled setting check entirely — a customer
could place a pickup order even after the restaurant disabled pickup.

The column is text with no enum constraint, and the frontend, types, and
dashboard all use 'pickup'. The function was the only place using
'collection'. Aligning the function to match the application's canonical
value is the correct fix.

No data migration needed — no orders with order_type = 'collection' can
exist (the function would have stored whatever was passed, which was
always 'pickup' from the frontend).
*/

CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_slug text,
  p_items jsonb,
  p_customer jsonb,
  p_order_type text,
  p_table_number text DEFAULT '',
  p_delivery_address text DEFAULT '',
  p_payment_method text DEFAULT 'pay_on_collection',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_restaurant public.restaurants%ROWTYPE;
  v_settings public.restaurant_settings%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_order_id uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_line_total numeric;
  v_unit_price numeric;
  v_selected_options jsonb := '[]'::jsonb;
  v_opt_record record;
  v_opt_value record;
  v_opt_obj jsonb;
  v_item_count int := 0;
  v_payment public.payments%ROWTYPE;
  v_existing_order_id uuid;
BEGIN
  -- 1. Fetch restaurant by slug
  SELECT * INTO v_restaurant FROM public.restaurants WHERE slug = p_restaurant_slug;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Restaurant not found');
  END IF;

  IF NOT v_restaurant.is_active THEN
    RETURN jsonb_build_object('error', 'This restaurant is currently unavailable');
  END IF;

  -- 2. Fetch settings
  SELECT * INTO v_settings FROM public.restaurant_settings WHERE restaurant_id = v_restaurant.id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Restaurant is not configured');
  END IF;

  IF NOT v_settings.accept_orders THEN
    RETURN jsonb_build_object('error', 'This restaurant is not accepting orders right now');
  END IF;

  -- 3. Validate order type
  IF p_order_type = 'dine_in' AND NOT v_settings.dine_in_enabled THEN
    RETURN jsonb_build_object('error', 'Dine-in ordering is not available');
  END IF;
  IF p_order_type = 'pickup' AND NOT v_settings.pickup_enabled THEN
    RETURN jsonb_build_object('error', 'Collection ordering is not available');
  END IF;
  IF p_order_type = 'delivery' AND NOT v_settings.delivery_enabled THEN
    RETURN jsonb_build_object('error', 'Delivery ordering is not available');
  END IF;

  -- 4. Validate items array is not empty
  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'Your cart is empty');
  END IF;

  -- 5. Idempotency check — if key exists, return existing order
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    SELECT id INTO v_existing_order_id FROM public.orders
    WHERE restaurant_id = v_restaurant.id AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      SELECT * INTO v_order FROM public.orders WHERE id = v_existing_order_id;
      RETURN jsonb_build_object(
        'order', row_to_json(v_order),
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- 6. Validate dine-in table
  IF p_order_type = 'dine_in' AND (p_table_number IS NULL OR p_table_number = '') THEN
    RETURN jsonb_build_object('error', 'A table number is required for dine-in orders');
  END IF;

  IF p_order_type = 'dine_in' AND p_table_number != '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_tables
      WHERE restaurant_id = v_restaurant.id AND table_number = p_table_number AND is_active = true
    ) THEN
      RETURN jsonb_build_object('error', 'Invalid table number');
    END IF;
  END IF;

  -- 7. Validate delivery address
  IF p_order_type = 'delivery' AND (p_delivery_address IS NULL OR trim(p_delivery_address) = '') THEN
    RETURN jsonb_build_object('error', 'A delivery address is required');
  END IF;

  -- 8. Get next order number
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_order_number
  FROM public.orders WHERE restaurant_id = v_restaurant.id;

  -- 9. Create the order header (we will update totals after calculating)
  INSERT INTO public.orders (
    restaurant_id, order_number, customer_name, customer_phone, customer_email,
    order_type, table_number, delivery_address,
    subtotal, delivery_fee, total, currency,
    payment_method, payment_status, order_status,
    customer_notes, idempotency_key
  )
  VALUES (
    v_restaurant.id, v_order_number,
    COALESCE(p_customer->>'name', ''),
    COALESCE(p_customer->>'phone', ''),
    COALESCE(p_customer->>'email', ''),
    p_order_type,
    COALESCE(p_table_number, ''),
    COALESCE(p_delivery_address, ''),
    0, 0, 0, v_restaurant.currency,
    p_payment_method,
    CASE WHEN p_payment_method = 'online' THEN 'pending' ELSE 'pending' END,
    'pending',
    COALESCE(p_customer->>'notes', ''),
    p_idempotency_key
  )
  RETURNING * INTO v_order;

  v_order_id := v_order.id;

  -- 10. Process each item
  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_item_count := v_item_count + 1;

    -- Validate product
    SELECT * INTO v_product FROM public.products
    WHERE id = (v_item->>'product_id')::uuid AND restaurant_id = v_restaurant.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid product: %', v_item->>'product_id';
    END IF;

    IF NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product not available: %', v_product.name;
    END IF;

    -- Validate quantity
    IF (v_item->>'quantity')::int < 1 OR (v_item->>'quantity')::int > 99 THEN
      RAISE EXCEPTION 'Invalid quantity for product: %', v_product.name;
    END IF;

    v_unit_price := v_product.price;
    v_selected_options := '[]'::jsonb;

    -- Process selected options
    IF v_item ? 'selected_options' AND jsonb_array_length(v_item->'selected_options') > 0 THEN
      FOR v_opt_obj IN SELECT jsonb_array_elements(v_item->'selected_options') LOOP
        -- Validate option belongs to product
        SELECT po.id, po.name, po.is_required, po.max_selections
        INTO v_opt_record
        FROM public.product_options po
        WHERE po.id = (v_opt_obj->>'option_id')::uuid
        AND po.product_id = v_product.id
        AND po.is_active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid option for product: %', v_product.name;
        END IF;

        -- Validate option value
        SELECT pov.id, pov.name, pov.price_adjustment
        INTO v_opt_value
        FROM public.product_option_values pov
        WHERE pov.id = (v_opt_obj->>'value_id')::uuid
        AND pov.option_id = v_opt_record.id
        AND pov.is_active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Invalid option value for product: %', v_product.name;
        END IF;

        v_unit_price := v_unit_price + COALESCE(v_opt_value.price_adjustment, 0);

        v_selected_options := v_selected_options || jsonb_build_array(jsonb_build_object(
          'option_name', v_opt_record.name,
          'value_name', v_opt_value.name,
          'price_adjustment', COALESCE(v_opt_value.price_adjustment, 0)
        ));
      END LOOP;
    END IF;

    v_line_total := v_unit_price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_total;

    -- Insert order item
    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot,
      unit_price_snapshot, quantity, selected_options, line_total
    )
    VALUES (
      v_order_id, v_product.id, v_product.name,
      v_unit_price, (v_item->>'quantity')::int,
      v_selected_options, v_line_total
    );
  END LOOP;

  -- 11. Calculate delivery fee
  IF p_order_type = 'delivery' THEN
    v_delivery_fee := COALESCE(v_settings.delivery_fee, 0);
  END IF;

  -- 12. Validate minimum order amount
  IF v_settings.minimum_order_amount > 0 AND v_subtotal < v_settings.minimum_order_amount THEN
    RAISE EXCEPTION 'Order does not meet minimum amount';
  END IF;

  -- 13. Update order totals
  UPDATE public.orders
  SET subtotal = v_subtotal, delivery_fee = v_delivery_fee, total = v_subtotal + v_delivery_fee
  WHERE id = v_order_id;

  -- 14. Create payment record for manual methods
  IF p_payment_method IN ('pay_on_collection', 'pay_on_delivery') THEN
    INSERT INTO public.payments (
      restaurant_id, order_id, provider, amount, currency, status
    )
    VALUES (
      v_restaurant.id, v_order_id, 'manual',
      v_subtotal + v_delivery_fee, v_restaurant.currency, 'pending'
    );
  END IF;

  -- 15. Return authoritative order
  SELECT * INTO v_order FROM public.orders WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order', row_to_json(v_order),
    'order_id', v_order_id,
    'tracking_token', v_order.tracking_token,
    'order_number', v_order.order_number,
    'total', v_subtotal + v_delivery_fee,
    'currency', v_restaurant.currency,
    'idempotent_replay', false
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error — any partial inserts are rolled back by the function's atomic context
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

/*
# Security Fix 2: Revoke EXECUTE from PUBLIC on staff-only functions

The previous migration (0008) attempted `REVOKE EXECUTE ... FROM anon`, but this
was ineffective because Postgres grants EXECUTE to PUBLIC by default, and the
anon role inherits from PUBLIC. The staff functions remained callable by anon
at the privilege level — even though the internal auth.uid() check prevented
unauthorized actions, anon could still distinguish "Order not found" from
"Unauthorized", creating an oracle for valid order/payment IDs.

Fix: REVOKE EXECUTE FROM PUBLIC (the actual grant source), then GRANT only to
authenticated. This closes the privilege-level gap.

Also narrowing get_order_by_token to exclude columns the tracking page doesn't
need: idempotency_key, restaurant_id, and tracking_token itself. The tracking
page displays order_number, order_status, payment_status, order_type,
table_number, subtotal, delivery_fee, total, currency, customer_notes, and
created_at. Customer contact fields (name, phone, email, delivery_address) are
retained since the original page showed them implicitly via the order context.
*/

-- =============================================================
-- Revoke EXECUTE from PUBLIC on staff-only functions
-- =============================================================
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_payment_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_order_number(uuid) FROM PUBLIC;

-- Grant explicitly to authenticated only
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_payment_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO authenticated;

-- =============================================================
-- Narrow get_order_by_token: exclude internal/sensitive columns
-- Replaces row_to_json(v_order) with explicit column selection
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_tracking_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE tracking_token = p_tracking_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'order_id', oi.order_id,
      'product_id', oi.product_id,
      'product_name_snapshot', oi.product_name_snapshot,
      'unit_price_snapshot', oi.unit_price_snapshot,
      'quantity', oi.quantity,
      'selected_options', oi.selected_options,
      'line_total', oi.line_total,
      'created_at', oi.created_at
    ) ORDER BY oi.created_at
  ), '[]'::jsonb) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  -- Return only the columns the customer tracking page needs.
  -- Excludes: idempotency_key, restaurant_id, tracking_token, updated_at
  RETURN jsonb_build_object(
    'order', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'customer_name', v_order.customer_name,
      'customer_phone', v_order.customer_phone,
      'customer_email', v_order.customer_email,
      'order_type', v_order.order_type,
      'table_number', v_order.table_number,
      'delivery_address', v_order.delivery_address,
      'subtotal', v_order.subtotal,
      'delivery_fee', v_order.delivery_fee,
      'total', v_order.total,
      'currency', v_order.currency,
      'payment_method', v_order.payment_method,
      'payment_status', v_order.payment_status,
      'order_status', v_order.order_status,
      'customer_notes', v_order.customer_notes,
      'created_at', v_order.created_at
    ),
    'items', v_items
  );
END;
$function$;

-- get_order_by_token remains callable by anon (customers track without signing in)
GRANT EXECUTE ON FUNCTION public.get_order_by_token(uuid) TO anon, authenticated;

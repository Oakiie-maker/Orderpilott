/*
# Security Fix: Order Tracking Token Enforcement + Function Authorization

## Critical Fixes

### Fix 1: Public order exposure (orders + order_items RLS)
The previous `orders_public_select_by_token` policy used `USING (tracking_token IS NOT NULL)`.
Since `tracking_token` is `uuid NOT NULL DEFAULT gen_random_uuid()`, it is never NULL,
so the policy granted public SELECT on every order across every restaurant — exposing
all customer PII (names, phones, emails, delivery addresses) and financial data.

The previous `order_items_select` policy had the same flaw: it checked
`o.tracking_token IS NOT NULL` (always true), exposing all order items publicly.

Fix: Remove both broken public SELECT policies. Replace with a SECURITY DEFINER
function `get_order_by_token(p_tracking_token uuid)` that:
- Looks up the order by tracking_token (the secret UUID the customer received).
- Returns the order row + its items as a JSONB result.
- Is callable by anon (customers don't sign in) but only returns data for the
  exact order matching the supplied token.
- Is the ONLY way anon users can read order data.

The orders and order_items tables retain their member-scoped SELECT policies
for authenticated restaurant staff. Public access is now exclusively through
the token-gated function.

### Fix 2: Authorization bypass in update_order_status / update_payment_status
Both functions accepted a `p_user_id uuid DEFAULT NULL` parameter and used
`COALESCE(p_user_id, auth.uid())` for the membership check. This allowed any
caller (including anon) to supply a known member's UUID and bypass authorization.

Fix: Drop and recreate both functions WITHOUT the p_user_id parameter. They now
use `auth.uid()` exclusively. Anon calls will fail the membership check (auth.uid()
returns NULL for anon, and no restaurant_members row has user_id = NULL).

Additionally, REVOKE EXECUTE on both functions from anon and authenticated, then
GRANT EXECUTE only to authenticated. This ensures only signed-in users can call
them, and the membership check inside enforces restaurant-level authorization.

Also revoke EXECUTE on `get_next_order_number` from anon (internal helper, not
needed by customers). `create_order` and `generate_slug` remain callable by anon
(customers place orders and onboarding needs slug generation). `handle_new_user`
is a trigger — its EXECUTE grant doesn't matter since it's fired by the auth
system, not called via RPC.
*/

-- =============================================================
-- Fix 1a: Remove broken public SELECT policies on orders
-- =============================================================
DROP POLICY IF EXISTS "orders_public_select_by_token" ON orders;

-- =============================================================
-- Fix 1b: Remove broken public SELECT policy on order_items
-- =============================================================
DROP POLICY IF EXISTS "order_items_select" ON order_items;

-- Add member-scoped SELECT for order_items (was missing — staff need to read items)
-- This uses the same membership pattern as all other member-scoped policies.
CREATE POLICY "order_items_member_select" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN restaurant_members rm ON rm.restaurant_id = o.restaurant_id
      WHERE o.id = order_items.order_id AND rm.user_id = auth.uid()
    )
  );

-- =============================================================
-- Fix 1c: Create get_order_by_token function
-- Returns order + items only for the exact tracking token provided.
-- This is the sole public access path to order data.
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

  RETURN jsonb_build_object(
    'order', row_to_json(v_order),
    'items', v_items
  );
END;
$function$;

-- =============================================================
-- Fix 2a: Recreate update_order_status without p_user_id bypass
-- =============================================================
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_current_status text;
  v_restaurant_id uuid;
  v_is_member boolean;
  v_valid_transitions jsonb;
  v_allowed boolean;
BEGIN
  -- Fetch the order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  v_current_status := v_order.order_status;
  v_restaurant_id := v_order.restaurant_id;

  -- Verify caller is a member of the restaurant that owns this order.
  -- Uses auth.uid() exclusively — no override parameter.
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = v_restaurant_id
    AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Define permitted transitions
  v_valid_transitions := '{
    "pending": ["preparing", "rejected", "cancelled"],
    "preparing": ["ready", "cancelled"],
    "ready": ["completed", "cancelled"],
    "rejected": ["pending"],
    "completed": [],
    "cancelled": []
  }'::jsonb;

  -- Check if the transition is allowed
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      COALESCE(v_valid_transitions->v_current_status, '[]'::jsonb)
    ) AS target
    WHERE target = p_new_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'error', 'Invalid status transition',
      'current_status', v_current_status,
      'requested_status', p_new_status
    );
  END IF;

  -- Apply the transition
  UPDATE public.orders
  SET order_status = p_new_status
  WHERE id = p_order_id;

  -- If order is completed and payment was manual, mark payment as paid
  IF p_new_status = 'completed' AND v_order.payment_method IN ('pay_on_collection', 'pay_on_delivery') THEN
    UPDATE public.payments
    SET status = 'paid'
    WHERE order_id = p_order_id AND provider = 'manual' AND status = 'pending';
  END IF;

  -- Return updated order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order', row_to_json(v_order),
    'success', true
  );
END;
$function$;

-- =============================================================
-- Fix 2b: Recreate update_payment_status without p_user_id bypass
-- =============================================================
DROP FUNCTION IF EXISTS public.update_payment_status(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.update_payment_status(p_payment_id uuid, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_is_member boolean;
  v_valid_transitions jsonb;
  v_allowed boolean;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Payment not found');
  END IF;

  -- Verify membership using auth.uid() exclusively — no override parameter.
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_members
    WHERE restaurant_id = v_payment.restaurant_id
    AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Permitted transitions
  v_valid_transitions := '{
    "pending": ["paid", "failed"],
    "paid": ["refunded"],
    "failed": ["pending"],
    "refunded": []
  }'::jsonb;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      COALESCE(v_valid_transitions->v_payment.status, '[]'::jsonb)
    ) AS target
    WHERE target = p_new_status
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('error', 'Invalid payment status transition');
  END IF;

  UPDATE public.payments SET status = p_new_status WHERE id = p_payment_id;

  -- Also update the order's payment_status to match
  UPDATE public.orders SET payment_status = p_new_status WHERE id = v_payment.order_id;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;

  RETURN jsonb_build_object('payment', row_to_json(v_payment), 'success', true);
END;
$function$;

-- =============================================================
-- Fix 2c: Revoke EXECUTE on staff-only functions from anon
-- Postgres grants EXECUTE to PUBLIC by default on all functions.
-- anon and authenticated inherit from PUBLIC.
-- =============================================================

-- Staff-only functions: revoke from anon, keep for authenticated
REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_payment_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_order_number(uuid) FROM anon;

-- Explicitly grant to authenticated (they still need membership check inside)
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_payment_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO authenticated;

-- get_order_by_token: callable by anon (customers track orders without signing in)
-- No revocation needed — anon needs this. But be explicit:
GRANT EXECUTE ON FUNCTION public.get_order_by_token(uuid) TO anon, authenticated;

/*
# OrderPilot: RLS Policies Part 2

Policies for product_options, product_option_values, orders, order_items,
payments, and subscriptions.
*/

-- PRODUCT_OPTIONS
DROP POLICY IF EXISTS "options_public_select" ON product_options;
CREATE POLICY "options_public_select" ON product_options FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "options_member_select" ON product_options;
CREATE POLICY "options_member_select" ON product_options FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = product_options.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "options_member_insert" ON product_options;
CREATE POLICY "options_member_insert" ON product_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = product_options.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "options_member_update" ON product_options;
CREATE POLICY "options_member_update" ON product_options FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = product_options.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = product_options.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "options_member_delete" ON product_options;
CREATE POLICY "options_member_delete" ON product_options FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = product_options.restaurant_id AND rm.user_id = auth.uid())
  );

-- PRODUCT_OPTION_VALUES
DROP POLICY IF EXISTS "option_values_public_select" ON product_option_values;
CREATE POLICY "option_values_public_select" ON product_option_values FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "option_values_member_select" ON product_option_values;
CREATE POLICY "option_values_member_select" ON product_option_values FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM product_options po
      JOIN restaurant_members rm ON rm.restaurant_id = po.restaurant_id
      WHERE po.id = product_option_values.option_id AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "option_values_member_insert" ON product_option_values;
CREATE POLICY "option_values_member_insert" ON product_option_values FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_options po
      JOIN restaurant_members rm ON rm.restaurant_id = po.restaurant_id
      WHERE po.id = product_option_values.option_id AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "option_values_member_update" ON product_option_values;
CREATE POLICY "option_values_member_update" ON product_option_values FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM product_options po
      JOIN restaurant_members rm ON rm.restaurant_id = po.restaurant_id
      WHERE po.id = product_option_values.option_id AND rm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_options po
      JOIN restaurant_members rm ON rm.restaurant_id = po.restaurant_id
      WHERE po.id = product_option_values.option_id AND rm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "option_values_member_delete" ON product_option_values;
CREATE POLICY "option_values_member_delete" ON product_option_values FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM product_options po
      JOIN restaurant_members rm ON rm.restaurant_id = po.restaurant_id
      WHERE po.id = product_option_values.option_id AND rm.user_id = auth.uid()
    )
  );

-- ORDERS
DROP POLICY IF EXISTS "orders_public_insert" ON orders;
CREATE POLICY "orders_public_insert" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_member_select" ON orders;
CREATE POLICY "orders_member_select" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = orders.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_member_update" ON orders;
CREATE POLICY "orders_member_update" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = orders.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = orders.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_public_select_by_token" ON orders;
CREATE POLICY "orders_public_select_by_token" ON orders FOR SELECT
  TO anon, authenticated USING (tracking_token IS NOT NULL);

-- ORDER_ITEMS
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.tracking_token IS NOT NULL)
  );

-- PAYMENTS
DROP POLICY IF EXISTS "payments_member_select" ON payments;
CREATE POLICY "payments_member_select" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = payments.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_member_insert" ON payments;
CREATE POLICY "payments_member_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = payments.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payments_member_update" ON payments;
CREATE POLICY "payments_member_update" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = payments.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = payments.restaurant_id AND rm.user_id = auth.uid())
  );

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_member_select" ON subscriptions;
CREATE POLICY "subscriptions_member_select" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = subscriptions.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "subscriptions_member_update" ON subscriptions;
CREATE POLICY "subscriptions_member_update" ON subscriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = subscriptions.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = subscriptions.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "subscriptions_member_insert" ON subscriptions;
CREATE POLICY "subscriptions_member_insert" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = subscriptions.restaurant_id AND rm.user_id = auth.uid())
  );

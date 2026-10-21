/*
# OrderPilot: RLS Policies

Adds row-level security policies for all tables.
- Restaurant-scoped tables enforce membership checks via restaurant_members.
- Public menu tables allow public SELECT for active records.
- Orders: anon can insert, members can select/update, public can select by tracking token.
*/

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RESTAURANTS
DROP POLICY IF EXISTS "restaurants_public_select" ON restaurants;
CREATE POLICY "restaurants_public_select" ON restaurants FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "restaurants_member_select" ON restaurants;
CREATE POLICY "restaurants_member_select" ON restaurants FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurants.id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "restaurants_owner_insert" ON restaurants;
CREATE POLICY "restaurants_owner_insert" ON restaurants FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "restaurants_member_update" ON restaurants;
CREATE POLICY "restaurants_member_update" ON restaurants FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurants.id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurants.id AND rm.user_id = auth.uid())
  );

-- RESTAURANT_MEMBERS
DROP POLICY IF EXISTS "members_select_own_restaurant" ON restaurant_members;
CREATE POLICY "members_select_own_restaurant" ON restaurant_members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm2 WHERE rm2.restaurant_id = restaurant_members.restaurant_id AND rm2.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_owner_insert" ON restaurant_members;
CREATE POLICY "members_owner_insert" ON restaurant_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm2 WHERE rm2.restaurant_id = restaurant_members.restaurant_id AND rm2.user_id = auth.uid() AND rm2.role = 'owner')
  );

DROP POLICY IF EXISTS "members_owner_update" ON restaurant_members;
CREATE POLICY "members_owner_update" ON restaurant_members FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm2 WHERE rm2.restaurant_id = restaurant_members.restaurant_id AND rm2.user_id = auth.uid() AND rm2.role = 'owner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm2 WHERE rm2.restaurant_id = restaurant_members.restaurant_id AND rm2.user_id = auth.uid() AND rm2.role = 'owner')
  );

DROP POLICY IF EXISTS "members_owner_delete" ON restaurant_members;
CREATE POLICY "members_owner_delete" ON restaurant_members FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm2 WHERE rm2.restaurant_id = restaurant_members.restaurant_id AND rm2.user_id = auth.uid() AND rm2.role = 'owner')
  );

DROP POLICY IF EXISTS "members_self_insert" ON restaurant_members;
CREATE POLICY "members_self_insert" ON restaurant_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- RESTAURANT_SETTINGS
DROP POLICY IF EXISTS "settings_public_select" ON restaurant_settings;
CREATE POLICY "settings_public_select" ON restaurant_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_member_update" ON restaurant_settings;
CREATE POLICY "settings_member_update" ON restaurant_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_settings.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_settings.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "settings_member_insert" ON restaurant_settings;
CREATE POLICY "settings_member_insert" ON restaurant_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_settings.restaurant_id AND rm.user_id = auth.uid())
  );

-- RESTAURANT_TABLES
DROP POLICY IF EXISTS "tables_public_select" ON restaurant_tables;
CREATE POLICY "tables_public_select" ON restaurant_tables FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "tables_member_insert" ON restaurant_tables;
CREATE POLICY "tables_member_insert" ON restaurant_tables FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_tables.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tables_member_update" ON restaurant_tables;
CREATE POLICY "tables_member_update" ON restaurant_tables FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_tables.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_tables.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tables_member_delete" ON restaurant_tables;
CREATE POLICY "tables_member_delete" ON restaurant_tables FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = restaurant_tables.restaurant_id AND rm.user_id = auth.uid())
  );

-- CATEGORIES
DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "categories_member_insert" ON categories;
CREATE POLICY "categories_member_insert" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = categories.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "categories_member_update" ON categories;
CREATE POLICY "categories_member_update" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = categories.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = categories.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "categories_member_delete" ON categories;
CREATE POLICY "categories_member_delete" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = categories.restaurant_id AND rm.user_id = auth.uid())
  );

-- PRODUCTS
DROP POLICY IF EXISTS "products_public_select" ON products;
CREATE POLICY "products_public_select" ON products FOR SELECT
  TO anon, authenticated USING (is_available = true);

DROP POLICY IF EXISTS "products_member_select" ON products;
CREATE POLICY "products_member_select" ON products FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = products.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_member_insert" ON products;
CREATE POLICY "products_member_insert" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = products.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_member_update" ON products;
CREATE POLICY "products_member_update" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = products.restaurant_id AND rm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = products.restaurant_id AND rm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "products_member_delete" ON products;
CREATE POLICY "products_member_delete" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurant_members rm WHERE rm.restaurant_id = products.restaurant_id AND rm.user_id = auth.uid())
  );

export type RestaurantRole = 'owner' | 'manager' | 'kitchen' | 'counter';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'rejected' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'pay_on_collection' | 'pay_online';
export type OrderType = 'dine_in' | 'pickup' | 'delivery';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  is_platform_admin: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMember {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantRole;
  created_at: string;
}

export interface RestaurantSettings {
  id: string;
  restaurant_id: string;
  accept_orders: boolean;
  estimated_preparation_minutes: number;
  minimum_order_amount: number;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  dine_in_enabled: boolean;
  delivery_fee: number;
  notification_preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  preparation_time_minutes: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductOption {
  id: string;
  restaurant_id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  is_required: boolean;
  max_selections: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductOptionValue {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductWithOptions extends Product {
  category?: Category | null;
  product_options?: (ProductOption & { product_option_values?: ProductOptionValue[] })[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  selected_options: SelectedOption[];
  line_total: number;
  created_at: string;
}

export interface SelectedOption {
  option_name: string;
  value_name: string;
  price_adjustment: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_type: OrderType;
  table_number: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  customer_notes: string;
  tracking_token: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface Payment {
  id: string;
  restaurant_id: string;
  order_id: string;
  provider: string;
  provider_reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: string;
  status: 'active' | 'past_due' | 'cancelled' | 'suspended';
  provider_reference: string;
  current_period_end: string | null;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  selected_options: SelectedOption[];
  line_total: number;
  preparation_time_minutes: number;
}

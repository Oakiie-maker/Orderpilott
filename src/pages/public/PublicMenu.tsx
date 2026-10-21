import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, X, ArrowLeft, ArrowRight, Check, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, minutesToEta } from '@/lib/format';
import { Spinner } from '@/components/ui';
import type { Restaurant, Category, Product, RestaurantSettings, CartItem, OrderType, SelectedOption } from '@/types/database';

export default function PublicMenu() {
  const { slug, tableNumber } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true); setError('');
    try {
      const { data: rest, error: restErr } = await supabase.from('restaurants').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
      if (restErr) throw restErr;
      if (!rest) { setError('Restaurant not found'); return; }
      setRestaurant(rest as Restaurant);

      const [sRes, cRes, pRes] = await Promise.all([
        supabase.from('restaurant_settings').select('*').eq('restaurant_id', rest.id).maybeSingle(),
        supabase.from('categories').select('*').eq('restaurant_id', rest.id).eq('is_active', true).order('display_order'),
        supabase.from('products').select('*').eq('restaurant_id', rest.id).eq('is_available', true).order('display_order'),
      ]);
      if (sRes.error) throw sRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;
      setSettings(sRes.data as RestaurantSettings);
      setCategories((cRes.data ?? []) as Category[]);
      setProducts((pRes.data ?? []) as Product[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) return prev.map((c) => c.product_id === product.id ? { ...c, quantity: c.quantity + 1, line_total: (c.unit_price) * (c.quantity + 1) } : c);
      return [...prev, { product_id: product.id, product_name: product.name, unit_price: Number(product.price), quantity: 1, selected_options: [], line_total: Number(product.price), preparation_time_minutes: product.preparation_time_minutes }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product_id !== productId) return c;
      const qty = Math.max(0, c.quantity + delta);
      return { ...c, quantity: qty, line_total: c.unit_price * qty };
    }).filter((c) => c.quantity > 0));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((c) => c.product_id !== productId));

  const cartTotal = cart.reduce((s, c) => s + c.line_total, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const maxPrepTime = cart.length > 0 ? Math.max(...cart.map((c) => c.preparation_time_minutes)) : 0;

  const filteredProducts = activeCategory ? products.filter((p) => p.category_id === activeCategory) : products;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (error) return <div className="flex min-h-screen flex-col items-center justify-center gap-4"><AlertCircle className="h-10 w-10 text-error-500" /><p className="text-navy-600">{error}</p><button onClick={() => navigate('/')} className="btn-outline">Go Home</button></div>;
  if (!restaurant || !settings) return null;

  const canOrder = settings.accept_orders;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Restaurant header */}
      <div className="bg-navy-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-navy-300">
            <Clock className="h-4 w-4" />
            {canOrder ? `Estimated preparation: ${minutesToEta(settings.estimated_preparation_minutes)}` : 'Not accepting orders right now'}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{restaurant.name}</h1>
          {restaurant.address && <p className="mt-1 text-sm text-navy-300">{restaurant.address}</p>}
          {tableNumber && <p className="mt-2 inline-block rounded-lg bg-primary-500/20 px-3 py-1 text-sm font-medium text-primary-400">Table {tableNumber}</p>}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 py-3 scrollbar-hide">
            <button onClick={() => setActiveCategory(null)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!activeCategory ? 'bg-primary-500 text-white' : 'text-navy-600 hover:bg-navy-50'}`}>All</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === cat.id ? 'bg-primary-500 text-white' : 'text-navy-600 hover:bg-navy-50'}`}>{cat.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
        {products.length === 0 ? (
          <div className="py-16 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-navy-300" /><p className="mt-3 text-navy-500">No items available on the menu right now.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card flex gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-navy-300"><ShoppingBag className="h-6 w-6" /></div>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy-900">{product.name}</h3>
                    {product.description && <p className="mt-0.5 line-clamp-2 text-xs text-navy-500">{product.description}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold text-primary-600">{formatCurrency(Number(product.price), restaurant.currency)}</span>
                      {product.preparation_time_minutes > 0 && <span className="text-xs text-navy-400">{product.preparation_time_minutes}m</span>}
                    </div>
                  </div>
                  {canOrder && (
                    <button onClick={() => addToCart(product)} className="btn-primary btn-sm mt-2 self-start"><Plus className="h-3.5 w-3.5" /> Add</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {canOrder && cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white p-4 shadow-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 text-white"><span className="font-bold">{cartCount}</span></div>
              <div><div className="font-semibold text-navy-900">{formatCurrency(cartTotal, restaurant.currency)}</div><div className="text-xs text-navy-400">{cartCount} item{cartCount > 1 ? 's' : ''}</div></div>
            </div>
            <button onClick={() => setShowCheckout(true)} className="btn-primary">Checkout <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal restaurant={restaurant} settings={settings} cart={cart} cartTotal={cartTotal} maxPrepTime={maxPrepTime} tableNumber={tableNumber ?? ''} onClose={() => setShowCheckout(false)} onClearCart={() => setCart([])} />
      )}
    </div>
  );
}

function CheckoutModal({ restaurant, settings, cart, cartTotal, maxPrepTime, tableNumber, onClose, onClearCart }: {
  restaurant: Restaurant; settings: RestaurantSettings; cart: CartItem[]; cartTotal: number; maxPrepTime: number; tableNumber: string;
  onClose: () => void; onClearCart: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [orderType, setOrderType] = useState<OrderType>(tableNumber ? 'dine_in' : settings.pickup_enabled ? 'pickup' : 'dine_in');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState<{ orderNumber: number; trackingToken: string; total: number } | null>(null);

  const availableTypes: { value: OrderType; label: string }[] = [];
  if (settings.dine_in_enabled) availableTypes.push({ value: 'dine_in', label: 'Dine-in' });
  if (settings.pickup_enabled) availableTypes.push({ value: 'pickup', label: 'Collection' });
  if (settings.delivery_enabled) availableTypes.push({ value: 'delivery', label: 'Delivery' });

  const deliveryFee = orderType === 'delivery' ? Number(settings.delivery_fee) : 0;
  const finalTotal = cartTotal + deliveryFee;

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (orderType === 'dine_in' && !tableNumber && !name.trim()) { setError('Table number is required for dine-in'); return; }
    if (orderType === 'delivery' && !deliveryAddress.trim()) { setError('Delivery address is required'); return; }
    if (settings.minimum_order_amount > 0 && cartTotal < Number(settings.minimum_order_amount)) { setError(`Minimum order is ${formatCurrency(Number(settings.minimum_order_amount), restaurant.currency)}`); return; }

    setLoading(true);
    try {
      const items = cart.map((c) => ({
        product_id: c.product_id, quantity: c.quantity,
        selected_options: c.selected_options.map((o) => ({ option_id: '', value_id: '', ...o })),
      }));
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const { data, error: rpcError } = await supabase.rpc('create_order', {
        p_restaurant_slug: restaurant.slug,
        p_items: items,
        p_customer: { name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() },
        p_order_type: orderType,
        p_table_number: orderType === 'dine_in' ? tableNumber : '',
        p_delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : '',
        p_payment_method: 'pay_on_collection',
        p_idempotency_key: idempotencyKey,
      });

      if (rpcError) throw rpcError;
      const result = data as { error?: string; order_number?: number; tracking_token?: string; total?: number; idempotent_replay?: boolean };
      if (result?.error) throw new Error(result.error);

      setOrderResult({ orderNumber: result.order_number!, trackingToken: result.tracking_token!, total: Number(result.total) });
      setStep('success');
      onClearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl animate-slide-up">
        {step === 'success' && orderResult ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100"><Check className="h-8 w-8 text-success-600" /></div>
            <h3 className="mt-4 text-xl font-bold text-navy-900">Order Placed!</h3>
            <p className="mt-1 text-sm text-navy-500">Your order number is</p>
            <p className="text-3xl font-bold text-primary-600">#{String(orderResult.orderNumber).padStart(4, '0')}</p>
            <p className="mt-3 text-sm text-navy-600">Total: <span className="font-semibold">{formatCurrency(orderResult.total, restaurant.currency)}</span></p>
            <p className="mt-2 text-sm text-navy-500">Pay on {orderType === 'delivery' ? 'delivery' : 'collection'}. Estimated time: {minutesToEta(maxPrepTime || settings.estimated_preparation_minutes)}</p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => navigate(`/track/${orderResult.trackingToken}`)} className="btn-primary w-full">Track My Order <ArrowRight className="h-4 w-4" /></button>
              <button onClick={onClose} className="btn-outline w-full">Continue Browsing</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-navy-900">Checkout</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100"><X className="h-5 w-5" /></button>
            </div>

            {error && <div className="mt-3 flex items-start gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

            <div className="mt-4 space-y-4">
              {/* Order type */}
              <div>
                <label className="label">Order type</label>
                <div className="flex gap-2">
                  {availableTypes.map((t) => (
                    <button key={t.value} onClick={() => setOrderType(t.value)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${orderType === t.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-navy-200 text-navy-600 hover:bg-navy-50'}`}>{t.label}</button>
                  ))}
                </div>
              </div>

              {/* Customer info */}
              <div><label className="label">Your name *</label><input className="input" placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label">Phone</label><input className="input" placeholder="082 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><label className="label">Email (optional)</label><input className="input" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>

              {orderType === 'dine_in' && <div className="rounded-lg bg-primary-50 p-3 text-sm text-primary-700">Table: {tableNumber || 'Not specified'}</div>}
              {orderType === 'delivery' && <div><label className="label">Delivery address *</label><textarea className="input" rows={2} placeholder="123 Main Street, Suburb" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} /></div>}
              {orderType === 'pickup' && <div className="rounded-lg bg-navy-50 p-3 text-sm text-navy-600">Pick up from: {restaurant.address || restaurant.name}</div>}

              <div><label className="label">Order notes (optional)</label><textarea className="input" rows={2} placeholder="No onions, extra sauce, etc." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

              {/* Cart summary */}
              <div className="rounded-lg border border-navy-100 p-3">
                <h4 className="mb-2 text-sm font-semibold text-navy-700">Your order</h4>
                <div className="space-y-1.5">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <span><span className="text-primary-600">{item.quantity}x</span> {item.product_name}</span>
                      <span className="font-medium">{formatCurrency(item.line_total, restaurant.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 border-t border-navy-100 pt-3 text-sm">
                  <div className="flex justify-between text-navy-600"><span>Subtotal</span><span>{formatCurrency(cartTotal, restaurant.currency)}</span></div>
                  {deliveryFee > 0 && <div className="flex justify-between text-navy-600"><span>Delivery fee</span><span>{formatCurrency(deliveryFee, restaurant.currency)}</span></div>}
                  <div className="flex justify-between font-bold text-navy-900"><span>Total</span><span>{formatCurrency(finalTotal, restaurant.currency)}</span></div>
                </div>
              </div>

              <div className="rounded-lg bg-navy-50 p-3 text-xs text-navy-600">Payment: Pay on {orderType === 'delivery' ? 'delivery' : 'collection'}. You'll pay when you receive your order.</div>

              <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">{loading ? <Spinner /> : <>Place Order <ArrowRight className="h-4 w-4" /></>}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

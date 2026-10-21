import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, Filter, ChevronRight, MapPin, Phone, Clock, User, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { StatusBadge, PaymentBadge, EmptyState, ConfirmDialog, Spinner } from '@/components/ui';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/format';
import type { Order, OrderItem, OrderStatus } from '@/types/database';

const FILTERS = [
  { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' }, { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
];

const NEXT_ACTIONS: Record<string, { status: OrderStatus; label: string; danger?: boolean }[]> = {
  pending: [{ status: 'preparing', label: 'Accept & Start' }, { status: 'rejected', label: 'Reject', danger: true }],
  preparing: [{ status: 'ready', label: 'Mark Ready' }],
  ready: [{ status: 'completed', label: 'Complete' }],
  rejected: [{ status: 'pending', label: 'Re-accept' }],
  completed: [], cancelled: [],
};

export default function OrdersPage() {
  const { activeRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; newStatus: OrderStatus; label: string } | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.from('orders').select('*').eq('restaurant_id', activeRestaurant.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setOrders((data ?? []) as Order[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally { setLoading(false); }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeRestaurant) return;
    const channel = supabase.channel(`orders-list:${activeRestaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${activeRestaurant.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRestaurant, load]);

  const openOrder = async (order: Order) => {
    setSelected(order); setLoadingItems(true);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('created_at');
    setItems((data ?? []) as OrderItem[]); setLoadingItems(false);
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('update_order_status', { p_order_id: confirmAction.order.id, p_new_status: confirmAction.newStatus });
      if (error) throw error;
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);
      load();
      if (selected?.id === confirmAction.order.id) setSelected({ ...selected, order_status: confirmAction.newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setUpdating(false); setConfirmAction(null); }
  };

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.order_status === filter);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-navy-900">Orders</h1>

      <div className="flex items-center gap-2 overflow-x-auto">
        <Filter className="h-4 w-4 shrink-0 text-navy-400" />
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.value ? 'bg-primary-500 text-white' : 'border border-navy-200 bg-white text-navy-600 hover:bg-navy-50'}`}>
            {f.label}
            {f.value !== 'all' && <span className="ml-1.5 text-xs opacity-75">{orders.filter((o) => o.order_status === f.value).length}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-10 w-10" />} title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`} description={filter === 'all' ? 'Orders will appear here when customers place them.' : undefined} />
      ) : (
        <div className="card divide-y divide-navy-50 overflow-hidden">
          {filtered.map((order) => (
            <div key={order.id} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-navy-50/50" onClick={() => openOrder(order)}>
              <div className="shrink-0">
                <div className="text-lg font-bold text-navy-900">#{String(order.order_number).padStart(4, '0')}</div>
                <div className="text-xs text-navy-400">{timeAgo(order.created_at)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.order_status} />
                  <PaymentBadge status={order.payment_status} />
                  <span className="text-xs capitalize text-navy-400">{order.order_type.replace('_', ' ')}</span>
                  {order.table_number && <span className="text-xs text-navy-400">Table {order.table_number}</span>}
                </div>
                <div className="mt-1 truncate text-sm text-navy-600">{order.customer_name}</div>
              </div>
              <div className="shrink-0 text-right font-semibold text-navy-900">{formatCurrency(order.total, order.currency)}</div>
              <ChevronRight className="h-5 w-5 shrink-0 text-navy-300" />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-navy-950/40 animate-fade-in" onClick={() => setSelected(null)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-navy-900">Order #{String(selected.order_number).padStart(4, '0')}</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.order_status} /><PaymentBadge status={selected.payment_status} />
              <span className="text-xs text-navy-400">{formatDateTime(selected.created_at)}</span>
            </div>
            <div className="mt-4 grid gap-3 rounded-lg bg-navy-50 p-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-navy-400" /><span>{selected.customer_name}</span></div>
              {selected.customer_phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-navy-400" /><span>{selected.customer_phone}</span></div>}
              {selected.table_number && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-navy-400" /><span>Table {selected.table_number}</span></div>}
              {selected.delivery_address && <div className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 text-navy-400" /><span>{selected.delivery_address}</span></div>}
              <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-navy-400" /><span className="capitalize">{selected.order_type.replace('_', ' ')}</span></div>
            </div>
            {loadingItems ? <div className="flex justify-center py-6"><Spinner /></div> : (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-navy-700">Items</h4>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-lg border border-navy-100 p-3">
                      <div className="flex-1">
                        <div className="font-medium text-navy-900"><span className="text-primary-600">{item.quantity}x</span> {item.product_name_snapshot}</div>
                        {item.selected_options && item.selected_options.length > 0 && (
                          <div className="mt-1 pl-4 text-xs text-navy-500">
                            {item.selected_options.map((opt, i) => <div key={i}>{opt.option_name}: {opt.value_name}</div>)}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-navy-900">{formatCurrency(item.line_total, selected.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.customer_notes && (
              <div className="mt-4"><h4 className="mb-2 text-sm font-semibold text-navy-700">Customer notes</h4><div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700">{selected.customer_notes}</div></div>
            )}
            <div className="mt-4 space-y-1.5 border-t border-navy-100 pt-4">
              <div className="flex justify-between text-sm text-navy-600"><span>Subtotal</span><span>{formatCurrency(selected.subtotal, selected.currency)}</span></div>
              {Number(selected.delivery_fee) > 0 && <div className="flex justify-between text-sm text-navy-600"><span>Delivery fee</span><span>{formatCurrency(selected.delivery_fee, selected.currency)}</span></div>}
              <div className="flex justify-between text-base font-bold text-navy-900"><span>Total</span><span>{formatCurrency(selected.total, selected.currency)}</span></div>
            </div>
            {(NEXT_ACTIONS[selected.order_status] ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
                {NEXT_ACTIONS[selected.order_status].map((action) => (
                  <button key={action.status} className={action.danger ? 'btn-danger' : 'btn-primary'} disabled={updating} onClick={() => setConfirmAction({ order: selected, newStatus: action.status, label: action.label })}>{action.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmAction !== null} title={confirmAction?.label ?? 'Confirm'}
        message={confirmAction?.newStatus === 'rejected' ? 'Reject this order? The customer will see it as rejected. You can re-accept it later.' : confirmAction?.newStatus === 'preparing' ? 'Accept this order and start preparing it?' : `Change this order to "${confirmAction?.newStatus}"?`}
        confirmLabel={confirmAction?.label ?? 'Confirm'} danger={confirmAction?.newStatus === 'rejected'} onConfirm={handleStatusChange} onCancel={() => setConfirmAction(null)} />
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { ChefHat, Clock, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { PaymentBadge, EmptyState } from '@/components/ui';
import { formatTime, timeAgo } from '@/lib/format';
import type { Order, OrderItem, OrderStatus } from '@/types/database';

const COLUMNS: { status: OrderStatus; title: string; color: string }[] = [
  { status: 'pending', title: 'New', color: 'border-t-warning-500' },
  { status: 'preparing', title: 'Preparing', color: 'border-t-primary-500' },
  { status: 'ready', title: 'Ready', color: 'border-t-success-500' },
  { status: 'completed', title: 'Completed', color: 'border-t-navy-400' },
];

const ACTION_LABELS: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  pending: [{ status: 'preparing', label: 'Start Preparing' }],
  preparing: [{ status: 'ready', label: 'Mark Ready' }],
  ready: [{ status: 'completed', label: 'Complete' }],
  completed: [], rejected: [], cancelled: [],
};

export default function KitchenDisplay() {
  const { activeRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.from('orders').select('*')
        .eq('restaurant_id', activeRestaurant.id)
        .in('order_status', ['pending', 'preparing', 'ready', 'completed'])
        .order('created_at', { ascending: true }).limit(50);
      if (error) throw error;
      const orderList = (data ?? []) as Order[];
      setOrders(orderList);

      if (orderList.length > 0) {
        const { data: itemsData } = await supabase.from('order_items').select('*')
          .in('order_id', orderList.map((o) => o.id));
        const map: Record<string, OrderItem[]> = {};
        (itemsData ?? []).forEach((item) => {
          const typed = item as OrderItem;
          if (!map[typed.order_id]) map[typed.order_id] = [];
          map[typed.order_id].push(typed);
        });
        setItemsMap(map);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load kitchen orders');
    } finally { setLoading(false); }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeRestaurant) return;
    const channel = supabase.channel(`kitchen-rt:${activeRestaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${activeRestaurant.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRestaurant, load]);

  const advanceOrder = async (order: Order, newStatus: OrderStatus) => {
    setUpdating(order.id);
    try {
      const { data, error } = await supabase.rpc('update_order_status', { p_order_id: order.id, p_new_status: newStatus });
      if (error) throw error;
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setUpdating(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Kitchen Display</h1>
        <button onClick={load} className="btn-outline btn-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.order_status === col.status);
          return (
            <div key={col.status} className={`rounded-xl border border-t-4 ${col.color} border-navy-100 bg-navy-50/50`}>
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="font-semibold text-navy-900">{col.title}</h3>
                <span className="rounded-full bg-navy-200 px-2 py-0.5 text-xs font-semibold text-navy-700">{colOrders.length}</span>
              </div>
              <div className="space-y-3 px-3 pb-3">
                {colOrders.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-navy-200 py-8 text-center text-sm text-navy-400">No orders</div>
                ) : (
                  colOrders.map((order) => (
                    <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-navy-900">#{String(order.order_number).padStart(4, '0')}</div>
                          <div className="text-xs text-navy-400">{timeAgo(order.created_at)} • {formatTime(order.created_at)}</div>
                        </div>
                        <PaymentBadge status={order.payment_status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-navy-500">
                        <Clock className="h-3.5 w-3.5" /><span className="capitalize">{order.order_type.replace('_', ' ')}</span>
                        {order.table_number && <><MapPin className="h-3.5 w-3.5" />Table {order.table_number}</>}
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {(itemsMap[order.id] ?? []).map((item) => (
                          <div key={item.id} className="text-sm">
                            <div className="font-medium text-navy-900"><span className="text-primary-600">{item.quantity}x</span> {item.product_name_snapshot}</div>
                            {item.selected_options && item.selected_options.length > 0 && (
                              <div className="pl-4 text-xs text-navy-500">{item.selected_options.map((o) => o.value_name).join(', ')}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      {order.customer_notes && (
                        <div className="mt-2 rounded bg-warning-50 px-2 py-1 text-xs text-warning-700">Note: {order.customer_notes}</div>
                      )}
                      {ACTION_LABELS[order.order_status].length > 0 && (
                        <button onClick={() => advanceOrder(order, ACTION_LABELS[order.order_status][0].status)} disabled={updating === order.id}
                          className="btn-primary mt-3 w-full btn-sm">{updating === order.id ? '...' : ACTION_LABELS[order.order_status][0].label}</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

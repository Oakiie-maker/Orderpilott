import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Check, Clock, ChefHat, ShoppingBag, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge, PaymentBadge, Spinner } from '@/components/ui';
import { formatCurrency, formatDateTime, minutesToEta } from '@/lib/format';
import type { Order, OrderItem } from '@/types/database';

const STATUS_STEPS: { status: string; label: string; icon: typeof Check }[] = [
  { status: 'pending', label: 'Order received', icon: Clock },
  { status: 'preparing', label: 'Being prepared', icon: ChefHat },
  { status: 'ready', label: 'Ready', icon: ShoppingBag },
  { status: 'completed', label: 'Completed', icon: Check },
];

export default function OrderTracking() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_order_by_token', { p_tracking_token: token });
      if (rpcErr) throw rpcErr;
      const result = data as { error?: string; order?: Order; items?: OrderItem[] };
      if (result?.error) { setError(result.error); return; }
      if (!result?.order) { setError('Order not found'); return; }
      setOrder(result.order);
      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Poll for status updates every 10 seconds (realtime subscriptions require
  // RLS SELECT on the table, but public order access is now function-gated only)
  useEffect(() => {
    if (!order) return;
    const interval = setInterval(() => load(), 10000);
    return () => clearInterval(interval);
  }, [order, load]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <AlertCircle className="h-10 w-10 text-error-500" />
      <p className="text-navy-600">{error}</p>
      <Link to="/" className="btn-outline">Go Home</Link>
    </div>
  );
  if (!order) return null;

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.order_status);
  const isCancelled = order.order_status === 'cancelled' || order.order_status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-navy-950 text-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-navy-300 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Order #{String(order.order_number).padStart(4, '0')}</h1>
              <p className="mt-1 text-sm text-navy-300">{formatDateTime(order.created_at)}</p>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <StatusBadge status={order.order_status} />
              <PaymentBadge status={order.payment_status} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Status tracker */}
        <div className="card p-6">
          {isCancelled ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-100"><AlertCircle className="h-7 w-7 text-error-600" /></div>
              <h3 className="mt-3 text-lg font-semibold text-navy-900">{order.order_status === 'rejected' ? 'Order Rejected' : 'Order Cancelled'}</h3>
              <p className="mt-1 text-sm text-navy-500">Please contact the restaurant for more information.</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-navy-900">Order Progress</h3>
              <div className="mt-5 space-y-1">
                {STATUS_STEPS.map((step, i) => {
                  const isDone = i < currentStepIndex;
                  const isCurrent = i === currentStepIndex;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${isDone ? 'bg-success-500 text-white' : isCurrent ? 'bg-primary-500 text-white' : 'bg-navy-100 text-navy-400'}`}>
                          {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                        </div>
                        {i < STATUS_STEPS.length - 1 && <div className={`h-8 w-0.5 ${isDone ? 'bg-success-500' : 'bg-navy-200'}`} />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isCurrent ? 'text-primary-600' : isDone ? 'text-navy-900' : 'text-navy-400'}`}>{step.label}</div>
                        {isCurrent && <div className="text-xs text-navy-500">Estimated time: {minutesToEta(order.order_status === 'completed' ? 0 : 15)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Order details */}
        <div className="card p-6">
          <h3 className="font-semibold text-navy-900">Order Details</h3>
          <div className="mt-3 flex items-center gap-2 text-sm text-navy-500">
            <Clock className="h-4 w-4" /><span className="capitalize">{order.order_type.replace('_', ' ')}</span>
            {order.table_number && <span>• Table {order.table_number}</span>}
          </div>
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between border-b border-navy-50 pb-2">
                <div className="flex-1">
                  <div className="font-medium text-navy-900"><span className="text-primary-600">{item.quantity}x</span> {item.product_name_snapshot}</div>
                  {item.selected_options && item.selected_options.length > 0 && (
                    <div className="mt-0.5 pl-4 text-xs text-navy-500">{item.selected_options.map((o) => `${o.option_name}: ${o.value_name}`).join(', ')}</div>
                  )}
                </div>
                <div className="font-medium text-navy-900">{formatCurrency(item.line_total, order.currency)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-navy-100 pt-3">
            <div className="flex justify-between text-sm text-navy-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal, order.currency)}</span></div>
            {Number(order.delivery_fee) > 0 && <div className="flex justify-between text-sm text-navy-600"><span>Delivery fee</span><span>{formatCurrency(order.delivery_fee, order.currency)}</span></div>}
            <div className="flex justify-between font-bold text-navy-900"><span>Total</span><span>{formatCurrency(order.total, order.currency)}</span></div>
          </div>
        </div>

        {order.customer_notes && (
          <div className="card p-4"><h4 className="text-sm font-semibold text-navy-700">Your notes</h4><p className="mt-1 text-sm text-navy-600">{order.customer_notes}</p></div>
        )}
      </div>
    </div>
  );
}

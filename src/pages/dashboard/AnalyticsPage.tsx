import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import type { Order } from '@/types/database';

const COLORS = ['#f97316', '#102a43', '#22c55e', '#f59e0b', '#dc2626', '#829ab1'];

interface TopProduct { name: string; qty: number; revenue: number; }

export default function AnalyticsPage() {
  const { activeRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  });

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const startDate = new Date(dateRange.start + 'T00:00:00');
      const endDate = new Date(dateRange.end + 'T23:59:59');
      const { data, error } = await supabase.from('orders').select('*')
        .eq('restaurant_id', activeRestaurant.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });
      if (error) throw error;
      const orderList = (data ?? []) as Order[];
      setOrders(orderList);

      // Fetch order items for top products
      if (orderList.length > 0) {
        const { data: itemsData } = await supabase.from('order_items')
          .select('product_name_snapshot, quantity, line_total')
          .in('order_id', orderList.map((o) => o.id));
        const productMap: Record<string, TopProduct> = {};
        (itemsData ?? []).forEach((item) => {
          const name = item.product_name_snapshot;
          if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
          productMap[name].qty += item.quantity;
          productMap[name].revenue += Number(item.line_total);
        });
        setTopProducts(Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5));
      } else {
        setTopProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally { setLoading(false); }
  }, [activeRestaurant, dateRange]);

  useEffect(() => { load(); }, [load]);

  const totalOrders = orders.length;
  const grossValue = orders.reduce((s, o) => s + Number(o.total), 0);
  const confirmedPayments = orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total), 0);
  const cancelled = orders.filter((o) => o.order_status === 'cancelled' || o.order_status === 'rejected').length;
  const avgOrder = totalOrders > 0 ? grossValue / totalOrders : 0;

  const statusData = ['pending', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1), value: orders.filter((o) => o.order_status === status).length,
  })).filter((d) => d.value > 0);

  const orderTypeData = ['dine_in', 'pickup', 'delivery'].map((type) => ({
    name: type === 'dine_in' ? 'Dine-in' : type === 'pickup' ? 'Collection' : 'Delivery',
    value: orders.filter((o) => o.order_type === type).length,
  })).filter((d) => d.value > 0);

  const dailyMap: Record<string, { date: string; orders: number; revenue: number }> = {};
  orders.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, revenue: 0 };
    dailyMap[day].orders += 1;
    if (o.payment_status === 'paid') dailyMap[day].revenue += Number(o.total);
  });
  const trendData = Object.values(dailyMap);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Analytics</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-navy-400" />
          <input type="date" className="input max-w-[150px]" value={dateRange.start} onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))} />
          <span className="text-navy-400">to</span>
          <input type="date" className="input max-w-[150px]" value={dateRange.end} onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))} />
        </div>
      </div>

      {totalOrders === 0 ? (
        <EmptyState icon={<BarChart3 className="h-10 w-10" />} title="No orders in this period" description="Try adjusting your date range, or wait for your first orders to come in." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={ShoppingBag} label="Total orders" value={totalOrders.toString()} />
            <StatCard icon={DollarSign} label="Gross order value" value={formatCurrency(grossValue, activeRestaurant?.currency)} />
            <StatCard icon={TrendingUp} label="Confirmed payments" value={formatCurrency(confirmedPayments, activeRestaurant?.currency)} />
            <StatCard icon={BarChart3} label="Average order value" value={formatCurrency(avgOrder, activeRestaurant?.currency)} />
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-semibold text-navy-900">Revenue & Orders Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Confirmed revenue" />
                <Line type="monotone" dataKey="orders" stroke="#102a43" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-navy-900">Orders by Status</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-12 text-center text-sm text-navy-400">No data</p>}
            </div>
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-navy-900">Sales by Order Type</h3>
              {orderTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={orderTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-12 text-center text-sm text-navy-400">No data</p>}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="mb-4 font-semibold text-navy-900">Best-Selling Products</h3>
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-4 rounded-lg border border-navy-100 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600">{i + 1}</span>
                    <div className="flex-1"><div className="font-medium text-navy-900">{p.name}</div><div className="text-xs text-navy-400">{p.qty} sold</div></div>
                    <div className="font-semibold text-navy-900">{formatCurrency(p.revenue, activeRestaurant?.currency)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-sm text-navy-400">No product data</p>}
          </div>

          <div className="card p-4">
            <p className="text-xs text-navy-400">
              <strong>Gross order value</strong> includes all orders regardless of payment status.
              <strong> Confirmed payments</strong> includes only orders with paid status.
              Cancelled, rejected, and unpaid orders are excluded from confirmed revenue.
              {cancelled > 0 && ` ${cancelled} cancelled/rejected orders in this period.`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof ShoppingBag; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 text-navy-700"><Icon className="h-5 w-5" /></div>
      <div className="text-xl font-bold text-navy-900">{value}</div>
      <div className="mt-0.5 text-sm text-navy-500">{label}</div>
    </div>
  );
}

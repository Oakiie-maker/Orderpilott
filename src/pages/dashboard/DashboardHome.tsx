import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Clock, ChefHat, CheckCircle, TrendingUp,
  UtensilsCrossed, QrCode, BarChart3, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, formatTime, timeAgo } from '@/lib/format';
import type { Order } from '@/types/database';

interface Stats {
  ordersToday: number;
  pending: number;
  preparing: number;
  ready: number;
  completed: number;
  revenueToday: number;
  avgOrderValue: number;
}

export default function DashboardHome() {
  const { activeRestaurant } = useRestaurant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [todayRes, allRes, recentRes] = await Promise.all([
        supabase.from('orders').select('total, order_status, payment_status')
          .eq('restaurant_id', activeRestaurant.id).gte('created_at', todayStart.toISOString()),
        supabase.from('orders').select('order_status').eq('restaurant_id', activeRestaurant.id),
        supabase.from('orders').select('*').eq('restaurant_id', activeRestaurant.id)
          .order('created_at', { ascending: false }).limit(5),
      ]);

      if (todayRes.error) throw todayRes.error;
      if (allRes.error) throw allRes.error;
      if (recentRes.error) throw recentRes.error;

      const todayOrders = todayRes.data ?? [];
      const allOrders = allRes.data ?? [];
      const revenueToday = todayOrders
        .filter((o) => o.payment_status === 'paid' && !['cancelled', 'rejected'].includes(o.order_status))
        .reduce((sum, o) => sum + Number(o.total), 0);
      const paidToday = todayOrders.filter((o) => o.payment_status === 'paid').length;

      setStats({
        ordersToday: todayOrders.length,
        pending: allOrders.filter((o) => o.order_status === 'pending').length,
        preparing: allOrders.filter((o) => o.order_status === 'preparing').length,
        ready: allOrders.filter((o) => o.order_status === 'ready').length,
        completed: todayOrders.filter((o) => o.order_status === 'completed').length,
        revenueToday,
        avgOrderValue: paidToday > 0 ? revenueToday / paidToday : 0,
      });
      setRecentOrders((recentRes.data ?? []) as Order[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeRestaurant) return;
    const channel = supabase.channel(`orders-rt:${activeRestaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${activeRestaurant.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRestaurant, load]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Orders today" value={stats?.ordersToday ?? 0} color="primary" />
        <StatCard icon={Clock} label="Pending" value={stats?.pending ?? 0} color="warning" />
        <StatCard icon={ChefHat} label="Preparing" value={stats?.preparing ?? 0} color="navy" />
        <StatCard icon={CheckCircle} label="Completed" value={stats?.completed ?? 0} color="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success-500" />
            <span className="text-sm text-navy-500">Confirmed revenue today</span>
          </div>
          <div className="text-3xl font-bold text-navy-900">{formatCurrency(stats?.revenueToday ?? 0, activeRestaurant?.currency)}</div>
          <p className="mt-2 text-xs text-navy-400">Only includes orders with confirmed payment. Pending and unpaid orders are excluded.</p>
        </div>
        <div className="card p-6">
          <div className="mb-1 text-sm text-navy-500">Average order value</div>
          <div className="text-3xl font-bold text-navy-900">{formatCurrency(stats?.avgOrderValue ?? 0, activeRestaurant?.currency)}</div>
          <p className="mt-2 text-xs text-navy-400">Based on paid orders today</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-700">Quick links</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <QuickLink to="/dashboard/menu" icon={UtensilsCrossed} label="Manage Menu" />
          <QuickLink to="/dashboard/qr-codes" icon={QrCode} label="QR Codes" />
          <QuickLink to="/dashboard/kitchen" icon={ChefHat} label="Kitchen Display" />
          <QuickLink to="/dashboard/analytics" icon={BarChart3} label="View Reports" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 className="font-semibold text-navy-900">Recent orders</h2>
          <Link to="/dashboard/orders" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="h-10 w-10" />} title="No orders yet"
            description="When customers place orders, they'll appear here. Share your QR code to start receiving orders."
            action={<Link to="/dashboard/qr-codes" className="btn-primary btn-sm">Get Your QR Code</Link>} />
        ) : (
          <div className="divide-y divide-navy-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-navy-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy-900">#{String(order.order_number).padStart(4, '0')}</span>
                    <StatusBadge status={order.order_status} />
                  </div>
                  <div className="mt-0.5 text-sm text-navy-500">{order.customer_name} • {formatTime(order.created_at)} • {timeAgo(order.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-navy-900">{formatCurrency(order.total, order.currency)}</div>
                  <div className="text-xs capitalize text-navy-400">{order.order_type.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof ShoppingBag; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600', warning: 'bg-warning-100 text-warning-600',
    navy: 'bg-navy-100 text-navy-700', success: 'bg-success-100 text-success-700',
  };
  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-navy-900">{value}</div>
      <div className="mt-0.5 text-sm text-navy-500">{label}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof UtensilsCrossed; label: string }) {
  return (
    <Link to={to} className="card-hover flex items-center gap-3 p-5 group">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100 text-navy-700 transition-colors group-hover:bg-primary-500 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-navy-900">{label}</span>
    </Link>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/context/RestaurantContext';
import { Spinner } from '@/components/ui';
import type { RestaurantSettings } from '@/types/database';

export default function SettingsPage() {
  const { activeRestaurant, role } = useRestaurant();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [restData, setRestData] = useState({ name: '', address: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const canEdit = role === 'owner' || role === 'manager';

  const load = useCallback(async () => {
    if (!activeRestaurant) return;
    setLoading(true); setError('');
    try {
      const [sRes, rRes] = await Promise.all([
        supabase.from('restaurant_settings').select('*').eq('restaurant_id', activeRestaurant.id).maybeSingle(),
        supabase.from('restaurants').select('name, address, phone, email').eq('id', activeRestaurant.id).maybeSingle(),
      ]);
      if (sRes.error) throw sRes.error;
      if (rRes.error) throw rRes.error;
      setSettings(sRes.data as RestaurantSettings);
      if (rRes.data) setRestData(rRes.data as typeof restData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally { setLoading(false); }
  }, [activeRestaurant]);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof RestaurantSettings, value: boolean | number) => setSettings((p) => p ? { ...p, [key]: value } : null);

  const handleSave = async () => {
    if (!activeRestaurant || !settings) return;
    setSaving(true); setSaved(false);
    try {
      const { error: sErr } = await supabase.from('restaurant_settings').update({
        accept_orders: settings.accept_orders, estimated_preparation_minutes: settings.estimated_preparation_minutes,
        minimum_order_amount: settings.minimum_order_amount, delivery_enabled: settings.delivery_enabled,
        pickup_enabled: settings.pickup_enabled, dine_in_enabled: settings.dine_in_enabled, delivery_fee: settings.delivery_fee,
      }).eq('restaurant_id', activeRestaurant.id);
      if (sErr) throw sErr;
      const { error: rErr } = await supabase.from('restaurants').update(restData).eq('id', activeRestaurant.id);
      if (rErr) throw rErr;
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
  if (error) return <div className="rounded-lg bg-error-50 p-4 text-sm text-error-700">{error}</div>;
  if (!settings) return null;

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-navy-900">Settings</h1>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Restaurant Information</h2>
        <div className="space-y-4">
          <div><label className="label">Restaurant name</label><input className="input" disabled={!canEdit} value={restData.name} onChange={(e) => setRestData((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="label">Address</label><textarea className="input" rows={2} disabled={!canEdit} value={restData.address} onChange={(e) => setRestData((p) => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Phone</label><input className="input" disabled={!canEdit} value={restData.phone} onChange={(e) => setRestData((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div><label className="label">Email</label><input className="input" type="email" disabled={!canEdit} value={restData.email} onChange={(e) => setRestData((p) => ({ ...p, email: e.target.value }))} /></div>
          </div>
        </div>
      </div>

      {canEdit && (
        <>
          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Ordering</h2>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-navy-200 p-3 hover:bg-navy-50">
                <div><div className="text-sm font-medium text-navy-900">Accept orders</div><div className="text-xs text-navy-500">When off, customers see a "not accepting" message</div></div>
                <input type="checkbox" className="h-5 w-5 accent-primary-500" checked={settings.accept_orders} onChange={(e) => update('accept_orders', e.target.checked)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label">Estimated prep time (min)</label><input className="input" type="number" min="1" value={settings.estimated_preparation_minutes} onChange={(e) => update('estimated_preparation_minutes', parseInt(e.target.value) || 20)} /></div>
                <div><label className="label">Minimum order amount</label><input className="input" type="number" step="0.01" min="0" value={settings.minimum_order_amount} onChange={(e) => update('minimum_order_amount', parseFloat(e.target.value) || 0)} /></div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Order Types</h2>
            <div className="space-y-3">
              {[
                { key: 'dine_in_enabled', label: 'Dine-in', desc: 'Customers order at their table via QR' },
                { key: 'pickup_enabled', label: 'Collection', desc: 'Customers order ahead and pick up' },
                { key: 'delivery_enabled', label: 'Delivery', desc: 'You deliver to customer addresses' },
              ].map((opt) => (
                <label key={opt.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-navy-200 p-3 hover:bg-navy-50">
                  <div><div className="text-sm font-medium text-navy-900">{opt.label}</div><div className="text-xs text-navy-500">{opt.desc}</div></div>
                  <input type="checkbox" className="h-5 w-5 accent-primary-500" checked={settings[opt.key as keyof RestaurantSettings] as boolean} onChange={(e) => update(opt.key as keyof RestaurantSettings, e.target.checked)} />
                </label>
              ))}
              {settings.delivery_enabled && (
                <div><label className="label">Delivery fee</label><input className="input" type="number" step="0.01" min="0" value={settings.delivery_fee} onChange={(e) => update('delivery_fee', parseFloat(e.target.value) || 0)} /></div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning-500" />
              <div><h2 className="text-sm font-semibold text-navy-900">Payment methods</h2><p className="mt-1 text-sm text-navy-600">Currently supporting pay-on-collection and pay-on-delivery. Online payment integration (PayFast) is designed but not yet activated — it will be available when payment credentials are configured.</p></div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-sm text-success-600">Settings saved</span>}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? <Spinner /> : <><Save className="h-4 w-4" /> Save Settings</>}</button>
          </div>
        </>
      )}
    </div>
  );
}

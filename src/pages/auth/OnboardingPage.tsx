import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, AlertCircle, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const RESTAURANT_TYPES = [
  'Restaurant', 'Café', 'Coffee Shop', 'Takeaway', 'Fast Food',
  'Food Truck', 'Pub & Grill', 'Bakery', 'Pizzeria', 'Other',
];

const CURRENCIES = [
  { code: 'ZAR', label: 'South African Rand (R)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
];

const TIMEZONES = [
  'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Nairobi',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'Asia/Dubai',
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', type: 'Restaurant', address: '', phone: '', email: '',
    currency: 'ZAR', timezone: 'Africa/Johannesburg',
    dine_in: true, pickup: true, delivery: false,
  });

  const update = (key: string, value: string | boolean) => setForm((p) => ({ ...p, [key]: value }));

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Restaurant name is required'); return; }
    setError(''); setStep(2);
  };

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setLoading(true); setError('');

    try {
      const { data: slugData, error: slugError } = await supabase.rpc('generate_slug', { p_name: form.name });
      if (slugError) throw slugError;
      const slug = slugData as string;

      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .insert({
          name: form.name.trim(), slug, owner_id: user.id,
          address: form.address, phone: form.phone, email: form.email,
          currency: form.currency, timezone: form.timezone, is_active: true,
        })
        .select().single();
      if (restError) throw restError;

      const { error: settingsError } = await supabase.from('restaurant_settings').insert({
        restaurant_id: restaurant.id, accept_orders: true,
        dine_in_enabled: form.dine_in, pickup_enabled: form.pickup, delivery_enabled: form.delivery,
      });
      if (settingsError) throw settingsError;

      const { error: memberError } = await supabase.from('restaurant_members').insert({
        restaurant_id: restaurant.id, user_id: user.id, role: 'owner',
      });
      if (memberError) throw memberError;

      await supabase.from('subscriptions').insert({ restaurant_id: restaurant.id, plan: 'free', status: 'active' });

      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-navy-600">Please sign in to continue</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">Set up your restaurant</h1>
              <p className="text-sm text-navy-500">Step {step} of 2 — takes about a minute</p>
            </div>
          </div>

          <div className="mb-8 flex gap-2">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-navy-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-navy-200'}`} />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4 animate-fade-in">
              <div>
                <label className="label">Restaurant name *</label>
                <input className="input" placeholder="The Corner Cafe" value={form.name} onChange={(e) => update('name', e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Restaurant type</label>
                <select className="input" value={form.type} onChange={(e) => update('type', e.target.value)}>
                  {RESTAURANT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} placeholder="123 Main Street, Cape Town" value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Contact phone</label>
                  <input className="input" placeholder="082 123 4567" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label">Contact email</label>
                  <input className="input" type="email" placeholder="orders@cafe.co.za" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">Continue <ArrowRight className="h-4 w-4" /></button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleComplete} className="space-y-5 animate-fade-in">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={form.currency} onChange={(e) => update('currency', e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Time zone</label>
                  <select className="input" value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
                    {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Order types to accept</label>
                <p className="mb-3 text-xs text-navy-400">You can change these later in settings</p>
                <div className="space-y-2">
                  {[
                    { key: 'dine_in', label: 'Dine-in', desc: 'Customers order at their table via QR code' },
                    { key: 'pickup', label: 'Collection', desc: 'Customers order ahead and collect from you' },
                    { key: 'delivery', label: 'Delivery', desc: 'You deliver orders to customer addresses' },
                  ].map((opt) => (
                    <label key={opt.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${form[opt.key as keyof typeof form] ? 'border-primary-500 bg-primary-50' : 'border-navy-200 hover:bg-navy-50'}`}>
                      <input type="checkbox" className="mt-1 accent-primary-500" checked={form[opt.key as keyof typeof form] as boolean} onChange={(e) => update(opt.key, e.target.checked)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-navy-900">{opt.label}</div>
                        <div className="text-xs text-navy-500">{opt.desc}</div>
                      </div>
                      {form[opt.key as keyof typeof form] && <Check className="h-4 w-4 text-primary-500" />}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-outline flex-1" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Spinner /> : <>Create Restaurant <Check className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { type ReactNode, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, QrCode, ShoppingBag, ChefHat,
  BarChart3, Settings, LogOut, Menu, X, ChevronDown, Store,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { Logo } from '@/components/Logo';
import type { RestaurantRole } from '@/types/database';

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; roles?: RestaurantRole[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/menu', label: 'Menu', icon: UtensilsCrossed, roles: ['owner', 'manager'] },
  { to: '/dashboard/qr-codes', label: 'QR Codes', icon: QrCode, roles: ['owner', 'manager'] },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/dashboard/kitchen', label: 'Kitchen', icon: ChefHat },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['owner', 'manager'] },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['owner', 'manager'] },
];

export default function DashboardLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { restaurants, activeRestaurant, role, loading: restLoading, setActiveRestaurant } = useRestaurant();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [restaurantMenuOpen, setRestaurantMenuOpen] = useState(false);

  if (authLoading || restLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-200 border-t-primary-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!activeRestaurant) return <Navigate to="/onboarding" replace />;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role ?? 'kitchen'));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-navy-100 bg-white md:flex">
        <div className="border-b border-navy-100 p-4"><Link to="/"><Logo size="sm" /></Link></div>
        <div className="relative border-b border-navy-100 p-3">
          <button onClick={() => setRestaurantMenuOpen(!restaurantMenuOpen)} className="flex w-full items-center justify-between rounded-lg p-2.5 hover:bg-navy-50">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Store className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium text-navy-900">{activeRestaurant.name}</span>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-navy-400 transition-transform ${restaurantMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {restaurantMenuOpen && restaurants.length > 1 && (
            <div className="absolute left-3 right-3 top-full z-10 mt-1 rounded-xl border border-navy-100 bg-white p-1 shadow-lg animate-fade-in">
              {restaurants.map((r) => (
                <button key={r.id} onClick={() => { setActiveRestaurant(r); setRestaurantMenuOpen(false); }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${r.id === activeRestaurant.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-navy-700 hover:bg-navy-50'}`}>
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'}`}>
              <item.icon className="h-5 w-5" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-navy-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-200 text-xs font-semibold text-navy-700">
              {(user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-navy-900">{user.email}</div>
              <div className="text-xs capitalize text-navy-400">{role}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 hover:bg-error-50 hover:text-error-700">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-navy-100 bg-white md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/"><Logo size="sm" showText={false} /></Link>
          <span className="ml-2 truncate text-sm font-semibold text-navy-900">{activeRestaurant.name}</span>
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-navy-100">
            <Menu className="h-5 w-5 text-navy-700" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-navy-950/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-navy-100 p-4">
              <Logo size="sm" />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 hover:bg-navy-100">
                <X className="h-5 w-5 text-navy-700" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {visibleItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-navy-600 hover:bg-navy-50'}`}>
                  <item.icon className="h-5 w-5" /> {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-navy-100 p-3">
              <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-600 hover:bg-error-50 hover:text-error-700">
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 pt-16 md:ml-64 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

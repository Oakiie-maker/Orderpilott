import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RestaurantProvider } from '@/context/RestaurantContext';
import { Spinner } from '@/components/ui';
import type { ReactNode } from 'react';

// Public pages
import PublicHome from '@/pages/public/PublicHome';
import PublicMenu from '@/pages/public/PublicMenu';
import OrderTracking from '@/pages/public/OrderTracking';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OnboardingPage from '@/pages/auth/OnboardingPage';

// Dashboard pages
import DashboardLayout from '@/pages/dashboard/DashboardLayout';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import MenuManagement from '@/pages/dashboard/MenuManagement';
import OrdersPage from '@/pages/dashboard/OrdersPage';
import KitchenDisplay from '@/pages/dashboard/KitchenDisplay';
import QRCodesPage from '@/pages/dashboard/QRCodesPage';
import AnalyticsPage from '@/pages/dashboard/AnalyticsPage';
import SettingsPage from '@/pages/dashboard/SettingsPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function DashboardRoutes() {
  return (
    <ProtectedRoute>
      <RestaurantProvider>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="kitchen" element={<KitchenDisplay />} />
            <Route path="qr-codes" element={<QRCodesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
      </RestaurantProvider>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/menu/:slug" element={<PublicMenu />} />
      <Route path="/menu/:slug/table/:tableNumber" element={<PublicMenu />} />
      <Route path="/track/:token" element={<OrderTracking />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard/*" element={<DashboardRoutes />} />
      <Route path="/onboarding" element={<DashboardRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

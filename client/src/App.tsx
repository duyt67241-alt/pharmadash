import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './context/AuthContext';
import type { Role } from './api/types';
import { EmptyState } from './components/ui/Misc';
import { Skeleton } from './components/ui/Skeleton';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Tách code theo trang để tải nhanh lần đầu
const Orders = lazy(() => import('./pages/Orders'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Customers = lazy(() => import('./pages/Customers'));
const Staff = lazy(() => import('./pages/Staff'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));

/** Chặn truy cập trang theo vai trò (server cũng kiểm tra lại). */
function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="p-6">
        <div className="card">
          <EmptyState title="Không có quyền truy cập" hint={<>Chức năng này dành cho Chủ nhà thuốc và Quản lý. <Link className="text-primary" to="/">Về trang tổng quan</Link></>} />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const PageFallback = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-[420px] w-full" />
  </div>
);

const MGMT: Role[] = ['owner', 'manager'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="*" element={
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="orders" element={<Orders />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="purchases" element={<RoleGuard roles={MGMT}><Purchases /></RoleGuard>} />
              <Route path="staff" element={<RoleGuard roles={MGMT}><Staff /></RoleGuard>} />
              <Route path="reports" element={<RoleGuard roles={MGMT}><Reports /></RoleGuard>} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
              <Route path="*" element={<div className="p-6"><div className="card"><EmptyState title="Không tìm thấy trang" hint={<Link className="text-primary" to="/">Về trang tổng quan</Link>} /></div></div>} />
            </Routes>
          </Suspense>
        } />
      </Route>
    </Routes>
  );
}

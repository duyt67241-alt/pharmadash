import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Logo } from './Sidebar';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * Khung ứng dụng sau đăng nhập.
 * Responsive: >= 1280px sidebar đầy đủ (thu gọn được) · 768–1279px tự thu thành icon · < 768px ẩn, mở bằng nút menu.
 */
export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isDesktop = useMedia('(min-width: 1280px)');
  const isMobile = !useMedia('(min-width: 768px)');
  const [userCollapsed, setUserCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pd_sidebar') === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Logo className="h-10 w-10 animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const collapsed = !isMobile && (isDesktop ? userCollapsed : true);
  const toggle = () => {
    setUserCollapsed((c) => {
      try {
        localStorage.setItem('pd_sidebar', c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar cố định (tablet/desktop) */}
      {!isMobile && (
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 border-r border-line bg-surface transition-[width] duration-200',
            collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
          )}
        >
          <Sidebar collapsed={collapsed} onToggle={toggle} canToggle={isDesktop} />
        </aside>
      )}
      {/* Sidebar dạng ngăn kéo (mobile) */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-sidebar animate-fade-in border-r border-line bg-surface" onClick={(e) => e.stopPropagation()}>
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} canToggle={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', !isMobile && (collapsed ? 'pl-sidebar-collapsed' : 'pl-sidebar'))}>
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1600px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

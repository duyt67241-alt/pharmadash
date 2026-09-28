/**
 * Trạng thái đăng nhập + chi nhánh đang xem.
 * Chủ nhà thuốc có thể chọn "Tất cả chi nhánh" hoặc 1 chi nhánh;
 * Quản lý / Nhân viên luôn cố định chi nhánh của mình (server cũng kiểm soát).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  branchId: number | null;
  setBranchId: (id: number | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const [branchId, setBranchIdState] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem('pd_branch')) || null;
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    api
      .get<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    tokenStore.set(r.token);
    qc.clear();
    setUser(r.user);
  }, [qc]);

  const setBranchId = useCallback((id: number | null) => {
    setBranchIdState(id);
    try {
      localStorage.setItem('pd_branch', id ? String(id) : '');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      // Chỉ chủ nhà thuốc mới đổi được chi nhánh
      branchId: user?.role === 'owner' ? branchId : user?.branch_id ?? null,
      setBranchId,
      login,
      logout,
    }),
    [user, loading, branchId, setBranchId, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return v;
}

/** Kiểm tra quyền theo vai trò. */
export function useCan() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    viewProfit: role === 'owner' || role === 'manager',
    viewCost: role === 'owner' || role === 'manager',
    manageInventory: role === 'owner' || role === 'manager',
    managePurchases: role === 'owner' || role === 'manager',
    viewStaff: role === 'owner' || role === 'manager',
    viewReports: role === 'owner' || role === 'manager',
    switchBranch: role === 'owner',
  };
}

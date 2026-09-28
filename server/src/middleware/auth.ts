import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'owner' | 'manager' | 'staff';
export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  branch_id: number | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const JWT_SECRET = process.env.JWT_SECRET ?? 'pharmadash-dev-secret';

export function signToken(u: AuthUser) {
  return jwt.sign(u, JWT_SECRET, { expiresIn: '7d' });
}

/** Yêu cầu có JWT hợp lệ (header Authorization: Bearer <token>, hoặc ?token= khi tải file). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = {
      id: payload.id, full_name: payload.full_name, email: payload.email,
      role: payload.role, branch_id: payload.branch_id,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }
}

/** Chỉ cho phép các vai trò được liệt kê. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập chức năng này' });
    }
    next();
  };
}

/**
 * Phạm vi dữ liệu người dùng được xem:
 *  - Chủ: mọi chi nhánh, có thể lọc bằng ?branch=<id>
 *  - Quản lý: cố định chi nhánh của mình
 *  - Nhân viên: chi nhánh của mình; `staffId` dùng để giới hạn đơn hàng/doanh số của chính họ
 */
export function scopeOf(req: Request) {
  const u = req.user!;
  if (u.role === 'owner') {
    const b = Number(req.query.branch);
    return { branchId: Number.isFinite(b) && b > 0 ? b : null, staffId: null as number | null };
  }
  return { branchId: u.branch_id, staffId: u.role === 'staff' ? u.id : null };
}

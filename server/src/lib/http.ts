import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Middleware xử lý lỗi tập trung: trả JSON { error } thống nhất. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.flatten().fieldErrors });
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('UNIQUE constraint failed')) return res.status(409).json({ error: 'Dữ liệu bị trùng (mã hoặc số điện thoại đã tồn tại)' });
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
}

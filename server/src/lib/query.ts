import type { SQLInputValue } from 'node:sqlite';
import { HttpError } from './http';

/** Trình ghép mệnh đề WHERE với tham số vị trí (?). */
export class Where {
  parts: string[] = [];
  params: SQLInputValue[] = [];

  add(sql: string, ...values: SQLInputValue[]) {
    this.parts.push(sql);
    this.params.push(...values);
    return this;
  }

  /** Chỉ thêm điều kiện khi giá trị có nghĩa (khác null/undefined/''). */
  addIf(value: unknown, sql: string, ...values: SQLInputValue[]) {
    if (value !== undefined && value !== null && value !== '') this.add(sql, ...values);
    return this;
  }

  get sql() {
    return this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : '';
  }

  /** Dùng khi đã có WHERE sẵn trong câu SQL. */
  get and() {
    return this.parts.length ? `AND ${this.parts.join(' AND ')}` : '';
  }
}

/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm không phân biệt dấu. */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function pageParams(q: Record<string, unknown>, defSize = 20) {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || defSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function intParam(v: unknown, name = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Tham số ${name} không hợp lệ`);
  return n;
}

/** Validate chuỗi ngày YYYY-MM-DD, trả về undefined nếu rỗng. */
export function dateParam(v: unknown) {
  if (v === undefined || v === '') return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, 'Ngày không hợp lệ (YYYY-MM-DD)');
  return v;
}

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? join(here, '../../data/pharmacy.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export type Params = Record<string, SQLInputValue> | SQLInputValue[];

/** Chạy file schema.sql (idempotent nhờ CREATE ... IF NOT EXISTS). */
export function migrate() {
  db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));
}

// Cache prepared statement theo câu SQL để không phải prepare lại mỗi request
const cache = new Map<string, ReturnType<DatabaseSync['prepare']>>();
function stmt(sql: string) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

function bind(params?: Params): SQLInputValue[] {
  if (params === undefined) return [];
  return Array.isArray(params) ? params : [params as unknown as SQLInputValue];
}

export function all<T = Record<string, unknown>>(sql: string, params?: Params): T[] {
  return stmt(sql).all(...(bind(params) as never[])) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, params?: Params): T | undefined {
  return stmt(sql).get(...(bind(params) as never[])) as T | undefined;
}

export function run(sql: string, params?: Params) {
  return stmt(sql).run(...(bind(params) as never[]));
}

/** Bọc một hàm trong transaction; rollback nếu có lỗi. */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

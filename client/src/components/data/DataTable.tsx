import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { num } from '../../lib/format';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/Misc';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  className?: string;
  /** Ẩn cột trên màn hình nhỏ */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface SortState {
  sort: string;
  dir: 'asc' | 'desc';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;       // tải lần đầu -> skeleton
  fetching?: boolean;      // tải lại -> làm mờ, giữ khung
  sort?: SortState;
  onSort?: (s: SortState) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPage?: (p: number) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  dense?: boolean;
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };

/** Bảng dữ liệu dùng chung: sắp xếp, phân trang, skeleton, click hàng. */
export function DataTable<T>({
  columns, rows, rowKey, loading, fetching, sort, onSort, page = 1, pageSize = 20, total, onPage, onRowClick, empty, dense,
}: Props<T>) {
  const pages = total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  const toggleSort = (key: string) => {
    if (!onSort) return;
    onSort({ sort: key, dir: sort?.sort === key && sort.dir === 'desc' ? 'asc' : 'desc' });
  };

  return (
    <div>
      <div className="scroll-thin overflow-x-auto">
        <table className={cn('w-full border-collapse text-[13px] transition-opacity', fetching && !loading && 'opacity-60')}>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-3', alignCls(c.align), c.hideBelow && HIDE[c.hideBelow], c.className)}
                  aria-sort={sort?.sort === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortable && onSort ? (
                    <button onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-ink', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {sort?.sort === c.key ? (
                        sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3', c.hideBelow && HIDE[c.hideBelow])}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows?.map((r) => (
                  <tr
                    key={rowKey(r)}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      'border-b border-line transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2',
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn('px-4 text-ink', dense ? 'py-2' : 'py-3', alignCls(c.align), c.hideBelow && HIDE[c.hideBelow], c.className)}
                      >
                        {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && rows?.length === 0 && (empty ?? <EmptyState hint="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" />)}
      </div>

      {onPage && total !== undefined && total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-3">
          <span className="num">
            {num((page - 1) * pageSize + 1)}–{num(Math.min(page * pageSize, total))} / {num(total)} dòng
          </span>
          <div className="flex items-center gap-1">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:bg-muted disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="num px-2 font-medium text-ink">
              {page} / {pages}
            </span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:bg-muted disabled:opacity-40"
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

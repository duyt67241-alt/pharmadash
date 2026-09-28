import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, Check, ChevronDown } from 'lucide-react';
import { addDays, dateVN, isoDate } from '../../lib/format';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';

export interface DateRange {
  from: string;
  to: string;
  preset: string;
}

const today = () => new Date();
export const DATE_PRESETS: { key: string; label: string; range: () => { from: string; to: string } }[] = [
  { key: 'today', label: 'Hôm nay', range: () => ({ from: isoDate(today()), to: isoDate(today()) }) },
  { key: 'yesterday', label: 'Hôm qua', range: () => ({ from: isoDate(addDays(today(), -1)), to: isoDate(addDays(today(), -1)) }) },
  { key: '7d', label: '7 ngày qua', range: () => ({ from: isoDate(addDays(today(), -6)), to: isoDate(today()) }) },
  { key: '30d', label: '30 ngày qua', range: () => ({ from: isoDate(addDays(today(), -29)), to: isoDate(today()) }) },
  { key: 'month', label: 'Tháng này', range: () => ({ from: isoDate(new Date(today().getFullYear(), today().getMonth(), 1)), to: isoDate(today()) }) },
  { key: '90d', label: '90 ngày qua', range: () => ({ from: isoDate(addDays(today(), -89)), to: isoDate(today()) }) },
  { key: 'all', label: 'Tất cả', range: () => ({ from: '', to: '' }) },
];

export function presetRange(key: string): DateRange {
  const p = DATE_PRESETS.find((x) => x.key === key) ?? DATE_PRESETS[2];
  return { ...p.range(), preset: p.key };
}

/**
 * Bộ chọn khoảng ngày: danh sách preset (dấu ✓ đậm cho mục chọn),
 * khoảng tùy chọn ở chân menu.
 */
export function DateRangeFilter({ value, onChange, allowAll = true }: { value: DateRange; onChange: (r: DateRange) => void; allowAll?: boolean }) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const label =
    value.preset === 'custom'
      ? `${dateVN(value.from)} – ${dateVN(value.to)}`
      : DATE_PRESETS.find((p) => p.key === value.preset)?.label ?? 'Chọn ngày';

  return (
    <Dropdown
      align="left"
      width="w-64"
      trigger={({ toggle, open }) => (
        <Button onClick={toggle} aria-expanded={open} icon={<CalendarRange className="h-4 w-4 text-ink-3" />}>
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
        </Button>
      )}
    >
      {(close) => (
        <>
          {DATE_PRESETS.filter((p) => allowAll || p.key !== 'all').map((p) => (
            <button
              key={p.key}
              onClick={() => { onChange(presetRange(p.key)); close(); }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-muted"
            >
              {p.label}
              {value.preset === p.key && <Check className="h-4 w-4 text-primary" strokeWidth={3} />}
            </button>
          ))}
          <div className="mt-1 border-t border-line px-2.5 pb-1.5 pt-2.5">
            <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-3">Tùy chọn</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input h-8 px-2 text-xs" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="Từ ngày" />
              <input type="date" className="input h-8 px-2 text-xs" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Đến ngày" />
            </div>
            <Button
              size="sm"
              variant="soft"
              className="mt-2 w-full justify-center"
              disabled={!from || !to || from > to}
              onClick={() => { onChange({ from, to, preset: 'custom' }); close(); }}
            >
              Áp dụng
            </Button>
          </div>
        </>
      )}
    </Dropdown>
  );
}

/** Đọc/ghi 1 tham số trên URL (?id=, ?tab=) để link chia sẻ được đúng trạng thái. */
export function useUrlParam(key: string, fallback = '') {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? fallback;
  const set = (v: string | null) => {
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v === null || v === '' || v === fallback) n.delete(key);
        else n.set(key, v);
        return n;
      },
      { replace: true },
    );
  };
  return [value, set] as const;
}

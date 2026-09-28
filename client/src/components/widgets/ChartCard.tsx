import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Dropdown, MenuItem } from '../ui/Dropdown';

export interface CardAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

/**
 * Khung card dùng cho mọi widget: tiêu đề, menu ba chấm (⋮), nội dung,
 * link "Xem thêm" ở chân card.
 */
export function ChartCard({
  title, subtitle, actions, menu, moreLink, moreLabel = 'Xem thêm', children, className, bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  menu?: CardAction[];
  moreLink?: string;
  moreLabel?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('card flex min-w-0 flex-col', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {subtitle && <div className="mt-1">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {menu && menu.length > 0 && (
            <Dropdown
              width="w-48"
              trigger={({ toggle, open }) => (
                <button
                  onClick={toggle}
                  aria-label="Tùy chọn"
                  aria-expanded={open}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:bg-muted hover:text-ink"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              )}
            >
              {(close) =>
                menu.map((m) => (
                  <MenuItem key={m.label} icon={m.icon} onClick={() => { close(); m.onClick(); }}>
                    {m.label}
                  </MenuItem>
                ))
              }
            </Dropdown>
          )}
        </div>
      </header>
      <div className={cn('flex-1 px-5 pb-4 pt-3', bodyClassName)}>{children}</div>
      {moreLink && (
        <footer className="flex justify-center border-t border-line px-5 py-2.5">
          <Link to={moreLink} className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-primary">
            {moreLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </footer>
      )}
    </section>
  );
}

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-primary hover:bg-primary-hover active:translate-y-px',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-muted hover:text-ink',
  soft: 'bg-primary-soft text-primary-ink hover:bg-primary/15',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-[13px] gap-2',
  icon: 'h-9 w-9 justify-center',
  'icon-sm': 'h-7 w-7 justify-center',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', icon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center rounded-ctl font-medium transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

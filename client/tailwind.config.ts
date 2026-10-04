import type { Config } from 'tailwindcss';

/**
 * DESIGN TOKENS
 * Màu được khai báo bằng biến CSS (src/index.css) dạng "R G B" để:
 *  - đổi theme sáng/tối chỉ bằng cách đổi biến (class .dark trên <html>)
 *  - vẫn dùng được opacity của Tailwind: bg-primary/10, text-ink/60...
 * Muốn đổi màu thương hiệu: chỉ sửa --primary* trong index.css.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2') },
        muted: token('muted'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          soft: token('primary-soft'),
          ink: token('primary-ink'),
        },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
        // Thang tím 4 bậc cho biểu đồ (đã kiểm tra độ tương phản sáng/tối)
        chart: {
          1: token('chart-1'),
          2: token('chart-2'),
          3: token('chart-3'),
          4: token('chart-4'),
          bar: token('chart-bar'),
          cap: token('chart-cap'),
          grid: token('chart-grid'),
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      borderRadius: {
        card: '14px',
        ctl: '10px',
      },
      spacing: {
        sidebar: '256px',
        'sidebar-collapsed': '76px',
        gutter: '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 16 40 / 0.04), 0 1px 1px rgb(16 16 40 / 0.02)',
        pop: '0 12px 32px -8px rgb(16 16 40 / 0.18), 0 2px 6px rgb(16 16 40 / 0.06)',
        primary: '0 1px 2px rgb(109 74 255 / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.15)',
      },
      transitionDuration: { DEFAULT: '180ms' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        // Card trượt lên + hiện dần khi vào trang
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        // Thanh tiến độ chạy dài ra từ trái sang
        'grow-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        rise: 'rise 520ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'grow-x': 'grow-x 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        shimmer: 'shimmer 1.4s infinite',
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;

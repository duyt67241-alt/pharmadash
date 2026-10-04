import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Số "chạy" từ giá trị cũ tới giá trị mới (lần đầu chạy từ 0).
 * Khi dữ liệu tự làm mới, số chuyển mượt sang giá trị mới thay vì nhảy cóc.
 * Người dùng bật "giảm chuyển động" trong hệ điều hành thì hiện ngay giá trị cuối.
 */
export function CountUp({ value, format, duration = 1000 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const fromRef = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic: nhanh lúc đầu, chậm dần về cuối
      const v = from + (value - from) * eased;
      setShown(v);
      fromRef.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(shown)}</>;
}

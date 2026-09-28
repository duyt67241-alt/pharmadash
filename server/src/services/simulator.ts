/**
 * Chế độ demo: tự sinh đơn hàng mới theo chu kỳ để dashboard "nhảy số"
 * khi thuyết trình. Bật/tắt qua API /api/demo.
 */
import { createRng } from '../lib/rng';
import { OrderGenerator, loadContext, recomputeCustomerStats } from '../db/seed/orderGen';
import { transaction } from '../db/connection';

let timer: NodeJS.Timeout | null = null;
let generated = 0;
const INTERVAL_MS = Number(process.env.DEMO_INTERVAL_MS ?? 15000);

export function simulatorStatus() {
  return { enabled: timer !== null, intervalMs: INTERVAL_MS, generated };
}

export function startSimulator() {
  if (timer) return;
  const rng = createRng(Date.now() & 0xffffffff);
  const gen = new OrderGenerator(rng, loadContext(), true);
  timer = setInterval(() => {
    // Mỗi chu kỳ sinh 1-2 đơn ở chi nhánh ngẫu nhiên
    transaction(() => {
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i++) gen.createOrder(rng.pick([1, 2]), new Date());
      generated += n;
    });
    recomputeCustomerStats();
  }, INTERVAL_MS);
  console.log(`▶ Chế độ demo: sinh đơn mới mỗi ${INTERVAL_MS / 1000}s`);
}

export function stopSimulator() {
  if (timer) clearInterval(timer);
  timer = null;
  console.log('■ Đã tắt chế độ demo');
}

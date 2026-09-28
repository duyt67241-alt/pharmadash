/**
 * Điểm khởi động API server.
 *  - Tự tạo schema + seed nếu CSDL trống, ngược lại bù dữ liệu đến hiện tại
 *  - Các route /api/* (trừ /api/auth/login) yêu cầu JWT
 *  - Nếu đã build client (client/dist) thì phục vụ luôn file tĩnh
 */
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { get, migrate } from './db/connection';
import { backfill, seed } from './db/seed';
import { requireAuth, requireRole } from './middleware/auth';
import { errorHandler } from './lib/http';
import authRoutes from './routes/auth';
import metaRoutes from './routes/meta';
import dashboardRoutes from './routes/dashboard';
import medicineRoutes from './routes/medicines';
import orderRoutes from './routes/orders';
import purchaseRoutes from './routes/purchases';
import staffRoutes from './routes/staff';
import reportRoutes from './routes/reports';
import { simulatorStatus, startSimulator, stopSimulator } from './services/simulator';

const PORT = Number(process.env.PORT ?? 4000);

// ---------- Chuẩn bị CSDL ----------
migrate();
const hasData = get<{ n: number }>('SELECT COUNT(*) n FROM users')!.n > 0;
if (!hasData) {
  console.log('CSDL trống -> đang tạo dữ liệu mẫu...');
  seed();
} else {
  backfill();
}

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '3mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);

const api = express.Router();
api.use(requireAuth);
api.use('/meta', metaRoutes);
api.use('/dashboard', dashboardRoutes);
api.use(medicineRoutes);
api.use(orderRoutes);
api.use(purchaseRoutes);
api.use(staffRoutes);
api.use(reportRoutes);

// Bật/tắt chế độ demo
api.get('/demo', (_req, res) => res.json(simulatorStatus()));
api.post('/demo', requireRole('owner', 'manager'), (req, res) => {
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
  if (enabled) startSimulator();
  else stopSimulator();
  res.json(simulatorStatus());
});

app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API không tồn tại' }));

// Phục vụ client đã build (chế độ production)
const dist = join(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✔ API server: http://localhost:${PORT}/api`);
  if (process.env.DEMO_MODE === '1') startSimulator();
});

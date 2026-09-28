import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { get } from '../db/connection';
import { requireAuth, signToken, type AuthUser } from '../middleware/auth';
import { HttpError } from '../lib/http';

const router = Router();

const LoginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', (req, res) => {
  const { email, password } = LoginBody.parse(req.body);
  const row = get<AuthUser & { password_hash: string }>(
    'SELECT id, full_name, email, role, branch_id, password_hash FROM users WHERE email = ?',
    [email.toLowerCase()],
  );
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
  }
  const user: AuthUser = { id: row.id, full_name: row.full_name, email: row.email, role: row.role, branch_id: row.branch_id };
  res.json({ token: signToken(user), user: withBranch(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: withBranch(req.user!) });
});

function withBranch(u: AuthUser) {
  const branch = u.branch_id ? get<{ name: string }>('SELECT name FROM branches WHERE id = ?', [u.branch_id]) : undefined;
  return { ...u, branch_name: branch?.name ?? null };
}

export default router;

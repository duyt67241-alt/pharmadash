import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Store, UserRound } from 'lucide-react';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/layout/Sidebar';
import { cn } from '../lib/cn';

/** Tài khoản demo để bấm điền nhanh khi thuyết trình. */
const DEMO = [
  { email: 'chu@huuduyen.vn', role: 'Chủ nhà thuốc', desc: 'Xem tất cả chi nhánh, lợi nhuận, báo cáo', icon: ShieldCheck },
  { email: 'quanly@huuduyen.vn', role: 'Quản lý', desc: 'CN Cầu Giấy: kho, nhập hàng, nhân viên', icon: Store },
  { email: 'nhanvien@huuduyen.vn', role: 'Nhân viên bán hàng', desc: 'Chỉ xem doanh số của mình, không thấy giá nhập', icon: UserRound },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('chu@huuduyen.vn');
  const [password, setPassword] = useState('123456');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      nav((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <div className="text-base font-semibold text-ink">Nhà thuốc Hữu Duyên</div>
              <div className="text-xs text-ink-3">PharmaDash · Hệ thống điều hành</div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Đăng nhập</h1>
          <p className="mt-1 text-[13px] text-ink-3">Theo dõi hoạt động kinh doanh nhà thuốc theo thời gian thực.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input className="input h-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            </label>
            <label className="block">
              <span className="label">Mật khẩu</span>
              <div className="relative">
                <input className="input h-10 pr-10" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {error && <div className="rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{error}</div>}
            <Button type="submit" variant="primary" className="h-10 w-full justify-center" loading={busy}>
              Đăng nhập
            </Button>
          </form>

          <div className="mt-8">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">Tài khoản demo · mật khẩu 123456</div>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword('123456'); }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-ctl border bg-surface px-3 py-2.5 text-left transition-colors hover:border-primary/40',
                    email === d.email ? 'border-primary/60 ring-2 ring-primary/10' : 'border-line',
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                    <d.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{d.role}</span>
                    <span className="block truncate text-2xs text-ink-3">{d.email} · {d.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Minh họa bên phải (ẩn trên màn nhỏ) */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-10 grid max-w-md grid-cols-2 gap-3">
            {[
              ['Doanh thu hôm nay', '24,6 tr', '+8,2%'],
              ['Đơn hàng', '96', '+4,1%'],
              ['Lô sắp hết hạn', '13', '30 ngày'],
              ['Khách quay lại', '80,7%', '+2,7%'],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-card bg-white/10 p-4 backdrop-blur">
                <div className="text-xs text-white/70">{l}</div>
                <div className="mt-1 text-2xl font-semibold">{v}</div>
                <div className="text-2xs text-white/70">{c}</div>
              </div>
            ))}
          </div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">Mọi chỉ số nhà thuốc, trên một màn hình.</h2>
          <p className="mt-3 max-w-md text-sm text-white/75">Doanh thu, tồn kho theo lô, hạn dùng, nhập hàng và hiệu quả nhân viên - cập nhật liên tục.</p>
        </div>
      </div>
    </div>
  );
}

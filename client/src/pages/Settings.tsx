import { useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Radio, RotateCcw, Sun } from 'lucide-react';
import { api } from '../api/client';
import { useGet } from '../api/hooks';
import { useAuth, useCan } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABEL } from '../lib/format';
import { cn } from '../lib/cn';
import { Button } from '../components/ui/Button';
import { Avatar, PageHeader } from '../components/ui/Misc';
import { useToast } from '../components/ui/Toast';

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 last:border-0">
      <div className="max-w-md">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className="text-xs text-ink-3">{desc}</div>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const can = useCan();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: demo } = useGet<{ enabled: boolean; intervalMs: number; generated: number }>('/demo');

  const toggleDemo = async () => {
    await api.post('/demo', { enabled: !demo?.enabled });
    qc.invalidateQueries({ queryKey: ['/demo'] });
    toast(demo?.enabled ? 'Đã tắt chế độ demo' : 'Đã bật chế độ demo', 'info');
  };

  return (
    <div className="max-w-3xl p-4 md:p-6">
      <PageHeader title="Cài đặt" description="Tùy chọn giao diện và chế độ trình diễn" />
      <div className="card mb-5 flex items-center gap-4 p-5">
        <Avatar name={user!.full_name} size="lg" />
        <div>
          <div className="text-[15px] font-semibold text-ink">{user!.full_name}</div>
          <div className="text-xs text-ink-3">{user!.email} · {ROLE_LABEL[user!.role]}{user!.branch_name ? ` · ${user!.branch_name}` : ''}</div>
        </div>
      </div>
      <div className="card">
        <Row title="Giao diện" desc="Chế độ sáng / tối. Lựa chọn được lưu trên trình duyệt.">
          <div className="inline-flex gap-1 rounded-ctl bg-muted p-1">
            {([['light', 'Sáng', Sun], ['dark', 'Tối', Moon]] as const).map(([v, l, I]) => (
              <button key={v} onClick={() => setTheme(v)} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium', theme === v ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink')}>
                <I className="h-3.5 w-3.5" /> {l}
              </button>
            ))}
            <button
              onClick={() => { try { localStorage.removeItem('theme'); } catch { /* ignore */ } setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-3 hover:text-ink"
            >
              <Monitor className="h-3.5 w-3.5" /> Theo hệ thống
            </button>
          </div>
        </Row>
        <Row title="Bố cục trang Tổng quan" desc="Hiện lại tất cả widget đã ẩn bằng “Tùy chỉnh widget”.">
          <Button size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => { try { localStorage.removeItem('pd_hidden_widgets'); } catch { /* ignore */ } toast('Đã khôi phục bố cục mặc định'); }}>
            Khôi phục
          </Button>
        </Row>
        {can.viewReports && (
          <Row title="Chế độ demo (mô phỏng realtime)" desc={`Server tự sinh 1–2 đơn hàng mới mỗi ${(demo?.intervalMs ?? 15000) / 1000} giây để dashboard cập nhật trực tiếp khi thuyết trình.${demo?.generated ? ` Đã sinh ${demo.generated} đơn.` : ''}`}>
            <Button size="sm" variant={demo?.enabled ? 'danger' : 'primary'} icon={<Radio className="h-3.5 w-3.5" />} onClick={toggleDemo}>
              {demo?.enabled ? 'Tắt demo' : 'Bật demo'}
            </Button>
          </Row>
        )}
      </div>
    </div>
  );
}

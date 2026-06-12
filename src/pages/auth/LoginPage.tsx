import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const DEMO_ACCOUNTS = [
  { label: 'เจ้าของร้าน (Owner)', email: 'owner@demo.com', password: 'demo1234' },
  { label: 'ผู้จัดการ (Admin)', email: 'manager@demo.com', password: 'demo1234' },
  { label: 'พนักงาน (Employee)', email: 'piya@demo.com', password: 'demo1234' },
  { label: 'พนักงานพาร์ทไทม์', email: 'arun@demo.com', password: 'demo1234' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await login(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${email.split('@')[0]}`);
      if (session.role === 'employee') navigate('/employee', { replace: true });
      else navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[number]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-100 via-bg to-skyblue-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-mint-200 to-skyblue-200 flex items-center justify-center text-white font-bold text-2xl shadow-pastel">T</div>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Mini TimePay</h1>
            <p className="text-sm text-ink-muted mt-1">เช็คอิน & คำนวณเงินเดือน สำหรับธุรกิจเล็ก</p>
          </div>

          <form onSubmit={handleSubmit} className="pastel-card p-6 space-y-4">
            <div>
              <label className="label-base" htmlFor="email">อีเมล</label>
              <input
                id="email"
                type="email"
                className="input-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label-base" htmlFor="password">รหัสผ่าน</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="input-base pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-ink-muted hover:bg-bg flex items-center justify-center" aria-label={showPwd ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-xl bg-softred-50 text-softred-400 text-sm p-3 border border-softred-200">{error}</div>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-5 pastel-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-mint-600" />
              <span className="text-sm font-semibold text-ink">บัญชีตัวอย่าง (คลิกเพื่อกรอก)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => fillDemo(a)}
                  className="text-left text-xs rounded-xl border border-border bg-bg p-2.5 hover:bg-mint-50 transition-colors"
                >
                  <div className="font-medium text-ink">{a.label}</div>
                  <div className="text-ink-muted mt-0.5">{a.email}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-muted mt-2">รหัสผ่านทุกบัญชี: <span className="font-mono">demo1234</span></p>
          </div>
        </div>
      </div>
      <footer className="text-center text-xs text-ink-muted pb-4">
        © {new Date().getFullYear()} Mini TimePay — สำหรับธุรกิจขนาดเล็ก 5–20 คน
      </footer>
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  History as ClockHistory,
  CalendarDays,
  FileText,
  LogOut,
  Settings,
  Users,
  ClipboardCheck,
  BarChart3,
  Wallet,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TabItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EMPLOYEE_TABS: TabItem[] = [
  { to: '/employee', label: 'หน้าแรก', icon: Home },
  { to: '/employee/history', label: 'ประวัติ', icon: ClockHistory },
  { to: '/employee/leave', label: 'ลางาน', icon: CalendarDays },
  { to: '/employee/payslip', label: 'สลิป', icon: FileText },
];

const ADMIN_TABS: TabItem[] = [
  { to: '/admin', label: 'แดชบอร์ด', icon: Home },
  { to: '/admin/employees', label: 'พนักงาน', icon: Users },
  { to: '/admin/attendance', label: 'เวลาเข้างาน', icon: ClipboardCheck },
  { to: '/admin/payroll', label: 'เงินเดือน', icon: Wallet },
  { to: '/admin/settings', label: 'ตั้งค่า', icon: Settings },
];

/**
 * Mobile bottom navigation. Hidden on md+ where the desktop sidebar is used.
 * It is the ONLY primary nav shown on phones.
 */
export function BottomTabBar() {
  const { isAdmin } = useAuth();
  const items = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;
  const location = useLocation();
  return (
    <nav
      aria-label="primary-mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-2 pb-safe"
    >
      <div className="bg-white/95 backdrop-blur border border-border rounded-3xl shadow-card px-2 py-2 flex items-center justify-between mb-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = location.pathname === it.to;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl transition-colors min-w-0',
                active ? 'text-mint-600' : 'text-ink-muted hover:text-ink',
              )}
            >
              <div
                className={cn(
                  'h-9 px-3 rounded-2xl flex items-center justify-center',
                  active && 'bg-mint-100',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  active ? 'text-mint-600' : 'text-ink-muted',
                )}
              >
                {it.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Desktop sidebar. Visible from md (≥768px) upward.
 * - md: width 52 (208px)  — comfortable on tablets
 * - lg: width 60 (240px)  — slightly wider on laptops
 *
 * It is the ONLY primary nav shown on tablets and up. The mobile top brand
 * bar and the bottom tab bar are both hidden at this breakpoint.
 */
export function DesktopSidebar() {
  const { isAdmin, profile, logout } = useAuth();
  const items = isAdmin ? ADMIN_TABS : EMPLOYEE_TABS;
  return (
    <aside
      aria-label="primary-desktop"
      className="hidden md:flex fixed top-0 bottom-0 left-0 w-52 lg:w-60 flex-col bg-white border-r border-border p-4 z-30"
    >
      <div className="flex items-center gap-2 mb-6 px-1">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-mint-200 to-skyblue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
          T
        </div>
        <div className="min-w-0">
          <div className="font-display font-semibold text-ink leading-tight truncate">
            Mini TimePay
          </div>
          <div className="text-[11px] text-ink-muted truncate">เช็คอิน & เงินเดือน</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin -mx-1 px-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/admin' || it.to === '/employee'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-mint-100 text-mint-600'
                    : 'text-ink-muted hover:bg-bg hover:text-ink',
                )
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{it.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border pt-3 mt-3 space-y-1">
        <div className="px-3 py-2 min-w-0">
          <div className="text-sm font-medium text-ink truncate">
            {profile?.full_name}
          </div>
          <div className="text-xs text-ink-muted truncate">
            {profile?.email}
          </div>
        </div>
        {isAdmin && (
          <>
            <NavLink
              to="/admin/approvals"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition-colors',
                  isActive
                    ? 'bg-mint-100 text-mint-600'
                    : 'text-ink-muted hover:bg-bg hover:text-ink',
                )
              }
            >
              <ScrollText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">คำขออนุมัติ</span>
            </NavLink>
            <NavLink
              to="/admin/reports"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition-colors',
                  isActive
                    ? 'bg-mint-100 text-mint-600'
                    : 'text-ink-muted hover:bg-bg hover:text-ink',
                )
              }
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">รายงาน</span>
            </NavLink>
          </>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm text-softred-400 hover:bg-softred-50 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}

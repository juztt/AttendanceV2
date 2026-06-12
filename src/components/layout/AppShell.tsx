import { type ReactNode } from 'react';
import { BottomTabBar, DesktopSidebar } from './Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  if (!session) return null;
  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop sidebar — visible from md (≥768px) upward */}
      <DesktopSidebar />

      {/*
        Main content area:
        - On mobile (<md): full width, no left offset, top header is sticky
        - On md+: offset by sidebar width (md:pl-52 = 208px, lg:pl-60 = 240px)
        Content is capped to max-w-6xl on huge screens to keep line length comfortable.
      */}
      <div className="md:pl-52 lg:pl-60">
        {/* Mobile top brand bar — hidden from md upward (sidebar takes over) */}
        <header className="md:hidden sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-border/40">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-mint-200 to-skyblue-200 flex items-center justify-center text-white font-bold flex-shrink-0">
                T
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-ink leading-tight text-sm truncate">
                  Mini TimePay
                </div>
                <div className="text-[10px] text-ink-muted truncate">เช็คอิน & เงินเดือน</div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="h-9 w-9 rounded-full bg-white border border-border flex items-center justify-center text-ink-muted hover:text-ink flex-shrink-0"
              aria-label="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/*
          Content:
          - mobile: px-4, more bottom padding to clear the bottom tab bar
          - md+:    py-6, px-6, no extra bottom padding (no bottom nav)
        */}
        <main className="px-4 pt-4 pb-28 md:px-6 md:pt-6 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Bottom tab bar — mobile/tablet only (md:hidden) */}
      <BottomTabBar />
    </div>
  );
}

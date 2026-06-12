import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadSession, loadStore, saveSession, type Session } from '@/lib/store';
import type { Profile, Employee } from '@/types';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  employee: Employee | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = () => {
    const s = loadSession();
    setSession(s);
    if (s) {
      const store = loadStore();
      const p = store.profiles.find((p) => p.id === s.userId) ?? null;
      setProfile(p);
      if (s.employeeId) {
        const e = store.employees.find((e) => e.id === s.employeeId) ?? null;
        setEmployee(e);
      } else {
        const e = store.employees.find((e) => e.profile_id === s.userId) ?? null;
        setEmployee(e);
      }
    } else {
      setProfile(null);
      setEmployee(null);
    }
  };

  useEffect(() => {
    // Skip Supabase auth in demo mode
    if (!isSupabaseConfigured) {
      refresh();
      setLoading(false);
      return;
    }
    refresh();
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<Session> => {
    if (isSupabaseConfigured) {
      const supabase = (await import('@/lib/supabase/client')).getSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error('ไม่สามารถเข้าสู่ระบบได้');

        // Load profile from Supabase (not from localStorage) — Cloudflare
        // deployment runs on a fresh origin with no demo store, so the
        // profile MUST come from the public.profiles table.
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileErr) throw new Error(`โหลดโปรไฟล์ไม่สำเร็จ: ${profileErr.message}`);
        if (!profileRow) {
          throw new Error(
            'ไม่พบโปรไฟล์ผู้ใช้ในระบบ — ต้องรัน SQL insert profile ใน Supabase ก่อน (ดู README ขั้น 3.4)',
          );
        }

        const profile: Profile = profileRow as Profile;

        // Try to find linked employee record (optional — only employee role has one)
        const { data: employeeRow } = await supabase
          .from('employees')
          .select('*')
          .eq('profile_id', data.user.id)
          .maybeSingle();
        const employee: Employee | null = (employeeRow as Employee) ?? null;

        // First-time owner/admin login → seed Thai defaults into the
        // company (shifts, pay rules, leave types, holidays, location).
        // Idempotent: rows already present for the company are skipped,
        // so this is a no-op on every subsequent login.
        if (profile.role === 'owner' || profile.role === 'admin') {
          const { seedCompanyDefaultsRemote } = await import('@/lib/seeds');
          try {
            await seedCompanyDefaultsRemote(profile.company_id);
          } catch (e) {
            console.warn('seedCompanyDefaultsRemote failed', e);
          }
        }

        const newSession: Session = {
          userId: profile.id,
          companyId: profile.company_id,
          role: profile.role,
          employeeId: employee?.id,
        };
        saveSession(newSession);
        setSession(newSession);
        setProfile(profile);
        setEmployee(employee);
        return newSession;
      }
    }
    // Demo/local mode
    const store = loadStore();
    const profile = store.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) throw new Error('ไม่พบอีเมลนี้ในระบบ');
    const demoUsers = (() => {
      const raw = window.localStorage.getItem('mini-timepay-demo-users-v1');
      return raw ? JSON.parse(raw) as Record<string, { profileId: string; passwordHash: string; employeeId?: string }> : {};
    })();
    const u = demoUsers[profile.id];
    if (!u) throw new Error('บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน');
    // Re-hash input and compare
    const hashPwd = (pwd: string) => {
      let h = 0;
      const v = 'mtpay-salt' + pwd;
      for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
      return `h${h.toString(16)}`;
    };
    if (u.passwordHash !== hashPwd(password)) throw new Error('รหัสผ่านไม่ถูกต้อง');

    const employee = store.employees.find((e) => e.profile_id === profile.id);
    const newSession: Session = {
      userId: profile.id,
      companyId: profile.company_id,
      role: profile.role,
      employeeId: employee?.id,
    };
    saveSession(newSession);
    setSession(newSession);
    setProfile(profile);
    setEmployee(employee ?? null);
    return newSession;
  };

  const logout = () => {
    saveSession(null);
    setSession(null);
    setProfile(null);
    setEmployee(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    employee,
    isAdmin: session?.role === 'admin' || session?.role === 'owner',
    isLoading,
    login,
    logout,
    refresh,
  }), [session, profile, employee, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

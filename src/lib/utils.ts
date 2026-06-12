import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (Number.isNaN(amount) || amount == null) return '0.00';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMinutesAsHM(minutes: number): string {
  if (!minutes || minutes < 0) return '0 ชม.';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

export function formatHMDecimal(minutes: number): string {
  if (!minutes || minutes < 0) return '0.00';
  return (minutes / 60).toFixed(2);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowISOTimestamp(): string {
  return new Date().toISOString();
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`;
  const last = new Date(year, month, 0).getDate();
  const end = `${year}-${pad2(month)}-${pad2(last)}`;
  return { start, end };
}

export function thaiDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function thaiMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
}

export function thaiDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('th-TH', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export function thaiDayOfWeek(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('th-TH', { weekday: 'long' });
}

export function diffMinutes(from: string | Date, to: string | Date): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  const b = typeof to === 'string' ? new Date(to) : to;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function combineDateTime(date: string, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

// Calculate distance between two GPS coords (meters) using haversine
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function initialsFromName(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PASTEL_COLORS = [
  '#A7F3D0', '#BFDBFE', '#DDD6FE', '#FED7AA', '#FBCFE8',
  '#FCA5A5', '#FDE68A', '#A5F3FC', '#C4B5FD', '#FDBA74',
];

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PASTEL_COLORS[hash % PASTEL_COLORS.length];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeJSONParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// Re-export the same id/timestamp helpers used by the data layer so callers
// can keep a single import surface for utility functions.
export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function now(): string {
  return new Date().toISOString();
}

// Read a per-company setting from the local store. Exposed here to avoid
// utility <-> store circular imports.
import { loadStore } from '@/lib/store';
export function getSetting(companyId: string, key: string, fallback: any = null): any {
  const store = loadStore();
  const row = store.appSettings.find((r) => r.company_id === companyId && r.key === key);
  if (!row) return fallback;
  return safeJSONParse(row.value, fallback);
}

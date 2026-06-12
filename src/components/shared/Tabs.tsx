import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: { value: string; label: ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 rounded-2xl bg-bg border border-border', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn('flex-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors', value === t.value ? 'bg-white text-ink shadow-soft' : 'text-ink-muted hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

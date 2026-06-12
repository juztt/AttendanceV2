import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  color?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children?: ReactNode;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
};

import { initialsFromName } from '@/lib/utils';

export function Avatar({ name, color, src, size = 'md', className }: AvatarProps) {
  const bg = color ?? '#BFDBFE';
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 border border-white/40',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: bg, color: '#1E293B' }}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initialsFromName(name)}</span>
      )}
    </div>
  );
}

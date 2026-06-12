import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: () => void;
  className?: string;
}

/**
 * Page header used by every page.
 * Layout (responsive):
 *   mobile: title + subtitle on row 1, actions wrap onto a new row below
 *   md+:    title (flex-1) on the left, actions on the right (same row, right-aligned)
 *
 * The component never uses `sticky` or fixed positioning — it scrolls with the page
 * so it cannot be overlapped by the top brand bar (which is sticky on mobile only).
 */
export function PageHeader({ title, subtitle, actions, back, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 pb-4 md:flex-row md:items-center md:gap-4',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {back && (
          <button
            onClick={back}
            className="h-10 w-10 rounded-full bg-white border border-border flex items-center justify-center text-ink-muted hover:text-ink flex-shrink-0"
            aria-label="ย้อนกลับ"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-semibold text-ink leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-muted mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

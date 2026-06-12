export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton h-4 w-full ${className ?? ''}`} />;
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: JSX.Element;
  requireRole?: 'admin' | 'employee';
}

export function RequireAuth({ children, requireRole }: Props) {
  const { session, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-sm text-ink-muted">กำลังโหลด...</div>
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requireRole === 'admin' && session.role === 'employee') {
    return <Navigate to="/employee" replace />;
  }
  if (requireRole === 'employee' && (session.role === 'admin' || session.role === 'owner')) {
    // Admin/owner can also access employee pages if they want, but redirect to admin by default
    return <Navigate to="/admin" replace />;
  }
  return children;
}

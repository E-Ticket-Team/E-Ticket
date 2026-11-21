import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/api';
import { EmptyState } from '../EmptyState';
import { Skeleton } from '../common/Skeleton';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton height={28} width="40%" />
        <Skeleton height={18} width="70%" />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <EmptyState
        icon={<ShieldAlert size={26} />}
        title="Access Restricted"
        description={`Your account (${user.role}) does not have permission to view this section. Required role: ${allowedRoles.join(' or ')}.`}
        action={
          <a href="/" className="btn btn-primary">
            Return Home
          </a>
        }
      />
    );
  }

  return children;
}

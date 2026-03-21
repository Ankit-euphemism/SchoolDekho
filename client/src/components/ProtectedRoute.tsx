import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Role = 'user' | 'parent' | 'admin' | 'school-admin';

export default function ProtectedRoute({ requiredRole }: { requiredRole?: Role } = {}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-200">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

import { Navigate, Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function AdminRoute() {
  const { user, isLoading, profileLoading, isAdmin } = useAuth();

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

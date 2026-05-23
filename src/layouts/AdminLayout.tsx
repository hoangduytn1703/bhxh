import { useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { Users, MessageSquare, LogOut, Shield, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { Toaster } from 'sonner';

const navItems = [
  { to: '/admin/members', label: 'Thành viên', icon: Users },
  { to: '/admin/feedback', label: 'Góp ý', icon: MessageSquare },
];

export function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const mainScrollRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm">Admin BHXH</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Quản trị hệ thống</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main ref={mainScrollRef} className="flex-1 overflow-y-auto min-w-0">
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      <ScrollToTopButton scrollRef={mainScrollRef} />
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchMemberProfileDetailed,
  withTimeout,
} from '../../lib/memberProfile';
import { ADMIN_EMAIL, ADMIN_USERNAME } from '../../lib/admin';

function resolveAdminLoginEmail(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (value.toLowerCase() === ADMIN_USERNAME) return ADMIN_EMAIL;
  if (value.includes('@')) return value;
  return null;
}

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, profileLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !profileLoading && user && isAdmin) {
      navigate('/admin/members', { replace: true });
    }
  }, [user, isAdmin, authLoading, profileLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const email = resolveAdminLoginEmail(username);
    if (!email) {
      setError('Thông tin đăng nhập không hợp lệ.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        20000,
        'Đăng nhập'
      );

      if (signInError) throw signInError;
      if (!data.user) throw new Error('Không nhận được phiên đăng nhập.');

      // Let auth session settle (avoid Supabase auth deadlock)
      await new Promise((r) => setTimeout(r, 100));

      const { profile, errorMessage } = await withTimeout(
        fetchMemberProfileDetailed(data.user.id),
        15000,
        'Tải hồ sơ admin'
      );

      if (errorMessage) {
        throw new Error(
          `Không đọc được bảng profiles: ${errorMessage}. Chạy sql/setup_profiles_and_admin.sql trên Supabase.`
        );
      }

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error(
          'Tài khoản chưa có role admin trong bảng profiles. Chạy UPDATE profiles SET role = \'admin\' ...'
        );
      }

      navigate('/admin/members', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
      if (msg.includes('Invalid login credentials')) {
        setError('Sai tên đăng nhập hoặc mật khẩu.');
      } else if (msg.includes('profiles') || msg.includes('admin')) {
        setError('Không thể xác thực quyền quản trị. Liên hệ kỹ thuật.');
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Admin Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Cổng quản trị BHXH</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl"
        >
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/40 border border-red-800 rounded-xl text-xs text-red-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Tài khoản
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập Admin'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          Truy cập bị giới hạn. Mọi thao tác đều được ghi nhận.
        </p>
      </div>
    </div>
  );
}

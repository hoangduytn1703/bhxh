import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchMemberProfile } from "../lib/memberProfile";
import { isAdminEmail } from "../lib/admin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPass, setIsResetPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    if (sessionStorage.getItem("banned_notice")) {
      setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
      sessionStorage.removeItem("banned_notice");
    }
  }, []);

  useEffect(() => {
    if (user && !isAdminEmail(user)) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isResetPass) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login',
        });
        if (error) throw error;
        setError("Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.");
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !isAdminEmail(data.user)) {
          const profile = await fetchMemberProfile(data.user.id);
          if (profile?.status === "banned") {
            await supabase.auth.signOut();
            setError("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
            return;
          }
        }
        navigate(isAdminEmail(data.user) ? "/admin/members" : "/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError("Vui lòng kiểm tra email của bạn để xác nhận tài khoản.");
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Lỗi kết nối hoặc thông tin không hợp lệ.';
      if (errorMsg.includes('Invalid login credentials')) {
        setError('Thông tin đăng nhập không hợp lệ.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 max-w-md mx-auto w-full">
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-200">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">
          {isResetPass ? "Quên mật khẩu" : (isLogin ? "Đăng nhập" : "Tạo tài khoản")}
        </h2>
        <p className="text-sm text-slate-500 text-center mb-8">
          {isResetPass ? "Nhập email để đặt lại mật khẩu" : "Đồng bộ và bảo mật dữ liệu bảo hiểm của bạn"}
        </p>

        {error && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${
            error.includes('kiểm tra email') || error.includes('Hướng dẫn đặt lại')
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
              : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800"
                placeholder="Ex: luong.huu@example.com"
              />
            </div>
          </div>

          {!isResetPass && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Mật khẩu</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => { setIsResetPass(true); setError(null); }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {isLogin && !isResetPass && (
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm font-medium text-slate-700 cursor-pointer">
                Ghi nhớ đăng nhập
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative flex items-center justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isResetPass ? "Gửi hướng dẫn" : (isLogin ? "Đăng nhập" : "Đăng ký")
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-slate-500">
          {isResetPass ? (
            <p>
              Nhớ mật khẩu?{" "}
              <button 
                type="button" 
                onClick={() => {
                   setIsResetPass(false);
                   setIsLogin(true);
                   setError(null);
                }}
                className="font-bold text-blue-600 hover:text-blue-500"
              >
                Trở lại đăng nhập
              </button>
            </p>
          ) : isLogin ? (
            <p>
              Chưa có tài khoản?{" "}
              <button 
                type="button" 
                onClick={() => {
                   setIsLogin(false);
                   setError(null);
                }}
                className="font-bold text-blue-600 hover:text-blue-500"
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{" "}
              <button 
                type="button" 
                onClick={() => {
                   setIsLogin(true);
                   setError(null);
                }} 
                className="font-bold text-blue-600 hover:text-blue-500"
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
      
      <Link to="/" className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-700">
        &larr; Về trang chủ
      </Link>
    </div>
  );
}

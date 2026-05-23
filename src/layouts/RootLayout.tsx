import { Outlet, Link } from "react-router";
import { User, Menu, X, LogOut, UserCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { UserAvatar } from "../components/UserAvatar";
import { FeedbackWidget } from "../components/FeedbackWidget";
import { ScrollToTopButton } from "../components/ScrollToTopButton";
import { Toaster } from "sonner";
import { getDisplayName } from "../lib/userProfile";

export function RootLayout() {
  const { user, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = getDisplayName(user);
  const mainScrollRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-90 transition-opacity min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-base sm:text-lg shadow-md shadow-blue-200 shrink-0">
            BH
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base leading-tight text-slate-800 truncate">
              <span className="hidden sm:inline">Cổng Tính Toán Bảo Hiểm Toàn Diện</span>
              <span className="sm:hidden">Tính BHXH</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
              BHXH • BHTN • HƯU TRÍ VIỆT NAM
            </p>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <Link to="/profile" className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors">
                  {displayName}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-[10px] text-red-500 uppercase tracking-wider font-bold hover:text-red-700 cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
              <Link to="/profile" className="hover:opacity-90 transition-opacity">
                <UserAvatar user={user} size="sm" />
              </Link>
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-3 group">
              <div className="flex flex-col items-end">
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Đăng nhập</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Lưu dữ liệu cá nhân</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                <User className="w-5 h-5" />
              </div>
            </Link>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex sm:hidden items-center gap-2" ref={menuRef}>
          {user && (
            <Link to="/profile" className="hover:opacity-90 transition-opacity">
              <UserAvatar user={user} size="sm" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute top-16 right-3 z-50 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {user ? (
                <>
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle className="w-4 h-4 text-slate-400" />
                    Hồ sơ cá nhân
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setMobileMenuOpen(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50"
                >
                  <User className="w-4 h-4" />
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Scrollable Main Area */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 mt-8 py-6 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} Cổng Tính Toán Bảo Hiểm Toàn Diện · Phiên bản thử nghiệm
            </p>
            <p className="text-center sm:text-right leading-relaxed">
              Số liệu mang tính chất <strong className="font-semibold text-slate-500">tham khảo</strong> theo luật hiện hành. Không thay thế tư vấn pháp lý hoặc BHXH chính thức.
            </p>
          </div>
        </footer>
      </main>

      <ScrollToTopButton scrollRef={mainScrollRef} bottomClass="bottom-24" />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
        confirmText="Đăng xuất"
      />

      <FeedbackWidget />
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </div>
  );
}

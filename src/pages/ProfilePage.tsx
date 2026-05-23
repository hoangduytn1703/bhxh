import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Link, useNavigate } from "react-router";
import { User, Mail, Phone, MapPin, Calendar, Loader2, Save, Shield, CheckCircle2, Camera, Briefcase, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { UserAvatar } from "../components/UserAvatar";
import { ContributionPeriodsEditor } from "../components/ContributionPeriodsEditor";
import { ContributionPeriodsImportExport } from "../components/ContributionPeriodsImportExport";
import { getDisplayName, getProfileGender, resizeImageToDataUrl, type ProfileGender } from "../lib/userProfile";
import { syncPublicProfileFromForm } from "../lib/publicProfile";
import { toast } from "sonner";
import { loadWorkspace, saveWorkspacePeriods } from "../lib/userRecords";
import type { ContributionPeriod } from "../types";

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [periods, setPeriods] = useState<ContributionPeriod[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const [isSavingPeriods, setIsSavingPeriods] = useState(false);
  const [periodsSaveSuccess, setPeriodsSaveSuccess] = useState(false);
  const [showPeriodsConfirm, setShowPeriodsConfirm] = useState(false);
  
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    address: "",
    birthday: "",
    gender: "" as ProfileGender | "",
  });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/login");
    }
  }, [user, isAuthLoading, navigate]);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.user_metadata?.full_name || "",
        phone: user.user_metadata?.phone || "",
        address: user.user_metadata?.address || "",
        birthday: user.user_metadata?.birthday || "",
        gender: getProfileGender(user) || "",
      });
      setAvatarPreview(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  useEffect(() => {
    const loadPeriods = async () => {
      if (!user) return;
      setIsLoadingPeriods(true);
      try {
        const workspace = await loadWorkspace(user.id);
        if (workspace?.periods?.length) {
          setPeriods(workspace.periods);
        } else {
          const stored = localStorage.getItem('persisted_periods_list');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) setPeriods(parsed);
            } catch {
              /* ignore */
            }
          }
        }
      } finally {
        setIsLoadingPeriods(false);
      }
    };
    loadPeriods();
  }, [user?.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarPreview(dataUrl);
    } catch {
      toast.error('Không thể xử lý ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatePromise = supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          phone: profile.phone,
          address: profile.address,
          birthday: profile.birthday,
          gender: profile.gender || null,
          avatar_url: avatarPreview,
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Quá thời gian kết nối. Vui lòng thử lại sau.")), 10000)
      );

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.updateUser>>;

      if (error) throw error;
      await syncPublicProfileFromForm(user!.id, profile);
      await refreshUser();
      setSaveSuccess(true);
      toast.success('Hồ sơ đã được lưu.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      toast.error("Lỗi khi lưu thông tin: " + message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePeriods = async () => {
    setShowPeriodsConfirm(false);
    setIsSavingPeriods(true);
    setPeriodsSaveSuccess(false);
    try {
      await saveWorkspacePeriods(user!.id, periods);
      localStorage.setItem('persisted_periods_list', JSON.stringify(periods));
      setPeriodsSaveSuccess(true);
      toast.success('Đã lưu quá trình đóng BHXH.');
      setTimeout(() => setPeriodsSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
      toast.error('Lỗi khi lưu quá trình đóng: ' + message);
    } finally {
      setIsSavingPeriods(false);
    }
  };

  if (!user) return null;

  const displayName = profile.fullName || getDisplayName(user);
  const totalMonths = periods.reduce((sum, p) => {
    const months = (p.endYear - p.startYear) * 12 + (p.endMonth - p.startMonth) + 1;
    return sum + months;
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Trang Cá Nhân</h1>
          <p className="text-sm font-medium text-slate-500">Quản lý thông tin và hồ sơ của bạn</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 shadow-md"
                  />
                ) : (
                  <UserAvatar user={user} size="md" />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-wait"
                  title="Đổi ảnh đại diện"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {displayName}
                </h2>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-0.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>Tài khoản trực tuyến</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Cập nhật ảnh đại diện
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isAuthLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveClick} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email đăng nhập</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      disabled
                      value={user.email}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Không thể thay đổi</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Họ và Tên</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Giới tính sinh học</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, gender: 'male' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${profile.gender === 'male' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, gender: 'female' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${profile.gender === 'female' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Nữ
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Số Điện Thoại</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      placeholder="VD: 0912345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ngày Sinh</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      value={profile.birthday}
                      onChange={(e) => setProfile({...profile, birthday: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 shadow-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">Năm sinh sẽ được dùng trên bảng tính toán BHXH</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Địa Chỉ</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({...profile, address: e.target.value})}
                      placeholder="VD: Số 123, Quận 1, TP Hồ Chí Minh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-slate-800 shadow-sm"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                {saveSuccess && (
                  <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" /> Đã lưu thành công
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-200 outline-none flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Quá trình đóng BHXH</h2>
              <p className="text-xs text-slate-500 font-medium">
                Đồng bộ với Bảng điều khiển — chỉnh ở đây hoặc trên trang tính toán đều được
              </p>
            </div>
          </div>
          {totalMonths > 0 && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              {Math.floor(totalMonths / 12)} năm {totalMonths % 12} tháng
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">
          {isLoadingPeriods ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <>
              <ContributionPeriodsImportExport
                periods={periods}
                onImport={setPeriods}
                exportFilename="qua-trinh-dong-bhxh-ca-nhan.txt"
              />
              <ContributionPeriodsEditor periods={periods} onChange={setPeriods} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở Bảng điều khiển để xem kết quả tính
                </Link>
                <div className="flex items-center gap-3 justify-end">
                  {periodsSaveSuccess && (
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đã lưu quá trình đóng
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPeriodsConfirm(true)}
                    disabled={isSavingPeriods}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSavingPeriods ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Lưu quá trình đóng
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 text-center">
        <Link to="/" className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">
          Quay lại Bảng điều khiển
        </Link>
      </div>
      <ConfirmModal 
        isOpen={showConfirmModal}
        title="Lưu thông tin cá nhân"
        message="Bạn có chắc chắn muốn lưu các thay đổi này vào hồ sơ cá nhân?"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirmModal(false)}
      />
      <ConfirmModal
        isOpen={showPeriodsConfirm}
        title="Lưu quá trình đóng BHXH"
        message="Lưu danh sách giai đoạn đóng bảo hiểm? Dữ liệu sẽ đồng bộ với Bảng điều khiển khi bạn mở lại trang chủ."
        onConfirm={handleSavePeriods}
        onCancel={() => setShowPeriodsConfirm(false)}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "react-router";
import { 
  Clock, Calculator, Info, AlertOctagon, CheckCircle2, Flame, Calendar, Award, Compass, Sparkles, Check, CloudUpload, CloudDownload, Loader2
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import { getProfileGender, getProfileBirthYear, mergeProfileDemographics } from "../lib/userProfile";
import { calculateWorkspaceResults } from "../lib/workspaceCalculations";
import type { ContributionPeriod } from "../types";
import { ContributionPeriodsEditor } from "../components/ContributionPeriodsEditor";
import { ContributionPeriodsImportExport } from "../components/ContributionPeriodsImportExport";
import { InsuranceModeTabs, type InsuranceTab } from "../components/InsuranceModeTabs";

const periodSchema = z.object({
  startMonth: z.number().min(1).max(12),
  startYear: z.number().min(1960).max(2050),
  endMonth: z.number().min(1).max(12),
  endYear: z.number().min(1960).max(2050),
  salary: z.number().min(0, "Lương đóng tối thiểu là 0 VNĐ"),
  contributionType: z.enum(["mandatory", "voluntary", "maternity"]),
});

const formSchema = z.object({
  gender: z.enum(["male", "female"]),
  birthYear: z.number().min(1940).max(2015),
  isWorking: z.enum(["true", "false"]),
  quitDate: z.string().or(z.literal("")),
  continueContributionUntilYear: z.number().min(2024).max(2070),
  hasApplied: z.enum(["true", "false"]),
  periods: z.array(periodSchema).min(1, "Vui lòng thêm ít nhất 1 giai đoạn đóng BHXH"),
});

type FormValues = z.infer<typeof formSchema>;

const getInitialPeriods = () => {
  const stored = localStorage.getItem('persisted_periods_list');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse persisted_periods_list", e);
    }
  }

  return [
    {
      startMonth: 1, startYear: 2018, endMonth: 12, endYear: 2022, salary: 8500000, contributionType: "mandatory" as const,
    }
  ];
};

import { ConfirmModal } from "../components/ConfirmModal";
import { toast } from "sonner";

export default function HomePage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<InsuranceTab>("bhxh");
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'save' | 'load';
  }>({ isOpen: false, type: 'save' });

  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [lastCalculatedInputs, setLastCalculatedInputs] = useState<any>(null);

  // Sync activeTab with pathname on load/change
  useEffect(() => {
    const path = location.pathname;
    if (path === "/bhxh-1-lan") {
      setActiveTab("bhxh");
    } else if (path === "/luong-huu") {
      setActiveTab("pension");
    } else if (path === "/bhtn") {
      setActiveTab("unemployment");
    } else if (path === "/thai-san") {
      setActiveTab("maternity");
    }
  }, [location.pathname]);

  const { register, control, setValue, watch, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: "male",
      birthYear: 1990,
      isWorking: "true",
      quitDate: new Date().toISOString().split('T')[0],
      continueContributionUntilYear: 2045,
      hasApplied: "false",
      periods: getInitialPeriods()
    }
  });

  const { replace } = useFieldArray({
    name: "periods",
    control,
  });

  const watchedPeriods = watch("periods");
  const gender = watch("gender");
  const birthYear = watch("birthYear");
  const isWorking = watch("isWorking");
  const quitDate = watch("quitDate");
  const continueContributionUntilYear = watch("continueContributionUntilYear");
  const hasApplied = watch("hasApplied");

  // Format currency with standard commas correctly
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  // Load cloud workspace; giới tính & năm sinh luôn ưu tiên từ hồ sơ khi mở trang
  useEffect(() => {
    if (isAuthLoading) return;

    const loadAuto = async () => {
      if (user) {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        const activeUser = freshUser ?? user;

        try {
          const { data, error } = await (supabase.from('user_records') as any).select('data').eq('user_id', activeUser.id).single();
          if (!error && data && data.data) {
            const remoteData = data.data;
            const merged = mergeProfileDemographics(activeUser, remoteData);
            setValue('gender', merged.gender as 'male' | 'female');
            setValue('birthYear', merged.birthYear);
            setValue('isWorking', remoteData.isWorking);
            setValue('quitDate', remoteData.quitDate);
            setValue('continueContributionUntilYear', remoteData.continueContributionUntilYear);
            setValue('hasApplied', remoteData.hasApplied);
            replace(remoteData.periods ?? []);
            const res = performMath(merged);
            setCalculatedData(res);
            setLastCalculatedInputs(merged);
          } else {
            const metaGender = getProfileGender(activeUser);
            const metaBirthYear = getProfileBirthYear(activeUser);
            if (metaGender) setValue('gender', metaGender);
            if (metaBirthYear) setValue('birthYear', metaBirthYear);
            const vals = getValues();
            const inputs = mergeProfileDemographics(activeUser, {
              gender: vals.gender,
              birthYear: vals.birthYear,
              isWorking: vals.isWorking,
              quitDate: vals.quitDate,
              continueContributionUntilYear: vals.continueContributionUntilYear,
              hasApplied: vals.hasApplied,
              periods: vals.periods ?? [],
            });
            if (metaGender) setValue('gender', inputs.gender as 'male' | 'female');
            if (metaBirthYear) setValue('birthYear', inputs.birthYear);
            const res = performMath(inputs);
            setCalculatedData(res);
            setLastCalculatedInputs(inputs);
          }
        } catch (e) {
          console.error('loadAuto', e);
        }
      } else {
        replace([]);
        setCalculatedData(null);
        setLastCalculatedInputs(null);
        localStorage.removeItem('persisted_periods_list');
      }
    };

    loadAuto();
  }, [user, isAuthLoading]);

  // Live Sync with localStorage and Auto Update quitDate
  useEffect(() => {
    if (watchedPeriods && watchedPeriods.length > 0) {
      localStorage.setItem('persisted_periods_list', JSON.stringify(watchedPeriods));

      // Auto-set the quit date to the 1st of the last period's end month
      let latestYear = 0;
      let latestMonth = 0;
      watchedPeriods.forEach(p => {
        if (p.endYear > latestYear || (p.endYear === latestYear && p.endMonth > latestMonth)) {
          latestYear = p.endYear;
          latestMonth = p.endMonth;
        }
      });
      if (latestYear > 0 && latestMonth > 0) {
        const monthStr = latestMonth < 10 ? `0${latestMonth}` : latestMonth;
        setValue('quitDate', `${latestYear}-${monthStr}-01`);
      }
    }
  }, [watchedPeriods, setValue]);

  // Sync statutory retirement year expectation as user changes birthYear
  useEffect(() => {
    if (birthYear) {
      const suggestedAge = gender === 'male' ? 62 : 60;
      setValue('continueContributionUntilYear', birthYear + suggestedAge);
    }
  }, [birthYear, gender, setValue]);

  const performMath = (inputs: {
    gender: 'male' | 'female';
    birthYear: number;
    isWorking: string;
    quitDate: string;
    continueContributionUntilYear: number;
    hasApplied: string;
    periods: ContributionPeriod[] | Array<Partial<ContributionPeriod>>;
  }) =>
    calculateWorkspaceResults({
      ...inputs,
      periods: (inputs.periods ?? []) as ContributionPeriod[],
    });

  // Khách chưa đăng nhập: tính mặc định (đã đăng nhập thì loadAuto xử lý)
  useEffect(() => {
    if (isAuthLoading || user) return;

    const initialPeriods = getInitialPeriods();
    const initialInputs = {
      gender: "male" as const,
      birthYear: 1990,
      isWorking: "false" as const,
      quitDate: new Date().toISOString().split('T')[0],
      continueContributionUntilYear: 2051,
      hasApplied: "false" as const,
      periods: initialPeriods
    };
    const res = performMath(initialInputs);
    setCalculatedData(res);
    setLastCalculatedInputs(initialInputs);
  }, [isAuthLoading, user]);

  const currentInputs = {
    gender,
    birthYear: Number(birthYear),
    isWorking,
    quitDate,
    continueContributionUntilYear: Number(continueContributionUntilYear),
    hasApplied,
    periods: watchedPeriods || []
  };

  const isDirty = lastCalculatedInputs
    ? JSON.stringify(lastCalculatedInputs) !== JSON.stringify(currentInputs)
    : false;

  const latestPeriod = watchedPeriods?.reduce((max, p) => {
    return (p.endYear > max.endYear || (p.endYear === max.endYear && p.endMonth > max.endMonth)) ? p : max;
  }, { endYear: 0, endMonth: 0 });

  const minQuitDateStr = latestPeriod?.endYear > 0 
    ? `${latestPeriod.endYear}-${latestPeriod.endMonth < 10 ? `0${latestPeriod.endMonth}` : latestPeriod.endMonth}-01` 
    : undefined;

  const results = calculatedData || performMath(currentInputs);

  const bhxhResult = results.bhxhResult;
  const pensionResult = results.pensionResult;
  const bhtnResult = results.bhtnResult;
  const maternityResult = results.maternityResult;
  const totalMonths = results.totalMonths;
  const totalYearsContributed = results.totalYearsContributed;
  const averageSalaryForPension = results.averageSalaryForPension;

  const dateOfQuit = quitDate ? new Date(quitDate) : new Date();

  const handleTriggerCalculation = () => {
    const res = performMath(currentInputs);
    setCalculatedData(res);
    setLastCalculatedInputs(currentInputs);
    
    // Smooth scroll to tabs section!
    setTimeout(() => {
      const element = document.getElementById("section_modes_tabs");
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSaveToCloudClick = () => {
    if (!user) return;
    setConfirmModal({ isOpen: true, type: 'save' });
  };

  const handleLoadFromCloudClick = () => {
    if (!user) return;
    setConfirmModal({ isOpen: true, type: 'load' });
  };

  const handleConfirmAction = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (confirmModal.type === 'save') {
      executeSaveToCloud();
    } else {
      executeLoadFromCloud();
    }
  };

  const executeSaveToCloud = async () => {
    setIsSaving(true);
    setSyncStatus('idle');
    try {
      const { error } = await (supabase.from('user_records') as any).upsert({
        user_id: user.id,
        data: currentInputs,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      setSyncStatus('saved');
      toast.success('Đã lưu hồ sơ lên đám mây.');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      toast.error('Lỗi khi lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeLoadFromCloud = async () => {
    setIsLoadingCloud(true);
    try {
      const { data, error } = await (supabase.from('user_records') as any).select('data').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data && (data as any).data) {
        const remoteData = (data as any).data;
        setValue('gender', remoteData.gender);
        setValue('birthYear', remoteData.birthYear);
        setValue('isWorking', remoteData.isWorking);
        setValue('quitDate', remoteData.quitDate);
        setValue('continueContributionUntilYear', remoteData.continueContributionUntilYear);
        setValue('hasApplied', remoteData.hasApplied);
        replace(remoteData.periods);
        
        const res = performMath(remoteData);
        setCalculatedData(res);
        setLastCalculatedInputs(remoteData);
      } else {
        toast.info('Chưa có dữ liệu nào được lưu trên đám mây cho tài khoản này.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* ROW 1: DỮ LIỆU ĐẦU VÀO CHUNG (Shared Profile & Period Insurance Contributor) */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="section_data_input">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-600 text-white font-extrabold rounded-lg flex items-center justify-center text-sm">1</span>
              Dữ liệu đóng bảo hiểm & Thông tin cá nhân
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Dữ liệu gốc dùng để đối chiếu, tính toán và phân tích tất cả các chế độ bảo hiểm cho bạn.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user && (
              <>
                <button 
                  type="button" 
                  onClick={handleLoadFromCloudClick} 
                  disabled={isLoadingCloud}
                  className="px-4 py-2.5 border border-indigo-200 text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5 focus:ring-2 focus:ring-indigo-200 outline-none disabled:opacity-50"
                >
                  {isLoadingCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                  Tải dữ liệu Cá nhân
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveToCloudClick} 
                  disabled={isSaving}
                  className="px-4 py-2.5 border border-blue-200 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-1.5 focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (syncStatus === 'saved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CloudUpload className="w-4 h-4" />)}
                  {syncStatus === 'saved' ? 'Đã lưu thành công' : 'Lưu Hồ sơ Cá nhân'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Guest CTA banner */}
        {!user && !isAuthLoading && (
          <div className="mx-6 sm:mx-8 mt-5 mb-0 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <CloudUpload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">Lưu hồ sơ vĩnh viễn trên đám mây</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Đăng ký miễn phí để không mất dữ liệu mỗi lần đổi thiết bị.</p>
              </div>
            </div>
            <a
              href="/login"
              className="shrink-0 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-colors shadow-sm shadow-blue-200 whitespace-nowrap text-center"
            >
              Đăng ký / Đăng nhập
            </a>
          </div>
        )}

        <div className="p-6 sm:p-8">
          
          {/* PROFILE COMPACT SECTION */}
          <div className="pb-6 mb-6 border-b border-dashed border-slate-200 space-y-4">
            {user && (
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Mặc định lấy từ hồ sơ của bạn khi mở trang. Có thể chỉnh tạm để tính thử (ví dụ người thân) — không cập nhật trang Cá nhân.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Giới tính sinh học</label>
                <div className="flex p-1 bg-slate-100 rounded-xl max-w-xs">
                  <button 
                    type="button" 
                    onClick={() => setValue('gender', 'male')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${gender === 'male' ? 'bg-white shadow-sm text-slate-800 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Nam
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setValue('gender', 'female')} 
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${gender === 'female' ? 'bg-white shadow-sm text-slate-800 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Nữ
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-w-xs">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Năm sinh</label>
                <input 
                  type="number" 
                  className="w-full px-4.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-105 transition-all shadow-sm" 
                  {...register("birthYear", { valueAsNumber: true })} 
                />
              </div>
            </div>
          </div>

          <ContributionPeriodsImportExport
            periods={(watchedPeriods || []) as ContributionPeriod[]}
            onImport={(p) => replace(p)}
            exportFilename="qua-trinh-dong-bhxh-dashboard.txt"
            className="mb-4"
          />

          <ContributionPeriodsEditor
            periods={(watchedPeriods || []) as ContributionPeriod[]}
            onChange={(p) => replace(p)}
            maxHeight="max-h-[400px]"
          />

          <div className="mt-4 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap items-center gap-2.5 text-slate-700">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="font-bold">Tổng quan quá trình đã nhập:</span>
              <strong className="text-slate-900 font-extrabold text-base">{totalYearsContributed} năm {totalMonths % 12} tháng</strong>
              <span className="text-slate-400 font-semibold text-xs">({totalMonths} tháng đóng bảo hiểm)</span>
            </div>
            
            <div className="text-slate-600 shrink-0 font-medium">
              Mức lương đóng trung bình: <strong className="text-slate-900 font-extrabold text-base">{formatCurrency(averageSalaryForPension)} VNĐ/tháng</strong>
            </div>
          </div>

          {/* MANUAL TRIGGER CALCULATION BLOCK */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center justify-center space-y-3">
            {isDirty ? (
              <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-pulse shadow-sm">
                <AlertOctagon className="w-4.5 h-4.5 text-amber-500 shrink-0 animate-bounce" />
                <span>Phát hiện thay đổi mới chưa tính toán! Hãy nhấn nút dưới đây để cập nhật kết quả.</span>
              </div>
            ) : (
              <div className="px-4 py-2 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm">
                <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <span>Kết quả hiển thị đang khớp chính xác diện với các thay đổi hiện tại.</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTriggerCalculation}
              className={`w-full max-w-md py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all outline-none border cursor-pointer ${
                isDirty 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-700 text-white shadow-lg shadow-blue-500/25 hover:scale-102 hover:shadow-xl hover:shadow-blue-500/35 active:scale-98" 
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-250 hover:bg-slate-200/50"
              }`}
              id="btn-calculate-manual-trigger"
            >
              <Calculator className="w-5 h-5 shrink-0" />
              <span>CẬP NHẬT TÍNH TOÁN KẾT QUẢ</span>
            </button>
          </div>

        </div>
      </section>

      {/* ROW 2: 3 TAB TƯƠNG ỨNG 3 CHẾ ĐỘ BẢO HIỂM (BOTTOM ROW WITH INTEGRATED PARAMETER CHECKS) */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="section_modes_tabs">
        <InsuranceModeTabs activeTab={activeTab} onChange={setActiveTab} />

        {/* TAB INTERFACES Grid-2 columns side-by-side */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: BHXH MỘT LẦN */}
          {activeTab === "bhxh" && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Specific inputs */}
              <div className="lg:col-span-5 space-y-5 p-6 bg-slate-50 border border-slate-205/60 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Compass className="w-4 h-4 text-amber-505"/> Thiết lập tham số BHXH một lần
                </h4>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-650">Trạng thái làm việc hiện tại</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setValue('isWorking', 'false')} 
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isWorking === 'false' ? 'bg-white shadow-sm text-slate-805 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Đã nghỉ việc hoàn toàn
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setValue('isWorking', 'true')} 
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isWorking === 'true' ? 'bg-white shadow-sm text-slate-805 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Đang làm việc
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-650">Ngày dừng đóng BHXH / thôi việc thực tế</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400" 
                    {...register("quitDate")} 
                    disabled={isWorking === 'true'} 
                    min={minQuitDateStr}
                  />
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Lưu ý: Luật BHXH yêu cầu phải nghỉ việc đủ 1 năm mới có thể nộp và duyệt phát chi trả chế độ.</p>
                </div>
              </div>

              {/* Right Column: Outcomes & Breakdown */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">Mức lĩnh dự kiến (Tạm tính thời điểm hiện tại)</span>
                  <div className="text-4xl sm:text-5xl font-black text-amber-600 tracking-tight">
                    {formatCurrency(bhxhResult.totalAmount)} <span className="text-xl font-black text-amber-400">VNĐ</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Thời gian tích lũy</span>
                    <strong className="text-xl font-bold text-slate-800">{bhxhResult.totalMonths} tháng</strong>
                    <p className="text-[10px] text-slate-400 font-medium">({bhxhResult.totalYears} năm đóng bảo hiểm)</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Xu hướng bảo hiểm</span>
                    <strong className={`text-xs font-bold block mt-1 ${bhxhResult.isEligible ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {bhxhResult.isEligible ? 'Được duyệt ngay' : 'Chờ đủ 1 năm'}
                    </strong>
                  </div>
                </div>

                {/* Eligibility Callout info box */}
                <div className={`p-5 rounded-2xl border ${bhxhResult.isEligible ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${bhxhResult.isEligible ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {bhxhResult.isEligible ? 'Hồ sơ sẵn sàng nộp cơ quan' : 'CẢNH BÁO: CHƯA ĐỦ ĐIỀU KIỆN NHẬN'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">{bhxhResult.message}</p>
                </div>

                {/* Explanation of parameters */}
                <div className="p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl space-y-3">
                  <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 justify-between">
                    <span>Diễn giải chi tiết công thức (Nghị định 115)</span>
                    <Info className="w-4 h-4 text-blue-500 hover:text-blue-600 cursor-help" />
                  </h5>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hệ số trợ cấp BHXH một lần được hưởng nhân hệ số theo các giai đoạn đóng bảo hiểm xã hội :<br/>
                    • Giai đoạn trước năm 2014: Hệ số nhân <strong>1.5 tháng lương</strong> bình quân cho mỗi năm đóng bảo hiểm.<br/>
                    • Giai đoạn từ năm 2014 trở đi: Hệ số nhân <strong>2.0 tháng lương</strong> bình quân cho mỗi năm đóng bảo hiểm.<br/>
                    • Nếu thời gian đóng BHXH có tháng lẻ thì từ 01 tháng đến 06 tháng được tính là 0.5 năm, từ 07 tháng đến 11 tháng được tính là 01 năm đóng bảo hiểm.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ĐỊNH CHẾ HƯU TRÍ (PENSION) */}
          {activeTab === "pension" && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Specific inputs */}
              <div className="lg:col-span-5 space-y-5 p-6 bg-slate-50 border border-slate-205/60 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Compass className="w-4 h-4 text-emerald-500"/> Giả lập đóng bảo hiểm đến nghỉ hưu
                </h4>

                <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-3 shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-650 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500"/> Kéo thời gian định đóng tiếp
                    </span>
                    <span className="font-bold text-emerald-600">Năm {continueContributionUntilYear}</span>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Luật Việt Nam yêu cầu đóng tối thiểu <strong>20 năm</strong> để hưởng chế độ hưu trí hàng tháng. Kéo thanh dưới để dự phóng quyền lợi nếu bạn tiếp tục cống hiến.
                  </p>

                  <input 
                    type="range" 
                    min="2025" 
                    max="2070" 
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                    value={continueContributionUntilYear}
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${((continueContributionUntilYear - 2025) / (2070 - 2025)) * 100}%, #e2e8f0 ${((continueContributionUntilYear - 2025) / (2070 - 2025)) * 100}%, #e2e8f0 100%)`
                    }}
                    onChange={(e) => {
                      setValue("continueContributionUntilYear", parseInt(e.target.value));
                    }}
                  />

                  <div className="flex justify-between text-[9px] text-slate-400 font-extrabold uppercase">
                    <span>2025 (Nay)</span>
                    <span>2045</span>
                    <span>2070</span>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">Tuổi hưởng lương hưu lý thuyết áp dụng</span>
                  <p className="text-xs font-extrabold text-slate-800">
                    {pensionResult.retirementAge.years} tuổi {pensionResult.retirementAge.months > 0 ? pensionResult.retirementAge.months + ' tháng' : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-normal">Áp dụng theo độ tuổi nâng lộ trình của Bộ luật Lao động 2019.</p>
                </div>
              </div>

              {/* Right Column: Outcomes */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">Dự phóng lương hưu hàng tháng của bạn</span>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight">
                    {formatCurrency(pensionResult.monthlyPension)} <span className="text-xl font-bold text-emerald-400">VNĐ/tháng</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 shadow-sm">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-0.5">Tỷ lệ hưởng hưu</span>
                    <strong className="text-lg font-bold text-emerald-600">{pensionResult.pensionRate}%</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 shadow-sm">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-0.5">Tuổi nghỉ hưu lý thuyết</span>
                    <strong className="text-xs font-bold text-slate-800 block truncate">{pensionResult.retirementAge.years}t {pensionResult.retirementAge.months > 0 ? pensionResult.retirementAge.months + 'th' : ''}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60 shadow-sm">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-0.5">Bình quân lương tháng</span>
                    <strong className="text-xs font-mono font-bold text-slate-700 block truncate">{formatCurrency(averageSalaryForPension)}</strong>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${pensionResult.totalYearsEstimated >= 20 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                  <h5 className="text-xs font-bold flex items-center gap-1 mb-1">
                    <Award className="w-4 h-4"/> SỐ NĂM TÍCH LŨY PHỎNG ĐOÁN: {pensionResult.totalYearsEstimated} NĂM
                  </h5>
                  <p className="text-xs leading-relaxed">{pensionResult.message}</p>
                </div>

                {/* GRAPHIC PROGRESS BAR Accumulation Percentage */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-650">
                    <span>Tỷ lệ hưởng thụ lý tưởng đạt được</span>
                    <span className="text-emerald-700 font-extrabold">{pensionResult.pensionRate}% / 75% tối đa của luật định</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (pensionResult.pensionRate / 75) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: BẢO HIỂM THẤT NGHIỆP (BHTN) */}
          {activeTab === "unemployment" && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Specific inputs */}
              <div className="lg:col-span-5 space-y-5 p-6 bg-slate-50 border border-slate-205/60 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Compass className="w-4 h-4 text-blue-500"/> Tham số Bảo hiểm thất nghiệp
                </h4>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-650">Ngày nghỉ thôi việc của bạn</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm" 
                    {...register("quitDate")} 
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">Hạn chót để cơ quan tiếp nhận hồ bhtn là <strong>3 tháng</strong> kể từ ngày thôi việc này.</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-650">Bạn đã nộp hồ sơ xin lĩnh chưa?</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setValue("hasApplied", "false")} 
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${hasApplied === "false" ? 'bg-white shadow-sm text-slate-805 font-extrabold' : 'text-slate-500 hover:text-slate-750'}`}
                    >
                      Chưa nộp
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setValue("hasApplied", "true")} 
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${hasApplied === "true" ? 'bg-white shadow-sm text-slate-805 font-extrabold' : 'text-slate-500 hover:text-slate-750'}`}
                    >
                      Đã nộp xong
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Outcomes */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-1">Mức lĩnh trợ cấp hàng tháng</span>
                  <div className="text-4xl sm:text-5xl font-black text-blue-600 tracking-tight">
                    {formatCurrency(bhtnResult.monthlyAmount)} <span className="text-xl font-bold text-blue-400">VNĐ / tháng</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Số tháng được lĩnh trợ cấp</span>
                    <strong className="text-2xl font-bold text-blue-650">{bhtnResult.eligibleMonths} tháng</strong>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Tổng số tiền trợ cấp nhận được</span>
                    <strong className="text-xl font-bold text-emerald-600">{formatCurrency(bhtnResult.totalAmount)} VNĐ</strong>
                  </div>
                </div>

                {/* Deadlines details callout error indicators */}
                <div className="p-5 bg-red-50 border border-red-100 text-red-800 rounded-2xl space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-red-700">
                    <AlertOctagon className="w-4 h-4 text-red-500" /> THỜI HẠN CHÓT NỘP HỒ SƠ QUAN TRỌNG
                  </h5>
                  <p className="text-xs leading-relaxed">
                    Hạn nộp hồ sơ xin trợ cấp BHTN cuối cùng: <strong className="text-red-700 font-extrabold">{bhtnResult.deadlineDate.toLocaleDateString('vi-VN')}</strong> (trong vòng <strong>3 tháng</strong> kể từ ngày bạn nghỉ việc là ngày {dateOfQuit.toLocaleDateString('vi-VN')}). Quá hạn này toàn bộ số tháng chưa hưởng sẽ bảo lưu cho quá trình sau.
                  </p>
                </div>

                <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <p className="text-xs text-blue-800 leading-relaxed font-semibold">
                    <strong>Thông tin cơ bản:</strong> Điều kiện hưởng BHTN là phải đóng bảo hiểm thất nghiệp từ đủ <strong>12 tháng trở lên trong vòng 24 tháng</strong> trước khi nghỉ việc. Mức trợ cấp BHTN tính bằng <strong>60% mức lương bình quân 6 tháng đóng BHTN liền kề</strong> trước khi thôi việc.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CHẾ ĐỘ THAI SẢN (MATERNITY) */}
          {activeTab === "maternity" && (
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Rules & Status */}
              <div className="lg:col-span-5 space-y-5 p-6 bg-slate-50 border border-slate-205/60 rounded-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-pink-500"/> Điều kiện hưởng & Thông tin cơ hội
                </h4>

                <div className="space-y-4">
                  <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-2.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Tình trạng hồ sơ</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${maternityResult.isEligible ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                      <span className="text-xs font-bold text-slate-700">
                        {maternityResult.isEligible ? "Đủ tiêu chuẩn đóng BHXH" : "Chưa đủ tiêu chuẩn thời gian đóng"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      {maternityResult.message}
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-2.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Lương cơ sở hiện hành</span>
                    <p className="text-sm font-extrabold text-slate-800">2,340,000 VNĐ</p>
                    <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                      Dùng để làm gốc hạch toán các khoản trợ cấp sinh một lần (Một lần hưởng bằng 02 lần mức lương cơ sở = 4,680,000 VNĐ).
                    </p>
                  </div>

                  {gender === "male" && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-amber-500" /> Lưu ý về Giới tính (Nam)
                      </span>
                      <p className="text-[11px] leading-relaxed text-amber-700 font-semibold">
                        Theo quy chế, lao động Nam không trực tiếp nghỉ sinh 6 tháng nên không hưởng lương nghỉ sinh 100%. Tuy nhiên, bạn vẫn nhận được khoản <strong>Trợ cấp một lần sinh con là 4.680.000đ</strong> nếu vợ bạn không tham gia bảo hiểm xã hội bắt buộc và bạn đã đóng BHXH từ đủ 06 tháng trở lên trong vòng 12 tháng trước sinh. Ngoài ra nam giới cũng được nghỉ từ 5 đến 14 ngày phép hưởng bảo hiểm để chăm vợ đẻ.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Outcomes */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase block mb-1">Mức hưởng bình quân tháng nghỉ sinh</span>
                  <div className="text-4xl sm:text-5xl font-black text-pink-600 tracking-tight">
                    {formatCurrency(maternityResult.monthlyMaternityBenefit)} <span className="text-xl font-bold text-pink-400">VNĐ / tháng</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Số tháng nghỉ đẻ quy định</span>
                    <strong className="text-2xl font-bold text-pink-700">06 tháng</strong>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">Tổng trợ cấp khi nghỉ sinh (6 tháng)</span>
                    <strong className="text-xl font-bold text-emerald-600">{formatCurrency(maternityResult.totalMaternityLeaveBenefit)} VNĐ</strong>
                  </div>
                </div>

                <div className="p-5 bg-pink-50/50 border border-pink-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-pink-100/50 pb-2.5 text-xs text-pink-905">
                    <span className="font-bold">Trợ cấp sinh con một lần (02 tháng lương cơ sở):</span>
                    <strong className="font-extrabold text-slate-900">{formatCurrency(maternityResult.oneTimeBirthAllowance)} VNĐ</strong>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-extrabold text-pink-850">TỔNG QUYỀN LỢI THAI SẢN ƯỚC TÍNH:</span>
                    <strong className="text-2xl font-black text-emerald-600">{formatCurrency(maternityResult.totalMaternityAmount)} VNĐ</strong>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl">
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    <strong>Tóm lược quyền lợi Thai sản (Nữ):</strong> Lao động Nữ sinh con được hưởng chế độ thai sản khi đóng BHXH từ đủ **06 tháng trở lên** trong thời gian 12 tháng trước khi sinh con. Trong thời gian nghỉ sinh **06 tháng**, người lao động được miễn đóng BHXH hoàn toàn và thời gian này vẫn được tính tính vào thâm niên tích luỹ nhận hưu trí hay BHXH rút 1 lần.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'save' ? "Lưu hồ sơ cá nhân" : "Tải hồ sơ cá nhân"}
        message={
          confirmModal.type === 'save' 
            ? "Bạn có chắc chắn muốn lưu đè dữ liệu hiện tại lên hồ sơ Cá nhân không?" 
            : "Bạn có chắc chắn muốn tải dữ liệu từ hồ sơ Cá nhân? Việc này sẽ ghi đè dữ liệu đang hiển thị."
        }
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

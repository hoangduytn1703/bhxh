import { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getDisplayName, getProfileBirthYear } from '../lib/userProfile';
import { cn } from '../lib/utils';

const OCCUPATIONS = [
  'Công nhân / Lao động phổ thông',
  'Kỹ sư / Kỹ thuật viên',
  'Giáo viên / Giảng viên',
  'Nhân viên văn phòng',
  'Kế toán / Tài chính',
  'Y tế / Bác sĩ / Điều dưỡng',
  'IT / Công nghệ thông tin',
  'Kinh doanh / Buôn bán',
  'Nông dân',
  'Lái xe / Vận tải',
  'Công chức / Viên chức nhà nước',
  'Luật sư / Pháp lý',
  'Tự kinh doanh / Freelance',
  'Sinh viên',
  'Hưu trí',
  'Nội trợ',
  'Khác',
];

const CATEGORIES = [
  { value: 'bhxh_formula', label: 'Công thức tính BHXH một lần chưa đúng / thiếu' },
  { value: 'bhtn_formula', label: 'Công thức tính BHTN chưa đúng / thiếu' },
  { value: 'pension_formula', label: 'Công thức tính lương hưu chưa đúng / thiếu' },
  { value: 'maternity_formula', label: 'Công thức tính thai sản chưa đúng / thiếu' },
  { value: 'outdated_law', label: 'Thông tin luật / quy định chưa cập nhật' },
  { value: 'ux_difficult', label: 'Khó nhập liệu / trải nghiệm chưa tốt' },
  { value: 'ui_bug', label: 'Lỗi hiển thị / giao diện bị sai' },
  { value: 'feature_request', label: 'Đề xuất tính năng mới' },
  { value: 'data_privacy', label: 'Câu hỏi về bảo mật dữ liệu' },
  { value: 'other', label: 'Góp ý khác' },
];

// Anti-spam: max submissions per 24h stored in localStorage
const SPAM_KEY = 'feedback_submissions';
const MAX_PER_DAY = 3;
const MIN_FILL_SECONDS = 6;

function getSubmissionCount(): number {
  try {
    const raw = localStorage.getItem(SPAM_KEY);
    if (!raw) return 0;
    const entries: number[] = JSON.parse(raw);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = entries.filter((ts) => ts > dayAgo);
    localStorage.setItem(SPAM_KEY, JSON.stringify(recent));
    return recent.length;
  } catch {
    return 0;
  }
}

function recordSubmission() {
  try {
    const raw = localStorage.getItem(SPAM_KEY);
    const entries: number[] = raw ? JSON.parse(raw) : [];
    entries.push(Date.now());
    localStorage.setItem(SPAM_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

type FormState = {
  fullName: string;
  age: string;
  email: string;
  occupation: string;
  category: string;
  content: string;
  honeypot: string; // hidden — bots fill this
};

const emptyForm = (): FormState => ({
  fullName: '',
  age: '',
  email: '',
  occupation: '',
  category: '',
  content: '',
  honeypot: '',
});

export function FeedbackWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const openedAtRef = useRef<number | null>(null);

  // Prefill từ hồ sơ khi đã đăng nhập
  useEffect(() => {
    if (!isOpen) return;
    openedAtRef.current = Date.now();

    if (user) {
      const birthYear = getProfileBirthYear(user);
      const age = birthYear ? String(new Date().getFullYear() - birthYear) : '';
      setForm((prev) => ({
        ...prev,
        fullName: getDisplayName(user) || prev.fullName,
        email: user.email || prev.email,
        age: age || prev.age,
      }));
    }
  }, [isOpen, user]);

  const handleOpen = () => {
    setSubmitted(false);
    setServerError('');
    setErrors({});
    setForm(emptyForm());
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const patch = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.fullName.trim()) next.fullName = 'Vui lòng nhập họ tên.';
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 10 || Number(form.age) > 100)) {
      next.age = 'Tuổi không hợp lệ (10–100).';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Email không đúng định dạng.';
    }
    if (!form.category) next.category = 'Vui lòng chọn loại góp ý.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check — nếu bot điền trường ẩn, từ chối
    if (form.honeypot) return;

    // Time gate — chống submit quá nhanh
    const elapsed = openedAtRef.current
      ? (Date.now() - openedAtRef.current) / 1000
      : MIN_FILL_SECONDS;
    if (elapsed < MIN_FILL_SECONDS) {
      setServerError('Vui lòng dành thêm vài giây để hoàn thành biểu mẫu.');
      return;
    }

    // Rate limit
    if (getSubmissionCount() >= MAX_PER_DAY) {
      setServerError(`Bạn đã gửi quá ${MAX_PER_DAY} góp ý trong 24 giờ. Vui lòng thử lại sau.`);
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const { error } = await (supabase.from('feedback') as any).insert({
        user_id: user?.id ?? null,
        full_name: form.fullName.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        email: form.email.trim() || null,
        occupation: form.occupation || null,
        category: form.category,
        content: form.content.trim() || null,
      });

      if (error) throw error;

      recordSubmission();
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg cursor-pointer transition-all duration-200',
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold',
          'hover:shadow-blue-300/50 hover:shadow-xl hover:scale-105 active:scale-95',
          isOpen && 'opacity-0 pointer-events-none'
        )}
        aria-label="Mở hộp thư góp ý"
      >
        <MessageSquarePlus className="w-4 h-4 shrink-0" />
        <span>Góp ý</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={handleClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-full max-w-md transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
        )}
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageSquarePlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Hộp thư góp ý</h2>
                <p className="text-[10px] text-blue-100 font-medium">Giúp chúng tôi cải thiện dịch vụ</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {submitted ? (
              <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 mb-1">Cảm ơn bạn!</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Góp ý của bạn đã được ghi nhận. Chúng tôi sẽ xem xét và cải thiện trong thời gian sớm nhất.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
                {/* Honeypot — ẩn hoàn toàn, bot sẽ điền nhưng user thật sẽ không thấy */}
                <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" aria-hidden>
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={patch('honeypot')}
                  />
                </div>

                {/* Họ tên */}
                <Field label="Họ và tên" required error={errors.fullName}>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.fullName}
                    onChange={patch('fullName')}
                    className={inputCls(!!errors.fullName)}
                  />
                </Field>

                {/* Tuổi + Email — 2 cột */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tuổi" error={errors.age}>
                    <input
                      type="number"
                      placeholder="30"
                      min={10}
                      max={100}
                      value={form.age}
                      onChange={patch('age')}
                      className={inputCls(!!errors.age)}
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={patch('email')}
                      className={inputCls(!!errors.email)}
                    />
                  </Field>
                </div>

                {/* Nghề nghiệp */}
                <Field label="Nghề nghiệp">
                  <div className="relative">
                    <select
                      value={form.occupation}
                      onChange={patch('occupation')}
                      className={cn(inputCls(false), 'appearance-none pr-8')}
                    >
                      <option value="">-- Chọn nghề nghiệp --</option>
                      {OCCUPATIONS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                {/* Loại góp ý */}
                <Field label="Loại góp ý" required error={errors.category}>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={patch('category')}
                      className={cn(inputCls(!!errors.category), 'appearance-none pr-8')}
                    >
                      <option value="">-- Chọn loại góp ý --</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                {/* Nội dung */}
                <Field label="Nội dung chi tiết">
                  <textarea
                    placeholder="Mô tả cụ thể vấn đề hoặc đề xuất của bạn (không bắt buộc)..."
                    rows={3}
                    value={form.content}
                    onChange={patch('content')}
                    className={cn(inputCls(false), 'resize-none')}
                  />
                </Field>

                {/* Server error */}
                {serverError && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {serverError}
                  </p>
                )}

                {/* Đã login */}
                {user && (
                  <p className="text-[11px] text-slate-400 font-medium">
                    Thông tin đã được điền từ hồ sơ của bạn.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Gửi góp ý
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper sub-component
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm font-medium rounded-xl border outline-none transition-all',
    'bg-slate-50 hover:bg-white focus:bg-white',
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
      : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
  );
}

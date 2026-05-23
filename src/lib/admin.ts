import type { User } from '@supabase/supabase-js';

export const ADMIN_USERNAME = 'admin';
export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() ||
  'admin@tinh-bhxh.local';

export type MemberRole = 'member' | 'admin' | 'vip';
export type MemberStatus = 'active' | 'banned';
export type FeedbackStatus = 'new' | 'viewed' | 'in_progress' | 'resolved';

export type MemberProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_year: number | null;
  gender: 'male' | 'female' | null;
  role: MemberRole;
  status: MemberStatus;
  is_vip: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  age: number | null;
  email: string | null;
  occupation: string | null;
  category: string;
  content: string | null;
  status: FeedbackStatus;
  is_highlighted: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export function isAdminEmail(user: User | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isAdminProfile(profile: MemberProfile | null | undefined): boolean {
  return profile?.role === 'admin';
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Mới',
  viewed: 'Đã xem',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xử lý',
};

export const FEEDBACK_STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  viewed: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  bhxh_formula: 'Công thức BHXH một lần',
  bhtn_formula: 'Công thức BHTN',
  pension_formula: 'Công thức lương hưu',
  maternity_formula: 'Công thức thai sản',
  outdated_law: 'Luật chưa cập nhật',
  ux_difficult: 'Khó nhập liệu / UX',
  ui_bug: 'Lỗi giao diện',
  feature_request: 'Đề xuất tính năng',
  data_privacy: 'Bảo mật dữ liệu',
  other: 'Khác',
};

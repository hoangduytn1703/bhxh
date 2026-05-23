import type { User } from '@supabase/supabase-js';

export type ProfileGender = 'male' | 'female';

export function getDisplayName(user: User | null | undefined): string {
  if (!user) return '';
  const name = user.user_metadata?.full_name?.trim();
  if (name) return name;
  return user.email?.split('@')[0] ?? 'Người dùng';
}

export function getAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null;
  const url = user.user_metadata?.avatar_url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function getProfileGender(user: User | null | undefined): ProfileGender | null {
  if (!user) return null;
  const gender = user.user_metadata?.gender;
  return gender === 'male' || gender === 'female' ? gender : null;
}

export function getProfileBirthYear(user: User | null | undefined): number | null {
  if (!user) return null;
  const birthday = user.user_metadata?.birthday;
  if (!birthday || typeof birthday !== 'string') return null;

  const isoMatch = birthday.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    return year >= 1940 && year <= 2015 ? year : null;
  }

  const year = new Date(birthday).getFullYear();
  return Number.isFinite(year) && year >= 1940 && year <= 2015 ? year : null;
}

/** Giới tính & năm sinh từ hồ sơ — ưu tiên hơn dữ liệu cloud khi mở dashboard */
export function mergeProfileDemographics<T extends { gender?: string; birthYear?: number }>(
  user: User | null | undefined,
  data: T
): T & { gender: ProfileGender | string; birthYear: number } {
  const profileGender = getProfileGender(user);
  const profileBirthYear = getProfileBirthYear(user);
  return {
    ...data,
    gender: profileGender ?? data.gender ?? 'male',
    birthYear: profileBirthYear ?? data.birthYear ?? 1990,
  };
}

export function hasProfileDemographics(user: User | null | undefined): boolean {
  return getProfileGender(user) !== null && getProfileBirthYear(user) !== null;
}

export async function resizeImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể xử lý ảnh.');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.85);
}

import { supabase } from './supabase';
import type { ProfileGender } from './userProfile';

export function parseBirthYearFromBirthday(birthday: string): number | null {
  if (!birthday?.trim()) return null;
  const isoMatch = birthday.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    return year >= 1940 && year <= 2015 ? year : null;
  }
  const year = new Date(birthday).getFullYear();
  return Number.isFinite(year) && year >= 1940 && year <= 2015 ? year : null;
}

export type PublicProfileForm = {
  fullName: string;
  phone: string;
  gender: ProfileGender | '';
  birthday: string;
};

/**
 * Mirror auth user_metadata into public.profiles for admin list & reports.
 * Uses UPDATE only (row exists from trigger on signup).
 * Silently ignores errors so ProfilePage save still succeeds.
 */
export async function syncPublicProfileFromForm(
  userId: string,
  form: PublicProfileForm
): Promise<void> {
  await (supabase.from('profiles') as any)
    .update({
      full_name: form.fullName.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender || null,
      birth_year: parseBirthYearFromBirthday(form.birthday),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  // Intentionally ignore error — profile sync is best-effort, not blocking
}

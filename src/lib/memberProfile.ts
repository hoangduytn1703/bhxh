import { supabase } from './supabase';
import type { MemberProfile } from './admin';

export type FetchProfileResult = {
  profile: MemberProfile | null;
  errorMessage?: string;
};

export async function fetchMemberProfile(userId: string): Promise<MemberProfile | null> {
  const { profile } = await fetchMemberProfileDetailed(userId);
  return profile;
}

export async function fetchMemberProfileDetailed(userId: string): Promise<FetchProfileResult> {
  const { data, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { profile: null, errorMessage: error.message };
  }
  return { profile: (data as MemberProfile) ?? null };
}

/** Avoid hanging forever on network / RLS issues */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} quá thời gian (${ms / 1000}s).`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

import { supabase } from './supabase';
import type { ContributionPeriod } from '../types';

export type WorkspaceData = {
  gender: 'male' | 'female';
  birthYear: number;
  isWorking: 'true' | 'false';
  quitDate: string;
  continueContributionUntilYear: number;
  hasApplied: 'true' | 'false';
  periods: ContributionPeriod[];
};

const defaultWorkspace = (): WorkspaceData => ({
  gender: 'male',
  birthYear: 1990,
  isWorking: 'true',
  quitDate: new Date().toISOString().split('T')[0],
  continueContributionUntilYear: 2045,
  hasApplied: 'false',
  periods: [],
});

export async function loadWorkspace(userId: string): Promise<WorkspaceData | null> {
  const { data, error } = await (supabase.from('user_records') as any)
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data?.data) return null;
  return { ...defaultWorkspace(), ...data.data };
}

export async function saveWorkspace(userId: string, data: WorkspaceData): Promise<void> {
  const { error } = await (supabase.from('user_records') as any).upsert(
    {
      user_id: userId,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function saveWorkspacePeriods(
  userId: string,
  periods: ContributionPeriod[]
): Promise<void> {
  const existing = (await loadWorkspace(userId)) ?? defaultWorkspace();
  await saveWorkspace(userId, { ...existing, periods });
}

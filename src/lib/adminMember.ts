import type { MemberProfile } from './admin';
import { fetchMemberProfile } from './memberProfile';
import { loadWorkspace, type WorkspaceData } from './userRecords';

export type MemberDetail = {
  profile: MemberProfile;
  workspace: WorkspaceData | null;
};

export function getMemberDisplayName(member: Pick<MemberProfile, 'full_name' | 'email'>): string {
  const name = member.full_name?.trim();
  if (name) return name;
  if (member.email) return member.email.split('@')[0];
  return 'Chưa cập nhật tên';
}

export async function loadMemberDetail(userId: string): Promise<MemberDetail | null> {
  const profile = await fetchMemberProfile(userId);
  if (!profile) return null;

  let workspace: WorkspaceData | null = null;
  try {
    workspace = await loadWorkspace(userId);
  } catch {
    workspace = null;
  }

  return { profile, workspace };
}

export function formatPeriodRange(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number
): string {
  const pad = (m: number) => (m < 10 ? `0${m}` : String(m));
  return `${pad(startMonth)}/${startYear} – ${pad(endMonth)}/${endYear}`;
}

export const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  mandatory: 'Bắt buộc',
  voluntary: 'Tự nguyện',
  maternity: 'Thai sản',
};

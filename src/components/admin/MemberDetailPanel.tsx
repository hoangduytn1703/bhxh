import { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  Mail,
  Phone,
  Calendar,
  User,
  Crown,
  Ban,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import type { MemberProfile } from '../../lib/admin';
import {
  loadMemberDetail,
  getMemberDisplayName,
  formatPeriodRange,
  CONTRIBUTION_TYPE_LABELS,
  type MemberDetail,
} from '../../lib/adminMember';
import { formatNumberWithCommas } from '../../lib/periodUtils';
import { cn } from '../../lib/utils';
import { MemberBenefitsSummary } from './MemberBenefitsSummary';

type Props = {
  member: MemberProfile;
  onClose: () => void;
};

export function MemberDetailPanel({ member, onClose }: Props) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    loadMemberDetail(member.id).then((result) => {
      if (cancelled) return;
      if (!result) {
        setError('Không tải được hồ sơ thành viên.');
      } else {
        setDetail(result);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const workspace = detail?.workspace;
  const periods = workspace?.periods ?? [];
  const profile = detail?.profile ?? member;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-80px)] sticky top-6 min-h-[520px]">
      <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            {getMemberDisplayName(profile)}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">ID: {profile.id.slice(0, 8)}…</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Thông tin cá nhân
              </h3>
              <dl className="grid gap-2 text-sm">
                <InfoRow icon={Mail} label="Email" value={profile.email || '—'} />
                <InfoRow icon={Phone} label="SĐT" value={profile.phone || '—'} />
                <InfoRow
                  icon={User}
                  label="Giới tính"
                  value={
                    profile.gender === 'male'
                      ? 'Nam'
                      : profile.gender === 'female'
                        ? 'Nữ'
                        : '—'
                  }
                />
                <InfoRow
                  icon={Calendar}
                  label="Năm sinh"
                  value={profile.birth_year ? String(profile.birth_year) : '—'}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Tham gia"
                  value={new Date(profile.created_at).toLocaleString('vi-VN')}
                />
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                <span
                  className={cn(
                    'inline-flex px-2 py-0.5 rounded-lg text-xs font-bold border',
                    profile.status === 'banned'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  )}
                >
                  {profile.status === 'banned' ? 'Đã ban' : 'Hoạt động'}
                </span>
                {profile.is_vip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Crown className="w-3 h-3" /> VIP
                  </span>
                )}
              </div>
              {profile.ban_reason && (
                <p className="text-xs text-red-600 flex items-start gap-1">
                  <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {profile.ban_reason}
                </p>
              )}
            </section>

            <MemberBenefitsSummary workspace={workspace} memberGender={profile.gender} />

            <section className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Quá trình đóng BHXH
              </h3>
              {periods.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Chưa có quá trình đóng trên cloud
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-3 py-2 font-bold text-slate-500">Từ – Đến</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Lương</th>
                        <th className="px-3 py-2 font-bold text-slate-500">Loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {periods.map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                            {formatPeriodRange(
                              p.startMonth,
                              p.startYear,
                              p.endMonth,
                              p.endYear
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {p.contributionType === 'maternity'
                              ? '—'
                              : `${formatNumberWithCommas(p.salary)} đ`}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {CONTRIBUTION_TYPE_LABELS[p.contributionType] || p.contributionType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {!workspace && !error && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Không đọc được user_records. Chạy sql/admin_user_records_policy.sql trên Supabase.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
      <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
      <div>
        <dt className="text-[10px] font-bold text-slate-500 uppercase">{label}</dt>
        <dd className="text-slate-800 font-semibold break-all">{value}</dd>
      </div>
    </div>
  );
}

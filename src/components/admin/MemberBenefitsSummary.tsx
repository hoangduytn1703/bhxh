import { useMemo } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';
import type { WorkspaceData } from '../../lib/userRecords';
import {
  calculateFromWorkspace,
  formatVnd,
  type WorkspaceCalculationResult,
} from '../../lib/workspaceCalculations';
import { cn } from '../../lib/utils';

type Props = {
  workspace: WorkspaceData | null;
  memberGender?: 'male' | 'female' | null;
};

function BenefitCard({
  title,
  accent,
  amount,
  amountSuffix,
  rows,
  note,
  defaultOpen,
}: {
  title: string;
  accent: string;
  amount: string;
  amountSuffix?: string;
  rows: { label: string; value: string }[];
  note?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border border-slate-200 rounded-xl bg-white overflow-hidden"
    >
      <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-slate-50">
        <span className={cn('w-1 h-8 rounded-full shrink-0', accent)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-slate-800">{title}</p>
          <p className="text-sm font-black text-slate-900 truncate">
            {amount}
            {amountSuffix && (
              <span className="text-[10px] font-bold text-slate-500 ml-1">{amountSuffix}</span>
            )}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-2">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-slate-500 font-semibold">{row.label}</dt>
              <dd className="text-slate-800 font-bold text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
        {note && (
          <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-50 pt-2">
            {note}
          </p>
        )}
      </div>
    </details>
  );
}

function buildSummary(
  workspace: WorkspaceData,
  memberGender?: 'male' | 'female' | null
): WorkspaceCalculationResult {
  const merged: WorkspaceData = {
    ...workspace,
    gender: workspace.gender || memberGender || 'male',
  };
  return calculateFromWorkspace(merged);
}

export function MemberBenefitsSummary({ workspace, memberGender }: Props) {
  const calc = useMemo(() => {
    if (!workspace) return null;
    return buildSummary(workspace, memberGender);
  }, [workspace, memberGender]);

  if (!workspace) {
    return (
      <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        Chưa có dữ liệu workspace trên cloud để tính toán.
      </p>
    );
  }

  if (!calc) return null;

  const { bhxhResult, pensionResult, bhtnResult, maternityResult } = calc;
  const gender = workspace.gender || memberGender || 'male';
  const quitLabel = workspace.quitDate
    ? new Date(workspace.quitDate).toLocaleDateString('vi-VN')
    : '—';

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-blue-600" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Ước tính quyền lợi BHXH (chỉ xem)
        </h3>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed px-1">
        Tính từ dữ liệu cloud · Nghỉ việc {quitLabel} ·{' '}
        {workspace.isWorking === 'true' ? 'Đang làm việc' : 'Đã nghỉ'} ·{' '}
        {workspace.periods?.length ?? 0} kỳ đóng · Lương BQ{' '}
        {formatVnd(calc.averageSalaryForPension)}
      </p>

      <div className="space-y-2">
        <BenefitCard
          title="BHXH một lần"
          accent="bg-amber-500"
          amount={formatVnd(bhxhResult.totalAmount)}
          rows={[
            { label: 'Thời gian đóng', value: `${bhxhResult.totalMonths} tháng (${bhxhResult.totalYears} năm)` },
            {
              label: 'Điều kiện',
              value: bhxhResult.isEligible ? 'Đủ (ước tính)' : 'Chưa đủ / tham khảo',
            },
            { label: 'Tổng tháng hệ thống', value: `${calc.totalMonths} tháng` },
          ]}
          note={bhxhResult.message}
          defaultOpen
        />

        <BenefitCard
          title="Lương hưu"
          accent="bg-emerald-500"
          amount={formatVnd(pensionResult.monthlyPension)}
          amountSuffix="/ tháng"
          rows={[
            { label: 'Tỷ lệ hưởng', value: `${pensionResult.pensionRate}%` },
            {
              label: 'Năm đóng dự kiến',
              value: `${pensionResult.totalYearsEstimated} năm`,
            },
            {
              label: 'Tuổi hưu (lý thuyết)',
              value: `${pensionResult.retirementAge.years}t${pensionResult.retirementAge.months > 0 ? ` ${pensionResult.retirementAge.months}th` : ''}`,
            },
            { label: 'Đóng đến năm', value: String(workspace.continueContributionUntilYear) },
          ]}
          note={pensionResult.message}
        />

        <BenefitCard
          title="BHTN"
          accent="bg-blue-500"
          amount={formatVnd(bhtnResult.monthlyAmount)}
          amountSuffix="/ tháng"
          rows={[
            { label: 'Số tháng hưởng', value: `${bhtnResult.eligibleMonths} tháng` },
            { label: 'Tổng trợ cấp', value: formatVnd(bhtnResult.totalAmount) },
            {
              label: 'Hạn nộp hồ sơ',
              value: bhtnResult.deadlineDate.toLocaleDateString('vi-VN'),
            },
            {
              label: 'Đã nộp hồ sơ',
              value: workspace.hasApplied === 'true' ? 'Có' : 'Chưa',
            },
            {
              label: 'Điều kiện',
              value: bhtnResult.isEligible ? 'Đủ (ước tính)' : 'Chưa đủ / tham khảo',
            },
          ]}
          note={bhtnResult.message}
        />

        <BenefitCard
          title="Thai sản"
          accent="bg-pink-500"
          amount={formatVnd(maternityResult.totalMaternityAmount)}
          rows={[
            {
              label: 'Trợ cấp 6 tháng',
              value: formatVnd(maternityResult.totalMaternityLeaveBenefit),
            },
            {
              label: 'Lương tháng (BQ)',
              value: formatVnd(maternityResult.monthlyMaternityBenefit),
            },
            ...(gender === 'female'
              ? [
                  {
                    label: 'Trợ cấp sinh (1 lần)',
                    value: formatVnd(maternityResult.oneTimeBirthAllowance),
                  },
                ]
              : []),
            {
              label: 'Điều kiện',
              value: maternityResult.isEligible ? 'Đủ 6+ tháng' : 'Chưa đủ',
            },
          ]}
          note={maternityResult.message}
        />
      </div>

      <p className="text-[9px] text-slate-400 px-1">
        Số liệu tự tính từ quá trình đóng trên cloud — cùng công thức với dashboard user. Admin không
        chỉnh sửa được.
      </p>
    </section>
  );
}

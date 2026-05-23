import { ContributionPeriod } from '../types';
import { RULES } from '../config/socialInsuranceRules';

export type BhxhIneligibilityReasonId =
  | 'over_20_years'
  | 'still_working'
  | 'quit_less_than_one_year';

export type BhxhIneligibilityReason = {
  id: BhxhIneligibilityReasonId;
  title: string;
  detail: string;
};

export type BhxhOneTimeResult = {
  totalMonths: number;
  totalYears: number;
  totalAmount: number;
  isEligible: boolean;
  /** Sorted: 20+ years first, then still working, then quit < 1 year */
  ineligibilityReasons: BhxhIneligibilityReason[];
  statusLabel: string;
  message: string;
};

const REFERENCE_NOTE =
  'Số tiền bên trên vẫn được tính đầy đủ để bạn tham khảo và dự báo.';

function formatDateVi(d: Date): string {
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function calculateBhxhOneTime(
  periods: ContributionPeriod[],
  quitDate: Date,
  isWorking: boolean
): BhxhOneTimeResult {
  let totalMonths = 0;
  let totalAmount = 0;
  periods.forEach((p) => {
    const months = (p.endYear - p.startYear) * 12 + (p.endMonth - p.startMonth) + 1;
    totalMonths += months;
    const multiplier =
      p.startYear >= 2014 ? RULES.MULTIPLIER_FROM_2014 : RULES.MULTIPLIER_BEFORE_2014;
    const amountForPeriod = (months / 12) * p.salary * multiplier;
    totalAmount += amountForPeriod;
  });

  const totalYears = Number((totalMonths / 12).toFixed(2));
  const today = new Date();
  const oneYearAfterQuit = new Date(quitDate);
  oneYearAfterQuit.setFullYear(oneYearAfterQuit.getFullYear() + 1);

  const ineligibilityReasons: BhxhIneligibilityReason[] = [];

  // Priority 1: 20+ years of contributions
  if (totalMonths >= 240) {
    ineligibilityReasons.push({
      id: 'over_20_years',
      title: 'Đã đóng BHXH từ 20 năm trở lên',
      detail: `Tổng ${totalYears} năm (${totalMonths} tháng). Không thuộc diện rút BHXH một lần — hướng tới chế độ lương hưu theo quy định.`,
    });
  }

  // Priority 2: still working / still contributing
  if (isWorking) {
    ineligibilityReasons.push({
      id: 'still_working',
      title: 'Còn đang đóng BHXH (chưa thôi việc)',
      detail:
        'Chế độ một lần chỉ xét khi đã chấm dứt hợp đồng lao động và không còn đóng BHXH bắt buộc.',
    });
  }

  // Priority 3: quit less than 1 year
  if (!isWorking && today < oneYearAfterQuit) {
    ineligibilityReasons.push({
      id: 'quit_less_than_one_year',
      title: 'Chưa nghỉ việc đủ 1 năm',
      detail: `Theo ngày thôi việc đã nhập, có thể nộp hồ sơ từ khoảng ${formatDateVi(oneYearAfterQuit)} trở đi (ước tính).`,
    });
  }

  const isEligible = ineligibilityReasons.length === 0;

  let statusLabel: string;
  if (isEligible) {
    statusLabel = 'Được duyệt ngay';
  } else if (ineligibilityReasons[0]?.id === 'over_20_years') {
    statusLabel = 'Hướng hưu trí';
  } else if (ineligibilityReasons[0]?.id === 'still_working') {
    statusLabel = 'Đang đóng BHXH';
  } else {
    statusLabel = 'Chờ đủ 1 năm';
  }

  const message = isEligible
    ? 'Bạn đủ điều kiện nhận BHXH 1 lần (ước tính theo quy định chung).'
    : REFERENCE_NOTE;

  return {
    totalMonths,
    totalYears,
    totalAmount: Math.round(totalAmount),
    isEligible,
    ineligibilityReasons,
    statusLabel,
    message,
  };
}

export function formatBhxhIneligibilityNote(result: BhxhOneTimeResult): string {
  if (result.isEligible) return result.message;
  const lines = result.ineligibilityReasons.map((r) => `• ${r.title}: ${r.detail}`);
  lines.push(result.message);
  return lines.join('\n');
}

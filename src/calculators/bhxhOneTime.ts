import { ContributionPeriod } from '../types';
import { RULES } from '../config/socialInsuranceRules';

export type BhxhOneTimeResult = {
  totalMonths: number;
  totalYears: number;
  totalAmount: number;
  isEligible: boolean;
  message: string;
};

export function calculateBhxhOneTime(
  periods: ContributionPeriod[],
  quitDate: Date,
  isWorking: boolean
): BhxhOneTimeResult {
  let totalMonths = 0;
  let totalAmount = 0;
  periods.forEach(p => {
    const months = (p.endYear - p.startYear) * 12 + (p.endMonth - p.startMonth) + 1;
    totalMonths += months;
    const multiplier = p.startYear >= 2014 ? RULES.MULTIPLIER_FROM_2014 : RULES.MULTIPLIER_BEFORE_2014;
    const amountForPeriod = (months / 12) * p.salary * multiplier;
    totalAmount += amountForPeriod;
  });
  const totalYears = totalMonths / 12;
  const today = new Date();
  const oneYearAfterQuit = new Date(quitDate);
  oneYearAfterQuit.setFullYear(oneYearAfterQuit.getFullYear() + 1);
  let isEligible = true;
  let message = 'Bạn đủ điều kiện nhận BHXH 1 lần (ước tính theo quy định chung).';

  if (isWorking) {
    isEligible = false;
    message = 'Bạn đang đóng BHXH (chưa đủ điều kiện nhận thực tế). Hệ thống vẫn tính toán đầy đủ mức nhận ước tính để bạn tham khảo dự báo số tiền có thể nhận.';
  } else if (totalMonths >= 240) {
    isEligible = false;
    message = 'Bạn đã đóng BHXH từ đủ 20 năm trở lên, theo quy định bạn KHÔNG thuộc diện rút BHXH 1 lần mà sẽ hưởng chế độ Hưu Trí. Việc tính toán dưới đây chỉ mang tính chất tham khảo.';
  } else if (today < oneYearAfterQuit) {
    isEligible = false;
    message = 'Bạn chưa nghỉ đủ 1 năm (chưa đủ điều kiện nhận thực tế). Hệ thống vẫn tính toán đầy đủ mức nhận ước tính để bạn tham khảo dự báo số tiền có thể nhận.';
  }
  return { totalMonths, totalYears: Number(totalYears.toFixed(2)), totalAmount: Math.round(totalAmount), isEligible, message };
}

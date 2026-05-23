import { RULES } from '../config/socialInsuranceRules';

export type PensionResult = {
  retirementAge: { years: number; months: number };
  totalYearsEstimated: number;
  pensionRate: number;
  monthlyPension: number;
  message: string;
};

export function calculatePension(
  gender: 'male' | 'female',
  birthYear: number,
  totalYearsContributed: number,
  continueContributionUntilYear: number,
  averageSalary: number
): PensionResult {
  const currentYear = new Date().getFullYear();
  let retirementAge = gender === 'male' ? { ...RULES.RETIREMENT_AGE_MALE_2024 } : { ...RULES.RETIREMENT_AGE_FEMALE_2024 };
  const additionalYears = Math.max(0, continueContributionUntilYear - currentYear);
  const totalYearsEstimated = totalYearsContributed + additionalYears;
  let rate = 0;
  if (gender === 'female') {
    if (totalYearsEstimated >= 15) rate = 45 + (totalYearsEstimated - 15) * 2;
    else rate = totalYearsEstimated * 3;
  } else {
    if (totalYearsEstimated >= 20) rate = 45 + (totalYearsEstimated - 20) * 2;
    else rate = totalYearsEstimated * 2.25;
  }
  const pensionRate = Math.min(rate, RULES.MAX_PENSION_RATE);
  const monthlyPension = (pensionRate / 100) * averageSalary;
  let message = totalYearsEstimated < 20 
    ? "Thời gian đóng tích lũy của bạn chưa đạt mức tối thiểu 20 năm (chưa đủ điều kiện hưởng lương hưu thực tế). Hệ thống vẫn dự đoán tỷ lệ hưu trí lý thuyết và số tiền nhận để bạn làm mục tiêu phấn đấu." 
    : "Bạn đã đạt số năm đóng tích lũy tối thiểu để hưởng lương hưu theo quy định.";
  return { retirementAge, totalYearsEstimated, pensionRate, monthlyPension: Math.round(monthlyPension), message };
}

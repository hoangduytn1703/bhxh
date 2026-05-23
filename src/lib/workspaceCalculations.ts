import { calculateBhxhOneTime } from '../calculators/bhxhOneTime';
import { calculatePension } from '../calculators/pension';
import { calculateUnemployment } from '../calculators/unemployment';
import type { ContributionPeriod } from '../types';
import type { WorkspaceData } from './userRecords';

export type MaternitySummary = {
  isEligible: boolean;
  averageSalaryForThaiSan: number;
  monthlyMaternityBenefit: number;
  totalMaternityLeaveBenefit: number;
  oneTimeBirthAllowance: number;
  totalMaternityAmount: number;
  message: string;
};

export type WorkspaceCalculationResult = {
  totalMonths: number;
  totalYearsContributed: number;
  averageSalaryForPension: number;
  bhxhResult: ReturnType<typeof calculateBhxhOneTime>;
  pensionResult: ReturnType<typeof calculatePension>;
  bhtnResult: ReturnType<typeof calculateUnemployment>;
  maternityResult: MaternitySummary;
};

export type WorkspaceCalculationInputs = {
  gender: 'male' | 'female';
  birthYear: number;
  isWorking: string;
  quitDate: string;
  continueContributionUntilYear: number;
  hasApplied: string;
  periods: ContributionPeriod[];
};

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`;
}

export function calculateWorkspaceResults(
  inputs: WorkspaceCalculationInputs
): WorkspaceCalculationResult {
  const {
    gender,
    birthYear,
    isWorking,
    quitDate,
    continueContributionUntilYear,
    hasApplied,
    periods,
  } = inputs;
  const dateOfQuit = quitDate ? new Date(quitDate) : new Date();
  const safePeriods = periods || [];

  const bhxhResult = calculateBhxhOneTime(
    safePeriods,
    dateOfQuit,
    isWorking === 'true'
  );

  let totalMonths = 0;
  let totalPaidMonths = 0;
  let totalWeighedSalary = 0;

  safePeriods.forEach((p) => {
    const months = (p.endYear - p.startYear) * 12 + (p.endMonth - p.startMonth) + 1;
    totalMonths += months;
    if (p.contributionType !== 'maternity') {
      totalPaidMonths += months;
      totalWeighedSalary += months * (p.salary || 0);
    }
  });

  const totalYearsContributed = Math.floor(totalMonths / 12);
  const averageSalaryForPension =
    totalPaidMonths > 0 ? Math.round(totalWeighedSalary / totalPaidMonths) : 0;

  const pensionResult = calculatePension(
    gender,
    birthYear,
    totalYearsContributed,
    continueContributionUntilYear,
    averageSalaryForPension
  );

  const sortedPeriodsForUnemployment = [...safePeriods].sort((a, b) => {
    const aEnd = (a.endYear || 0) * 12 + (a.endMonth || 0);
    const bEnd = (b.endYear || 0) * 12 + (b.endMonth || 0);
    return bEnd - aEnd;
  });
  const latestSalaryForUnemployment = sortedPeriodsForUnemployment[0]?.salary || 10_000_000;

  const bhtnResult = calculateUnemployment(
    totalMonths,
    latestSalaryForUnemployment,
    dateOfQuit,
    hasApplied === 'true'
  );

  const averageSalaryForThaiSan = averageSalaryForPension || 6_000_000;
  const isEligibleMaternity = totalMonths >= 6;
  const monthlyMaternityBenefit = averageSalaryForThaiSan;
  const totalMaternityLeaveBenefit = monthlyMaternityBenefit * 6;
  const oneTimeBirthAllowance = 4_680_000;
  const totalMaternityAmount =
    totalMaternityLeaveBenefit + (gender === 'female' ? oneTimeBirthAllowance : 0);

  const maternityResult: MaternitySummary = {
    isEligible: isEligibleMaternity,
    averageSalaryForThaiSan,
    monthlyMaternityBenefit,
    totalMaternityLeaveBenefit,
    oneTimeBirthAllowance,
    totalMaternityAmount,
    message: isEligibleMaternity
      ? 'Đủ điều kiện hưởng chế độ thai sản (ước tính).'
      : 'Chưa đủ 6 tháng đóng BHXH để hưởng thai sản.',
  };

  return {
    totalMonths,
    totalYearsContributed,
    averageSalaryForPension,
    bhxhResult,
    pensionResult,
    bhtnResult,
    maternityResult,
  };
}

export function calculateFromWorkspace(workspace: WorkspaceData): WorkspaceCalculationResult {
  return calculateWorkspaceResults({
    gender: workspace.gender,
    birthYear: workspace.birthYear,
    isWorking: workspace.isWorking,
    quitDate: workspace.quitDate,
    continueContributionUntilYear: workspace.continueContributionUntilYear,
    hasApplied: workspace.hasApplied,
    periods: workspace.periods ?? [],
  });
}

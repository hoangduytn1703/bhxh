import type { ContributionPeriod } from '../types';

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
export const YEAR_OPTIONS = Array.from({ length: 61 }, (_, i) => 2050 - i);

/** Sortable key for YYYY-MM (month-level comparison). */
export function periodMonthKey(year: number, month: number): number {
  return year * 12 + month;
}

export function isPeriodRangeValid(period: ContributionPeriod): boolean {
  return (
    periodMonthKey(period.endYear, period.endMonth) >=
    periodMonthKey(period.startYear, period.startMonth)
  );
}

/** Ensures end month/year is not before start. */
export function normalizePeriodRange(period: ContributionPeriod): ContributionPeriod {
  if (isPeriodRangeValid(period)) return period;
  return {
    ...period,
    endMonth: period.startMonth,
    endYear: period.startYear,
  };
}

/** New period: start = previous end; end >= start. */
export function createPeriodAfterPrevious(
  previous: ContributionPeriod | undefined,
  factory: () => ContributionPeriod
): ContributionPeriod {
  const base = factory();
  if (!previous) return normalizePeriodRange(base);

  const startMonth = previous.endMonth;
  const startYear = previous.endYear;
  let { endMonth, endYear, salary, contributionType } = base;

  if (
    periodMonthKey(endYear, endMonth) <
    periodMonthKey(startYear, startMonth)
  ) {
    endMonth = startMonth;
    endYear = startYear;
  }

  if (contributionType !== 'maternity' && previous.contributionType !== 'maternity') {
    salary = salary || previous.salary;
  }

  return normalizePeriodRange({
    ...base,
    startMonth,
    startYear,
    endMonth,
    endYear,
    salary,
  });
}

/** Start of current period must not be before end of previous period. */
export function isPeriodStartAfterPrevious(
  period: ContributionPeriod,
  previous: ContributionPeriod
): boolean {
  return (
    periodMonthKey(period.startYear, period.startMonth) >=
    periodMonthKey(previous.endYear, previous.endMonth)
  );
}

export function isPeriodSequenceValid(periods: ContributionPeriod[]): boolean {
  for (let i = 0; i < periods.length; i++) {
    if (!isPeriodRangeValid(periods[i])) return false;
    if (i > 0 && !isPeriodStartAfterPrevious(periods[i], periods[i - 1])) return false;
  }
  return true;
}

/** Fix each row (to >= from) and enforce chronological order across rows. */
export function normalizePeriodSequence(periods: ContributionPeriod[]): ContributionPeriod[] {
  if (periods.length === 0) return [];

  const result: ContributionPeriod[] = [normalizePeriodRange({ ...periods[0] })];

  for (let i = 1; i < periods.length; i++) {
    let p = { ...periods[i] };
    const prev = result[i - 1];

    if (!isPeriodStartAfterPrevious(p, prev)) {
      p = {
        ...p,
        startMonth: prev.endMonth,
        startYear: prev.endYear,
      };
    }

    result.push(normalizePeriodRange(p));
  }

  return result;
}

export function formatNumberWithCommas(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const cleaned = typeof value === 'string' ? value.replace(/\D/g, '') : value.toString();
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('en-US').format(num);
}

export function parseContributionPeriodsFromText(text: string): ContributionPeriod[] {
  const lines = text.split('\n');
  const parsedPeriods: ContributionPeriod[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = trimmed.replace(/\t/g, ',').replace(/;/g, ',');
    const parts = normalized.split(',').map((p) => p.trim());

    if (parts.length >= 3) {
      const start = parts[0];
      const end = parts[1];
      const salaryStr = parts.slice(2).join('');

      let startYear = 0;
      let startMonth = 0;
      let endYear = 0;
      let endMonth = 0;

      if (start.includes('-')) {
        const [y, m] = start.split('-');
        startYear = parseInt(y, 10);
        startMonth = parseInt(m, 10);
      } else if (start.includes('/')) {
        const [m, y] = start.split('/');
        startYear = parseInt(y, 10);
        startMonth = parseInt(m, 10);
      }

      if (end.includes('-')) {
        const [y, m] = end.split('-');
        endYear = parseInt(y, 10);
        endMonth = parseInt(m, 10);
      } else if (end.includes('/')) {
        const [m, y] = end.split('/');
        endYear = parseInt(y, 10);
        endMonth = parseInt(m, 10);
      }

      const salaryLower = salaryStr.toLowerCase();
      const isMaternity =
        salaryLower.includes('thai_san') ||
        salaryLower.includes('ts') ||
        salaryLower.includes('thaisan');

      const salaryValStr = salaryStr.replace(/\D/g, '');
      let salary = parseInt(salaryValStr, 10);

      if (startYear && startMonth && endYear && endMonth && (isMaternity || !isNaN(salary))) {
        parsedPeriods.push({
          startMonth,
          startYear,
          endMonth,
          endYear,
          salary: isMaternity ? 0 : salary,
          contributionType: isMaternity ? 'maternity' : 'mandatory',
        });
      }
    }
  }

  return normalizePeriodSequence(parsedPeriods);
}

export const emptyMandatoryPeriod = (): ContributionPeriod => ({
  startMonth: 1,
  startYear: 2023,
  endMonth: 12,
  endYear: 2023,
  salary: 6_000_000,
  contributionType: 'mandatory',
});

export const emptyMaternityPeriod = (): ContributionPeriod => ({
  startMonth: 1,
  startYear: 2023,
  endMonth: 12,
  endYear: 2023,
  salary: 0,
  contributionType: 'maternity',
});

function padMonth(month: number): string {
  return month < 10 ? `0${month}` : String(month);
}

/** Định dạng xuất: YYYY-MM, YYYY-MM, lương hoặc thai_san */
export function serializeContributionPeriodsToText(periods: ContributionPeriod[]): string {
  return periods
    .map((p) => {
      const start = `${p.startYear}-${padMonth(p.startMonth)}`;
      const end = `${p.endYear}-${padMonth(p.endMonth)}`;
      const third =
        p.contributionType === 'maternity'
          ? 'thai_san'
          : new Intl.NumberFormat('en-US').format(p.salary);
      return `${start}, ${end}, ${third}`;
    })
    .join('\n');
}

export function downloadContributionPeriodsTxt(
  periods: ContributionPeriod[],
  filename = 'qua-trinh-dong-bhxh.txt'
): void {
  if (periods.length === 0) return;

  const content = serializeContributionPeriodsToText(periods);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

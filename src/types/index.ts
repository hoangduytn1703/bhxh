export type ContributionPeriod = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  salary: number;
  contributionType: 'mandatory' | 'voluntary' | 'maternity';
};

export type MaternityPeriod = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

export interface AnalyticsSummary {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  terminationsThisMonth: number;
  totalPayrollCost: number;
  averagePayrollCost: number;
  attendanceRate: number;
  lateRate: number;
  pendingVacations: number;
  pendingLeaves: number;
  openRecruitments: number;
  pendingDocuments: number;
}

export interface HeadcountTrend {
  year: number;
  month: number;
  label: string;
  activeCount: number;
  hiresCount: number;
  terminationsCount: number;
}

export interface LaborCostTrend {
  year: number;
  month: number;
  label: string;
  totalCost: number;
  averageCost: number;
}

export interface AttendanceTrend {
  year: number;
  month: number;
  label: string;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercent: number;
}

export interface AreaDistribution {
  areaName: string;
  employeeCount: number;
  averageSalary: number;
  totalCost: number;
}

export interface TurnoverRisk {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  areaName: string;
  positionName: string;
  tenureMonths: number;
  incidentCount: number;
  absenceCount: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
}

export interface CostProjection {
  year: number;
  month: number;
  label: string;
  projectedCost: number;
  actualCost: number;
}

export interface YearComparison {
  metric: string;
  currentYear: number;
  previousYear: number;
  changePercent: number;
}

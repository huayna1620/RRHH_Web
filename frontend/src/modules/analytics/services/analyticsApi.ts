import { httpClient } from "@/services/api/httpClient";
import type {
  AnalyticsSummary,
  AreaDistribution,
  AttendanceTrend,
  CostProjection,
  HeadcountTrend,
  LaborCostTrend,
  TurnoverRisk,
  YearComparison,
} from "@/modules/analytics/types/analytics.types";

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await httpClient.get<AnalyticsSummary>("/api/v1/analytics/summary");
  return data;
}

export async function getHeadcountTrend(months = 12): Promise<HeadcountTrend[]> {
  const { data } = await httpClient.get<HeadcountTrend[]>(`/api/v1/analytics/headcount-trend?months=${months}`);
  return data;
}

export async function getLaborCostTrend(months = 12): Promise<LaborCostTrend[]> {
  const { data } = await httpClient.get<LaborCostTrend[]>(`/api/v1/analytics/labor-cost-trend?months=${months}`);
  return data;
}

export async function getAttendanceTrend(months = 12): Promise<AttendanceTrend[]> {
  const { data } = await httpClient.get<AttendanceTrend[]>(`/api/v1/analytics/attendance-trend?months=${months}`);
  return data;
}

export async function getAreaDistribution(): Promise<AreaDistribution[]> {
  const { data } = await httpClient.get<AreaDistribution[]>("/api/v1/analytics/area-distribution");
  return data;
}

export async function getTurnoverRisk(top = 10): Promise<TurnoverRisk[]> {
  const { data } = await httpClient.get<TurnoverRisk[]>(`/api/v1/analytics/turnover-risk?top=${top}`);
  return data;
}

export async function getCostProjection(months = 6): Promise<CostProjection[]> {
  const { data } = await httpClient.get<CostProjection[]>(`/api/v1/analytics/cost-projection?months=${months}`);
  return data;
}

export async function getYearComparison(year?: number): Promise<YearComparison[]> {
  const url = year ? `/api/v1/analytics/year-comparison?year=${year}` : "/api/v1/analytics/year-comparison";
  const { data } = await httpClient.get<YearComparison[]>(url);
  return data;
}

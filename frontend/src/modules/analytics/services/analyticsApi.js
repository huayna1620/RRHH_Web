import { httpClient } from "@/services/api/httpClient";
export async function getAnalyticsSummary() {
    const { data } = await httpClient.get("/api/v1/analytics/summary");
    return data;
}
export async function getHeadcountTrend(months = 12) {
    const { data } = await httpClient.get(`/api/v1/analytics/headcount-trend?months=${months}`);
    return data;
}
export async function getLaborCostTrend(months = 12) {
    const { data } = await httpClient.get(`/api/v1/analytics/labor-cost-trend?months=${months}`);
    return data;
}
export async function getAttendanceTrend(months = 12) {
    const { data } = await httpClient.get(`/api/v1/analytics/attendance-trend?months=${months}`);
    return data;
}
export async function getAreaDistribution() {
    const { data } = await httpClient.get("/api/v1/analytics/area-distribution");
    return data;
}
export async function getTurnoverRisk(top = 10) {
    const { data } = await httpClient.get(`/api/v1/analytics/turnover-risk?top=${top}`);
    return data;
}
export async function getCostProjection(months = 6) {
    const { data } = await httpClient.get(`/api/v1/analytics/cost-projection?months=${months}`);
    return data;
}
export async function getYearComparison(year) {
    const url = year ? `/api/v1/analytics/year-comparison?year=${year}` : "/api/v1/analytics/year-comparison";
    const { data } = await httpClient.get(url);
    return data;
}

import type { AnalyticsSummary, AreaDistribution, AttendanceTrend, CostProjection, HeadcountTrend, LaborCostTrend, TurnoverRisk, YearComparison } from "@/modules/analytics/types/analytics.types";
export declare function getAnalyticsSummary(): Promise<AnalyticsSummary>;
export declare function getHeadcountTrend(months?: number): Promise<HeadcountTrend[]>;
export declare function getLaborCostTrend(months?: number): Promise<LaborCostTrend[]>;
export declare function getAttendanceTrend(months?: number): Promise<AttendanceTrend[]>;
export declare function getAreaDistribution(): Promise<AreaDistribution[]>;
export declare function getTurnoverRisk(top?: number): Promise<TurnoverRisk[]>;
export declare function getCostProjection(months?: number): Promise<CostProjection[]>;
export declare function getYearComparison(year?: number): Promise<YearComparison[]>;

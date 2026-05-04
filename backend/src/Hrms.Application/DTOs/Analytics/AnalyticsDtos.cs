namespace Hrms.Application.DTOs.Analytics;

// ── Dashboard Summary ────────────────────────────────────────────────

public sealed record AnalyticsSummaryDto(
    int TotalEmployees,
    int ActiveEmployees,
    int NewHiresThisMonth,
    int TerminationsThisMonth,
    decimal TotalPayrollCost,
    decimal AveragePayrollCost,
    decimal AttendanceRate,
    decimal LateRate,
    int PendingVacations,
    int PendingLeaves,
    int OpenRecruitments,
    int PendingDocuments);

// ── Headcount Trend (month by month) ─────────────────────────────────

public sealed record HeadcountTrendDto(
    int Year,
    int Month,
    string Label,
    int ActiveCount,
    int HiresCount,
    int TerminationsCount);

// ── Labor Cost Trend ─────────────────────────────────────────────────

public sealed record LaborCostTrendDto(
    int Year,
    int Month,
    string Label,
    decimal TotalCost,
    decimal AverageCost);

// ── Attendance Trend ─────────────────────────────────────────────────

public sealed record AttendanceTrendDto(
    int Year,
    int Month,
    string Label,
    int TotalRecords,
    int PresentCount,
    int AbsentCount,
    int LateCount,
    decimal AttendancePercent);

// ── Area Distribution ────────────────────────────────────────────────

public sealed record AreaDistributionDto(
    string AreaName,
    int EmployeeCount,
    decimal AverageSalary,
    decimal TotalCost);

// ── Turnover / Retention Risk ────────────────────────────────────────

public sealed record TurnoverRiskDto(
    Guid EmployeeId,
    string EmployeeName,
    string EmployeeCode,
    string AreaName,
    string PositionName,
    int TenureMonths,
    int IncidentCount,
    int AbsenceCount,
    decimal RiskScore,
    string RiskLevel); // low, medium, high

// ── Cost Projection ──────────────────────────────────────────────────

public sealed record CostProjectionDto(
    int Year,
    int Month,
    string Label,
    decimal ProjectedCost,
    decimal ActualCost);

// ── Year Over Year Comparison ────────────────────────────────────────

public sealed record YearComparisonDto(
    string Metric,
    decimal CurrentYear,
    decimal PreviousYear,
    decimal ChangePercent);

using Hrms.Application.DTOs.Analytics;
using Hrms.Application.Interfaces.Services;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AnalyticsService(HrmsDbContext db) : IAnalyticsService
{
    private static readonly string[] MonthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    public async Task<AnalyticsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthStartDate = DateOnly.FromDateTime(monthStart);

        var employees = db.Employees.AsNoTracking().Where(x => !x.IsDeleted);
        var totalEmployees = await employees.CountAsync(cancellationToken);
        var activeEmployees = await employees.Where(x => x.IsActive).CountAsync(cancellationToken);
        var newHires = await employees.Where(x => x.HireDate >= monthStartDate).CountAsync(cancellationToken);
        var terminations = await employees.Where(x => !x.IsActive && x.UpdatedAtUtc >= monthStart).CountAsync(cancellationToken);

        // Payroll
        var lastPayroll = await db.PayrollRecords
            .Where(x => !x.IsDeleted)
            .GroupBy(x => new { x.Year, x.Month })
            .OrderByDescending(g => g.Key.Year).ThenByDescending(g => g.Key.Month)
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(p => p.NetPay), Avg = g.Average(p => p.NetPay) })
            .FirstOrDefaultAsync(cancellationToken);

        // Attendance this month
        var attendanceThisMonth = await db.AttendanceRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.AttendanceDate >= monthStartDate)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Present = g.Count(x => !x.IsAbsent),
                Late = g.Count(x => x.LateMinutes > 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalAttendance = attendanceThisMonth?.Total ?? 0;
        var presentCount = attendanceThisMonth?.Present ?? 0;
        var lateCount = attendanceThisMonth?.Late ?? 0;
        var attendanceRate = totalAttendance > 0 ? Math.Round((decimal)presentCount / totalAttendance * 100, 1) : 0m;
        var lateRate = totalAttendance > 0 ? Math.Round((decimal)lateCount / totalAttendance * 100, 1) : 0m;

        var pendingVacations = await db.VacationRequests.CountAsync(x => !x.IsDeleted && x.Status == "pending", cancellationToken);
        var pendingLeaves = await db.LeaveRequests.CountAsync(x => !x.IsDeleted && x.Status == "pending", cancellationToken);
        var openRecruitments = await db.RecruitmentCandidates.CountAsync(x => !x.IsDeleted && x.CurrentStatus != "hired" && x.CurrentStatus != "rejected", cancellationToken);
        var pendingDocs = await db.EmployeeDocuments.CountAsync(x => !x.IsDeleted && x.Status == "pending_signature", cancellationToken);

        return new AnalyticsSummaryDto(
            totalEmployees, activeEmployees, newHires, terminations,
            lastPayroll?.Total ?? 0, lastPayroll?.Avg ?? 0,
            attendanceRate, lateRate,
            pendingVacations, pendingLeaves, openRecruitments, pendingDocs);
    }

    public async Task<IReadOnlyList<HeadcountTrendDto>> GetHeadcountTrendAsync(int months, CancellationToken cancellationToken = default)
    {
        var result = new List<HeadcountTrendDto>();
        var now = DateTime.UtcNow;

        var firstMonth = new DateOnly(now.Year, now.Month, 1).AddMonths(-(months - 1));
        var lastMonthExclusive = firstMonth.AddMonths(months);

        var baseEmployees = await db.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.HireDate < lastMonthExclusive)
            .Select(x => new { x.HireDate, x.IsActive, x.UpdatedAtUtc })
            .ToListAsync(cancellationToken);

        for (var i = months - 1; i >= 0; i--)
        {
            var date = new DateTime(now.Year, now.Month, 1).AddMonths(-i);
            var endDate = date.AddMonths(1);
            var dateOnly = DateOnly.FromDateTime(date);
            var endDateOnly = DateOnly.FromDateTime(endDate);

            var activeAtEnd = baseEmployees.Count(x => x.HireDate < endDateOnly && x.IsActive);
            var hires = baseEmployees.Count(x => x.HireDate >= dateOnly && x.HireDate < endDateOnly);
            var terms = baseEmployees.Count(x => !x.IsActive && x.UpdatedAtUtc >= date && x.UpdatedAtUtc < endDate);

            result.Add(new HeadcountTrendDto(date.Year, date.Month, $"{MonthLabels[date.Month - 1]} {date.Year}", activeAtEnd, hires, terms));
        }

        return result;
    }

    public async Task<IReadOnlyList<LaborCostTrendDto>> GetLaborCostTrendAsync(int months, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1).AddMonths(-(months - 1));

        var payrollData = await db.PayrollRecords
            .Where(x => !x.IsDeleted && (x.Year > startDate.Year || (x.Year == startDate.Year && x.Month >= startDate.Month)))
            .GroupBy(x => new { x.Year, x.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(p => p.NetPay), Avg = g.Average(p => p.NetPay) })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);

        return payrollData.Select(x => new LaborCostTrendDto(
            x.Year, x.Month, $"{MonthLabels[x.Month - 1]} {x.Year}", x.Total, x.Avg
        )).ToList();
    }

    public async Task<IReadOnlyList<AttendanceTrendDto>> GetAttendanceTrendAsync(int months, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startDate = DateOnly.FromDateTime(new DateTime(now.Year, now.Month, 1).AddMonths(-(months - 1)));

        var records = await db.AttendanceRecords
            .Where(x => !x.IsDeleted && x.AttendanceDate >= startDate)
            .ToListAsync(cancellationToken);

        var grouped = records
            .GroupBy(x => new { x.AttendanceDate.Year, x.AttendanceDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month);

        return grouped.Select(g =>
        {
            var total = g.Count();
            var present = g.Count(x => !x.IsAbsent);
            var absent = g.Count(x => x.IsAbsent);
            var late = g.Count(x => x.LateMinutes > 0);
            var pct = total > 0 ? Math.Round((decimal)present / total * 100, 1) : 0m;
            return new AttendanceTrendDto(g.Key.Year, g.Key.Month, $"{MonthLabels[g.Key.Month - 1]} {g.Key.Year}", total, present, absent, late, pct);
        }).ToList();
    }

    public async Task<IReadOnlyList<AreaDistributionDto>> GetAreaDistributionAsync(CancellationToken cancellationToken = default)
    {
        var raw = await db.Employees
            .Where(x => !x.IsDeleted && x.IsActive)
            .GroupBy(x => x.Area!.Name)
            .Select(g => new
            {
                AreaName = g.Key,
                EmployeeCount = g.Count(),
                AverageSalary = g.Average(e => e.BaseSalary),
                TotalSalary = g.Sum(e => e.BaseSalary)
            })
            .OrderByDescending(x => x.EmployeeCount)
            .ToListAsync(cancellationToken);

        return raw
            .Select(x => new AreaDistributionDto(
                x.AreaName,
                x.EmployeeCount,
                Math.Round(x.AverageSalary, 2),
                x.TotalSalary))
            .ToList();
    }

    public async Task<IReadOnlyList<TurnoverRiskDto>> GetTurnoverRiskAsync(int top, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var sixMonthsAgo = DateOnly.FromDateTime(now.AddMonths(-6));

        var employees = await db.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.Position)
            .Where(x => !x.IsDeleted && x.IsActive)
            .ToListAsync(cancellationToken);

        var employeeIds = employees.Select(x => x.Id).ToHashSet();

        // Incidents in last 6 months
        var incidents = await db.AttendanceIncidents
            .Where(x => !x.IsDeleted && x.IncidentDate >= sixMonthsAgo)
            .GroupBy(x => x.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var incidentMap = incidents.ToDictionary(x => x.EmployeeId, x => x.Count);

        // Absences in last 6 months
        var absences = await db.AttendanceRecords
            .Where(x => !x.IsDeleted && x.AttendanceDate >= sixMonthsAgo && x.IsAbsent)
            .GroupBy(x => x.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var absenceMap = absences.ToDictionary(x => x.EmployeeId, x => x.Count);

        var risks = employees.Select(emp =>
        {
            var tenureMonths = (int)((now - emp.HireDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 30.44);
            var incidentCount = incidentMap.GetValueOrDefault(emp.Id, 0);
            var absenceCount = absenceMap.GetValueOrDefault(emp.Id, 0);

            // Simple risk scoring: high incidents + absences + low tenure = higher risk
            var riskScore = 0m;
            riskScore += incidentCount * 15m;
            riskScore += absenceCount * 10m;
            if (tenureMonths < 6) riskScore += 20m;
            else if (tenureMonths < 12) riskScore += 10m;
            riskScore = Math.Min(riskScore, 100m);

            var riskLevel = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";

            return new TurnoverRiskDto(
                emp.Id,
                $"{emp.FirstName} {emp.LastName}",
                emp.EmployeeCode,
                emp.Area?.Name ?? "-",
                emp.Position?.Name ?? "-",
                tenureMonths,
                incidentCount,
                absenceCount,
                Math.Round(riskScore, 1),
                riskLevel);
        })
        .OrderByDescending(x => x.RiskScore)
        .Take(top)
        .ToList();

        return risks;
    }

    public async Task<IReadOnlyList<CostProjectionDto>> GetCostProjectionAsync(int months, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        // Get last 6 months actual costs
        var actualCosts = await db.PayrollRecords
            .Where(x => !x.IsDeleted)
            .GroupBy(x => new { x.Year, x.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(p => p.NetPay) })
            .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month)
            .Take(6)
            .ToListAsync(cancellationToken);

        var avgMonthlyCost = actualCosts.Count > 0 ? actualCosts.Average(x => x.Total) : 0m;
        var growthRate = 1.02m; // 2% monthly growth assumption

        var result = new List<CostProjectionDto>();

        for (var i = 0; i < months; i++)
        {
            var date = new DateTime(now.Year, now.Month, 1).AddMonths(i);
            var actual = actualCosts.FirstOrDefault(x => x.Year == date.Year && x.Month == date.Month);
            var projected = Math.Round(avgMonthlyCost * (decimal)Math.Pow((double)growthRate, i), 2);

            result.Add(new CostProjectionDto(
                date.Year, date.Month, $"{MonthLabels[date.Month - 1]} {date.Year}",
                projected, actual?.Total ?? 0));
        }

        return result;
    }

    public async Task<IReadOnlyList<YearComparisonDto>> GetYearComparisonAsync(int year, CancellationToken cancellationToken = default)
    {
        var prevYear = year - 1;

        // Headcount
        var currentHc = await db.Employees.CountAsync(x => !x.IsDeleted && x.HireDate.Year <= year && x.IsActive, cancellationToken);
        var prevHc = await db.Employees.CountAsync(x => !x.IsDeleted && x.HireDate.Year <= prevYear && x.IsActive, cancellationToken);

        // Total payroll cost
        var currentCost = await db.PayrollRecords.Where(x => !x.IsDeleted && x.Year == year).SumAsync(x => x.NetPay, cancellationToken);
        var prevCost = await db.PayrollRecords.Where(x => !x.IsDeleted && x.Year == prevYear).SumAsync(x => x.NetPay, cancellationToken);

        // New hires
        var currentHires = await db.Employees.CountAsync(x => !x.IsDeleted && x.HireDate.Year == year, cancellationToken);
        var prevHires = await db.Employees.CountAsync(x => !x.IsDeleted && x.HireDate.Year == prevYear, cancellationToken);

        // Incidents
        var currentYear1 = new DateOnly(year, 1, 1);
        var currentYear12 = new DateOnly(year, 12, 31);
        var prevYear1 = new DateOnly(prevYear, 1, 1);
        var prevYear12 = new DateOnly(prevYear, 12, 31);
        var currentIncidents = await db.AttendanceIncidents.CountAsync(x => !x.IsDeleted && x.IncidentDate >= currentYear1 && x.IncidentDate <= currentYear12, cancellationToken);
        var prevIncidents = await db.AttendanceIncidents.CountAsync(x => !x.IsDeleted && x.IncidentDate >= prevYear1 && x.IncidentDate <= prevYear12, cancellationToken);

        static decimal CalcChange(decimal current, decimal previous) =>
            previous == 0 ? (current > 0 ? 100 : 0) : Math.Round((current - previous) / previous * 100, 1);

        return
        [
            new YearComparisonDto("Empleados activos", currentHc, prevHc, CalcChange(currentHc, prevHc)),
            new YearComparisonDto("Costo planilla total", currentCost, prevCost, CalcChange(currentCost, prevCost)),
            new YearComparisonDto("Nuevas contrataciones", currentHires, prevHires, CalcChange(currentHires, prevHires)),
            new YearComparisonDto("Incidencias", currentIncidents, prevIncidents, CalcChange(currentIncidents, prevIncidents))
        ];
    }
}

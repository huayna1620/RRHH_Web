using Hrms.Application.DTOs.Reports;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class ReportsService(HrmsDbContext dbContext) : IReportsService
{
    public async Task<EmployeesReportDto> GetEmployeesReportAsync(CancellationToken cancellationToken = default)
    {
        var employees = dbContext.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Include(x => x.Area);

        var totalEmployees = await employees.CountAsync(cancellationToken);
        var activeEmployees = await employees.CountAsync(x => x.IsActive, cancellationToken);

        var byAreaRaw = await employees
            .GroupBy(x => new { x.AreaId, AreaName = x.Area.Name })
            .Select(group => new
            {
                group.Key.AreaId,
                group.Key.AreaName,
                TotalEmployees = group.Count(),
                ActiveEmployees = group.Count(x => x.IsActive)
            })
            .OrderByDescending(x => x.TotalEmployees)
            .ThenBy(x => x.AreaName)
            .ToListAsync(cancellationToken);

        var byArea = byAreaRaw
            .Select(x => new EmployeeAreaReportItemDto(
                x.AreaId,
                x.AreaName,
                x.TotalEmployees,
                x.ActiveEmployees))
            .ToList();

        return new EmployeesReportDto(
            totalEmployees,
            activeEmployees,
            Math.Max(0, totalEmployees - activeEmployees),
            byArea);
    }

    public async Task<AttendanceReportDto> GetAttendanceReportAsync(
        int? year,
        int? month,
        DateOnly? startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken = default)
    {
        DateOnly rangeStart;
        DateOnly rangeEnd;
        int resolvedYear;
        int resolvedMonth;

        if (startDate.HasValue || endDate.HasValue)
        {
            if (!startDate.HasValue)
            {
                var end = endDate!.Value;
                startDate = new DateOnly(end.Year, end.Month, 1);
            }

            if (!endDate.HasValue)
            {
                var start = startDate!.Value;
                endDate = new DateOnly(start.Year, start.Month, 1).AddMonths(1).AddDays(-1);
            }

            if (startDate!.Value > endDate!.Value)
            {
                throw new InvalidOperationException("El rango de fechas de asistencia no es valido.");
            }

            rangeStart = startDate.Value;
            rangeEnd = endDate.Value;
            resolvedYear = rangeEnd.Year;
            resolvedMonth = rangeEnd.Month;
        }
        else
        {
            (resolvedYear, resolvedMonth) = ResolveYearMonth(year, month);
            rangeStart = new DateOnly(resolvedYear, resolvedMonth, 1);
            rangeEnd = rangeStart.AddMonths(1).AddDays(-1);
        }

        var attendanceQuery = dbContext.AttendanceRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.AttendanceDate >= rangeStart && x.AttendanceDate <= rangeEnd);

        var totalRecords = await attendanceQuery.CountAsync(cancellationToken);
        var absentRecords = await attendanceQuery.CountAsync(x => x.IsAbsent, cancellationToken);
        var presentRecords = Math.Max(0, totalRecords - absentRecords);
        var lateRecords = await attendanceQuery.CountAsync(x => !x.IsAbsent && x.LateMinutes > 0, cancellationToken);

        var averageLateMinutes = await attendanceQuery
            .Where(x => !x.IsAbsent && x.LateMinutes > 0)
            .Select(x => (double?)x.LateMinutes)
            .AverageAsync(cancellationToken) ?? 0;

        var dailyRaw = await attendanceQuery
            .GroupBy(x => x.AttendanceDate)
            .Select(group => new
            {
                Date = group.Key,
                TotalRecords = group.Count(),
                PresentRecords = group.Count(x => !x.IsAbsent),
                AbsentRecords = group.Count(x => x.IsAbsent),
                LateRecords = group.Count(x => !x.IsAbsent && x.LateMinutes > 0)
            })
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

        var daily = dailyRaw
            .Select(x => new AttendanceDailyReportItemDto(
                x.Date,
                x.TotalRecords,
                x.PresentRecords,
                x.AbsentRecords,
                x.LateRecords))
            .ToList();

        return new AttendanceReportDto(
            resolvedYear,
            resolvedMonth,
            totalRecords,
            presentRecords,
            absentRecords,
            lateRecords,
            Math.Round(averageLateMinutes, 2),
            daily);
    }

    public async Task<VacationsReportDto> GetVacationsReportAsync(int? year, CancellationToken cancellationToken = default)
    {
        var resolvedYear = ResolveYear(year);

        var query = dbContext.VacationRequests
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.StartDate.Year == resolvedYear);

        var byStatus = await query
            .GroupBy(x => x.Status)
            .Select(group => new VacationStatusReportItemDto(
                group.Key,
                group.Count(),
                group.Sum(x => x.RequestedDays)))
            .ToListAsync(cancellationToken);

        var totalRequests = byStatus.Sum(x => x.Requests);
        var pendingRequests = byStatus.Where(x => x.Status == VacationRequestStatuses.Pending).Sum(x => x.Requests);
        var approvedRequests = byStatus.Where(x => x.Status == VacationRequestStatuses.Approved).Sum(x => x.Requests);
        var rejectedRequests = byStatus.Where(x => x.Status == VacationRequestStatuses.Rejected).Sum(x => x.Requests);
        var totalRequestedDays = byStatus.Sum(x => x.RequestedDays);
        var approvedDays = byStatus.Where(x => x.Status == VacationRequestStatuses.Approved).Sum(x => x.RequestedDays);

        return new VacationsReportDto(
            resolvedYear,
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalRequestedDays,
            approvedDays,
            byStatus.OrderByDescending(x => x.Requests).ToList());
    }

    public async Task<LeavesReportDto> GetLeavesReportAsync(int? year, CancellationToken cancellationToken = default)
    {
        var resolvedYear = ResolveYear(year);

        var query = dbContext.LeaveRequests
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.StartDate.Year == resolvedYear);

        var totalRequests = await query.CountAsync(cancellationToken);
        var pendingRequests = await query.CountAsync(x => x.Status == LeaveRequestStatuses.Pending, cancellationToken);
        var approvedRequests = await query.CountAsync(x => x.Status == LeaveRequestStatuses.Approved, cancellationToken);
        var rejectedRequests = await query.CountAsync(x => x.Status == LeaveRequestStatuses.Rejected, cancellationToken);
        var paidRequests = await query.CountAsync(x => x.IsPaid, cancellationToken);
        var unpaidRequests = Math.Max(0, totalRequests - paidRequests);

        var byTypeRaw = await query
            .GroupBy(x => x.LeaveType)
            .Select(group => new
            {
                LeaveType = group.Key,
                Requests = group.Count(),
                RequestedDays = group.Sum(x => x.RequestedDays)
            })
            .OrderByDescending(x => x.Requests)
            .ToListAsync(cancellationToken);

        var byType = byTypeRaw
            .Select(x => new LeaveTypeReportItemDto(
                x.LeaveType,
                x.Requests,
                x.RequestedDays))
            .ToList();

        return new LeavesReportDto(
            resolvedYear,
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            paidRequests,
            unpaidRequests,
            byType);
    }

    public async Task<PayrollReportDto> GetPayrollReportAsync(int? year, int? month, CancellationToken cancellationToken = default)
    {
        var (resolvedYear, resolvedMonth) = ResolveYearMonth(year, month);

        var query = dbContext.PayrollRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Year == resolvedYear && x.Month == resolvedMonth);

        var recordsCount = await query.CountAsync(cancellationToken);

        var totals = await query
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalBase = group.Sum(x => x.BaseSalary),
                TotalBonuses = group.Sum(x => x.Bonuses),
                TotalDeductions = group.Sum(x => x.Deductions),
                TotalNet = group.Sum(x => x.NetPay),
                AverageNet = group.Average(x => x.NetPay)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var topNetPays = await dbContext.PayrollRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Year == resolvedYear && x.Month == resolvedMonth)
            .Include(x => x.Employee)
            .OrderByDescending(x => x.NetPay)
            .Take(5)
            .Select(x => new PayrollTopNetItemDto(
                x.EmployeeId,
                x.Employee.EmployeeCode,
                x.Employee.FirstName + " " + x.Employee.LastName,
                x.NetPay))
            .ToListAsync(cancellationToken);

        return new PayrollReportDto(
            resolvedYear,
            resolvedMonth,
            recordsCount,
            totals?.TotalBase ?? 0,
            totals?.TotalBonuses ?? 0,
            totals?.TotalDeductions ?? 0,
            totals?.TotalNet ?? 0,
            totals?.AverageNet ?? 0,
            topNetPays);
    }

    public async Task<RotationReportDto> GetRotationReportAsync(int? year, CancellationToken cancellationToken = default)
    {
        var resolvedYear = ResolveYear(year);
        var startOfYear = new DateOnly(resolvedYear, 1, 1);
        var endOfYear = new DateOnly(resolvedYear, 12, 31);

        // Hired during year
        var hired = await dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Where(x => !x.IsDeleted && x.HireDate >= startOfYear && x.HireDate <= endOfYear)
            .Select(x => new { x.AreaId, x.Area.Name })
            .ToListAsync(cancellationToken);

        // Became inactive during year (proxy: UpdatedAtUtc in year range and IsActive=false)
        var startUtc = new DateTime(resolvedYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var endUtc = new DateTime(resolvedYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);

        var inactivated = await dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Where(x => !x.IsDeleted && !x.IsActive
                && x.UpdatedAtUtc >= startUtc && x.UpdatedAtUtc <= endUtc)
            .Select(x => new { x.AreaId, x.Area.Name })
            .ToListAsync(cancellationToken);

        // Total active at start of year
        var totalActiveStart = await dbContext.Employees
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.IsActive && x.HireDate < startOfYear, cancellationToken);

        var avgHeadcount = totalActiveStart + hired.Count / 2.0;
        var turnoverRate = avgHeadcount > 0 ? Math.Round(inactivated.Count / avgHeadcount * 100, 2) : 0;

        var allAreaIds = hired.Select(x => x.AreaId)
            .Union(inactivated.Select(x => x.AreaId))
            .Distinct().ToList();

        var byArea = allAreaIds.Select(areaId =>
        {
            var areaName = hired.FirstOrDefault(x => x.AreaId == areaId)?.Name
                ?? inactivated.FirstOrDefault(x => x.AreaId == areaId)?.Name
                ?? "Sin área";
            return new RotationAreaItemDto(
                areaId,
                areaName,
                hired.Count(x => x.AreaId == areaId),
                inactivated.Count(x => x.AreaId == areaId));
        }).OrderByDescending(x => x.InactivatedCount).ToList();

        return new RotationReportDto(resolvedYear, totalActiveStart, hired.Count, inactivated.Count, turnoverRate, byArea);
    }

    public async Task<AbsenteeismReportDto> GetAbsenteeismReportAsync(int? year, int? month, CancellationToken cancellationToken = default)
    {
        var (resolvedYear, resolvedMonth) = ResolveYearMonth(year, month);
        var startDate = new DateOnly(resolvedYear, resolvedMonth, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var totalEmployees = await dbContext.Employees
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.IsActive, cancellationToken);

        var absencesByArea = await dbContext.AttendanceRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsAbsent
                && x.AttendanceDate >= startDate && x.AttendanceDate <= endDate)
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .GroupBy(x => new { x.Employee.AreaId, x.Employee.Area.Name })
            .Select(g => new
            {
                AreaId = g.Key.AreaId,
                AreaName = g.Key.Name,
                AbsenceDays = g.Count()
            })
            .ToListAsync(cancellationToken);

        var employeesByArea = await dbContext.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .GroupBy(x => new { x.AreaId, x.Area.Name })
            .Select(g => new { AreaId = g.Key.AreaId, AreaName = g.Key.Name, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var workingDays = Enumerable.Range(0, endDate.DayNumber - startDate.DayNumber + 1)
            .Count(d =>
            {
                var dow = startDate.AddDays(d).DayOfWeek;
                return dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday;
            });

        var allAreaIds = absencesByArea.Select(x => x.AreaId)
            .Union(employeesByArea.Select(x => x.AreaId)).Distinct().ToList();

        var byArea = allAreaIds.Select(areaId =>
        {
            var empCount = employeesByArea.FirstOrDefault(x => x.AreaId == areaId)?.Count ?? 0;
            var absenceDays = absencesByArea.FirstOrDefault(x => x.AreaId == areaId)?.AbsenceDays ?? 0;
            var areaName = employeesByArea.FirstOrDefault(x => x.AreaId == areaId)?.AreaName
                ?? absencesByArea.FirstOrDefault(x => x.AreaId == areaId)?.AreaName ?? "Sin área";
            var expectedDays = empCount * workingDays;
            var rate = expectedDays > 0 ? Math.Round((double)absenceDays / expectedDays * 100, 2) : 0;
            return new AbsenteeismAreaItemDto(areaId, areaName, empCount, absenceDays, rate);
        }).OrderByDescending(x => x.AbsenteeismRate).ToList();

        var totalAbsence = absencesByArea.Sum(x => x.AbsenceDays);
        var expectedTotal = totalEmployees * workingDays;
        var globalRate = expectedTotal > 0 ? Math.Round((double)totalAbsence / expectedTotal * 100, 2) : 0;

        return new AbsenteeismReportDto(resolvedYear, resolvedMonth, totalEmployees, totalAbsence, globalRate, byArea);
    }

    public async Task<LaborCostReportDto> GetLaborCostReportAsync(int? year, int? month, CancellationToken cancellationToken = default)
    {
        var (resolvedYear, resolvedMonth) = ResolveYearMonth(year, month);

        var records = await dbContext.PayrollRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Year == resolvedYear && x.Month == resolvedMonth)
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .ToListAsync(cancellationToken);

        var byArea = records
            .GroupBy(x => new { x.Employee.AreaId, x.Employee.Area.Name })
            .Select(g => new LaborCostAreaItemDto(
                g.Key.AreaId,
                g.Key.Name,
                g.Count(),
                g.Sum(x => x.BaseSalary),
                g.Sum(x => x.Bonuses + x.AutomaticBonuses),
                g.Sum(x => x.Deductions),
                g.Sum(x => x.NetPay)))
            .OrderByDescending(x => x.TotalNetPay)
            .ToList();

        return new LaborCostReportDto(
            resolvedYear, resolvedMonth,
            records.Count,
            records.Sum(x => x.BaseSalary),
            records.Sum(x => x.Bonuses + x.AutomaticBonuses),
            records.Sum(x => x.Deductions),
            records.Sum(x => x.GrossIncome),
            records.Sum(x => x.NetPay),
            records.Count > 0 ? records.Average(x => x.NetPay) : 0,
            byArea);
    }

    public async Task<EmployeeDetailReportDto?> GetEmployeeDetailReportAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.Position)
            .Include(x => x.Branch)
            .Include(x => x.ContractType)
            .FirstOrDefaultAsync(x => x.Id == employeeId && !x.IsDeleted, cancellationToken);

        if (employee is null) return null;

        var currentYear = DateTime.UtcNow.Year;

        var attendance = await dbContext.AttendanceRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.EmployeeId == employeeId
                && x.AttendanceDate.Year == currentYear)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Absent = g.Count(x => x.IsAbsent),
                Late = g.Count(x => !x.IsAbsent && x.LateMinutes > 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var vacations = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.EmployeeId == employeeId && x.StartDate.Year == currentYear)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Approved = g.Where(x => x.Status == "approved").Sum(x => x.RequestedDays),
                Pending = g.Where(x => x.Status == "pending").Sum(x => x.RequestedDays)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var leaveCount = await dbContext.LeaveRequests
            .AsNoTracking()
            .CountAsync(x => !x.IsDeleted && x.EmployeeId == employeeId && x.StartDate.Year == currentYear, cancellationToken);

        var lastPayroll = await dbContext.PayrollRecords
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.EmployeeId == employeeId)
            .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month)
            .Select(x => new { x.NetPay, x.Year, x.Month })
            .FirstOrDefaultAsync(cancellationToken);

        return new EmployeeDetailReportDto(
            employee.Id,
            employee.EmployeeCode,
            employee.FirstName + " " + employee.LastName,
            employee.DocumentType,
            employee.DocumentNumber,
            employee.BirthDate,
            employee.HireDate,
            employee.ContractEndDate,
            employee.BaseSalary,
            employee.PersonalEmail,
            employee.WorkEmail,
            employee.PhoneNumber,
            employee.Area.Name,
            employee.Position.Name,
            employee.Branch.Name,
            employee.ContractType.Name,
            employee.IsActive,
            currentYear,
            attendance?.Total ?? 0,
            attendance?.Absent ?? 0,
            attendance?.Late ?? 0,
            vacations?.Approved ?? 0,
            vacations?.Pending ?? 0,
            leaveCount,
            lastPayroll?.NetPay,
            lastPayroll?.Year,
            lastPayroll?.Month);
    }

    private static int ResolveYear(int? year)
    {
        var resolved = year ?? DateTime.UtcNow.Year;
        if (resolved is < 2000 or > 2100)
        {
            throw new InvalidOperationException("El año de reporte no es valido.");
        }

        return resolved;
    }

    private static (int Year, int Month) ResolveYearMonth(int? year, int? month)
    {
        var resolvedYear = ResolveYear(year);
        var resolvedMonth = month ?? DateTime.UtcNow.Month;
        if (resolvedMonth is < 1 or > 12)
        {
            throw new InvalidOperationException("El mes de reporte no es valido.");
        }

        return (resolvedYear, resolvedMonth);
    }
}

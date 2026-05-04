using Hrms.Application.DTOs.Account;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AccountService(HrmsDbContext dbContext) : IAccountService
{
    public async Task<AccountProfileDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        return user is null ? null : ToDto(user);
    }

    public async Task<AccountProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new InvalidOperationException("El nombre completo es obligatorio.");

        var user = await dbContext.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user is null) return null;

        user.FullName = request.FullName.Trim();
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = user.UserName;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(user);
    }

    public async Task<EmployeeDashboardDto?> GetEmployeeDashboardAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .Include(u => u.Employee).ThenInclude(e => e!.Area)
            .Include(u => u.Employee).ThenInclude(e => e!.Position)
            .Include(u => u.Employee).ThenInclude(e => e!.Branch)
            .Include(u => u.Employee).ThenInclude(e => e!.ContractType)
            .Include(u => u.Employee).ThenInclude(e => e!.Manager)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user?.Employee is null) return null;

        var emp = user.Employee;
        var now = DateTime.UtcNow;
        var currentYear = now.Year;
        var currentMonth = now.Month;
        var monthStart = new DateOnly(currentYear, currentMonth, 1);
        var monthEnd = monthStart.AddMonths(1).AddDays(-1);

        // Attendance this month
        var attendance = await dbContext.AttendanceRecords
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.EmployeeId == emp.Id
                && a.AttendanceDate >= monthStart && a.AttendanceDate <= monthEnd)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Present = g.Count(x => !x.IsAbsent),
                Absent = g.Count(x => x.IsAbsent),
                Late = g.Count(x => !x.IsAbsent && x.LateMinutes > 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Vacation balance (current year)
        var vacationSetting = await dbContext.GeneralSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == "vacation.annual_days" || s.Key == "vacations.annual_days", cancellationToken);
        var annualDays = int.TryParse(vacationSetting?.Value, out var ad) ? ad : 30;

        var vacations = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(v => !v.IsDeleted && v.EmployeeId == emp.Id && v.StartDate.Year == currentYear)
            .ToListAsync(cancellationToken);

        var vacUsed = vacations.Where(v => v.Status == VacationRequestStatuses.Approved).Sum(v => v.RequestedDays);
        var vacPending = vacations.Where(v => v.Status == VacationRequestStatuses.Pending).Sum(v => v.RequestedDays);

        // Leaves (current year)
        var leaves = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.EmployeeId == emp.Id && l.StartDate.Year == currentYear)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Approved = g.Count(x => x.Status == LeaveRequestStatuses.Approved),
                Pending = g.Count(x => x.Status == LeaveRequestStatuses.Pending)
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Last payroll
        var lastPayroll = await dbContext.PayrollRecords
            .AsNoTracking()
            .Where(p => !p.IsDeleted && p.EmployeeId == emp.Id)
            .OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
            .Select(p => new { p.NetPay, p.Year, p.Month, p.PaidAtUtc })
            .FirstOrDefaultAsync(cancellationToken);

        // Upcoming events (next 30 days): holidays + approved vacations + approved leaves
        var today = DateOnly.FromDateTime(now);
        var futureLimit = today.AddDays(30);

        var upcomingHolidays = await dbContext.Holidays
            .AsNoTracking()
            .Where(h => !h.IsDeleted && h.Date >= today && h.Date <= futureLimit)
            .OrderBy(h => h.Date)
            .Select(h => new UpcomingEventDto("holiday", h.Name, h.Date))
            .ToListAsync(cancellationToken);

        var upcomingVacations = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(v => !v.IsDeleted && v.EmployeeId == emp.Id
                && v.Status == VacationRequestStatuses.Approved
                && v.StartDate >= today && v.StartDate <= futureLimit)
            .OrderBy(v => v.StartDate)
            .Select(v => new UpcomingEventDto("vacation", $"Vacaciones ({v.RequestedDays} días)", v.StartDate))
            .ToListAsync(cancellationToken);

        var upcomingLeaves = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.EmployeeId == emp.Id
                && l.Status == LeaveRequestStatuses.Approved
                && l.StartDate >= today && l.StartDate <= futureLimit)
            .OrderBy(l => l.StartDate)
            .Select(l => new UpcomingEventDto("leave", $"Permiso: {l.LeaveType}", l.StartDate))
            .ToListAsync(cancellationToken);

        var upcoming = upcomingHolidays
            .Concat(upcomingVacations)
            .Concat(upcomingLeaves)
            .OrderBy(e => e.Date)
            .ToList();

        // Recent personal requests (vacations + leaves + incidents), newest first
        var recentVacationsRaw = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(v => !v.IsDeleted && v.EmployeeId == emp.Id)
            .Select(v => new { v.Status, v.StartDate, v.EndDate, v.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var recentVacations = recentVacationsRaw
            .Select(v => new PortalRequestDto(
                "vacation",
                v.Status,
                "Vacaciones",
                $"Del {v.StartDate:dd/MM/yyyy} al {v.EndDate:dd/MM/yyyy}",
                v.StartDate,
                v.EndDate,
                v.CreatedAtUtc))
            .ToList();

        var recentLeavesRaw = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(l => !l.IsDeleted && l.EmployeeId == emp.Id)
            .Select(l => new { l.Status, l.LeaveType, l.StartDate, l.EndDate, l.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var recentLeaves = recentLeavesRaw
            .Select(l => new PortalRequestDto(
                "leave",
                l.Status,
                "Permiso",
                $"{l.LeaveType} ({l.StartDate:dd/MM/yyyy})",
                l.StartDate,
                l.EndDate,
                l.CreatedAtUtc))
            .ToList();

        var recentIncidentsRaw = await dbContext.AttendanceIncidents
            .AsNoTracking()
            .Where(i => !i.IsDeleted && i.EmployeeId == emp.Id)
            .Select(i => new { i.Status, i.IncidentType, i.IncidentDate, i.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        var recentIncidents = recentIncidentsRaw
            .Select(i => new PortalRequestDto(
                "incident",
                i.Status,
                "Incidencia",
                $"{i.IncidentType} ({i.IncidentDate:dd/MM/yyyy})",
                i.IncidentDate,
                i.IncidentDate,
                i.CreatedAtUtc))
            .ToList();

        var recentRequests = recentVacations
            .Concat(recentLeaves)
            .Concat(recentIncidents)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(4)
            .ToList();

        // Personal notices (notifications + pending documents + payroll ready)
        var notifications = await dbContext.AppNotifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Select(n => new PortalNoticeDto(
                n.Category ?? "notification",
                n.Title,
                n.Message,
                n.IsRead ? "read" : "unread",
                n.CreatedAtUtc))
            .Take(3)
            .ToListAsync(cancellationToken);

        var pendingDocs = await dbContext.EmployeeDocuments
            .AsNoTracking()
            .Where(d => !d.IsDeleted && d.EmployeeId == emp.Id && d.Status == "pending_signature")
            .OrderByDescending(d => d.CreatedAtUtc)
            .Select(d => new PortalNoticeDto(
                "document",
                d.Title,
                "Documento pendiente de firma",
                d.Status,
                d.CreatedAtUtc))
            .Take(2)
            .ToListAsync(cancellationToken);

        var payrollNotice = lastPayroll is null
            ? []
            : new List<PortalNoticeDto>
            {
                new(
                    "payroll",
                    "Boleta de pago disponible",
                    $"Periodo {lastPayroll.Year}/{lastPayroll.Month:00}",
                    lastPayroll.PaidAtUtc.HasValue ? "paid" : "approved",
                    lastPayroll.PaidAtUtc ?? now)
            };

        var notices = payrollNotice
            .Concat(pendingDocs)
            .Concat(notifications)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(3)
            .ToList();

        return new EmployeeDashboardDto(
            emp.EmployeeCode,
            emp.FirstName + " " + emp.LastName,
            emp.Area.Name,
            emp.Position.Name,
            emp.HireDate,
            attendance?.Present ?? 0,
            attendance?.Absent ?? 0,
            attendance?.Late ?? 0,
            Math.Max(0, annualDays - vacUsed),
            vacUsed,
            vacPending,
            leaves?.Total ?? 0,
            leaves?.Approved ?? 0,
            leaves?.Pending ?? 0,
            lastPayroll?.NetPay,
            lastPayroll?.Year,
            lastPayroll?.Month,
            lastPayroll?.PaidAtUtc,
            emp.Branch?.Name,
            emp.ContractType?.Name,
            emp.Manager is null ? null : $"{emp.Manager.FirstName} {emp.Manager.LastName}",
            upcoming,
            recentRequests,
            notices);
    }

    public async Task<IReadOnlyList<CalendarEventDto>> GetCalendarEventsAsync(Guid userId, int year, int month, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user?.EmployeeId is null) return [];

        var employeeId = user.EmployeeId.Value;
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        // Get the employee's area to show team events
        var employee = await dbContext.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == employeeId && !e.IsDeleted, cancellationToken);

        if (employee is null) return [];

        var events = new List<CalendarEventDto>();

        // Holidays
        var holidays = await dbContext.Holidays
            .AsNoTracking()
            .Where(h => !h.IsDeleted && h.Date >= startDate && h.Date <= endDate)
            .ToListAsync(cancellationToken);

        events.AddRange(holidays.Select(h =>
            new CalendarEventDto("holiday", h.Name, h.Date, h.Date, null, null)));

        // My vacations
        var myVacations = await dbContext.VacationRequests
            .AsNoTracking()
            .Include(v => v.Employee)
            .Where(v => !v.IsDeleted && v.EmployeeId == employeeId
                && v.StartDate <= endDate && v.EndDate >= startDate)
            .ToListAsync(cancellationToken);

        events.AddRange(myVacations.Select(v =>
            new CalendarEventDto("vacation", "Mis vacaciones", v.StartDate, v.EndDate, v.Status,
                v.Employee.FirstName + " " + v.Employee.LastName)));

        // My leaves
        var myLeaves = await dbContext.LeaveRequests
            .AsNoTracking()
            .Include(l => l.Employee)
            .Where(l => !l.IsDeleted && l.EmployeeId == employeeId
                && l.StartDate <= endDate && l.EndDate >= startDate)
            .ToListAsync(cancellationToken);

        events.AddRange(myLeaves.Select(l =>
            new CalendarEventDto("leave", $"Permiso: {l.LeaveType}", l.StartDate, l.EndDate, l.Status,
                l.Employee.FirstName + " " + l.Employee.LastName)));

        // Team vacations (same area, approved only)
        var teamVacations = await dbContext.VacationRequests
            .AsNoTracking()
            .Include(v => v.Employee)
            .Where(v => !v.IsDeleted && v.EmployeeId != employeeId
                && v.Employee.AreaId == employee.AreaId
                && v.Status == VacationRequestStatuses.Approved
                && v.StartDate <= endDate && v.EndDate >= startDate)
            .ToListAsync(cancellationToken);

        events.AddRange(teamVacations.Select(v =>
            new CalendarEventDto("team_vacation",
                $"Vacaciones: {v.Employee.FirstName} {v.Employee.LastName}",
                v.StartDate, v.EndDate, v.Status,
                v.Employee.FirstName + " " + v.Employee.LastName)));

        // Team leaves (same area, approved only)
        var teamLeaves = await dbContext.LeaveRequests
            .AsNoTracking()
            .Include(l => l.Employee)
            .Where(l => !l.IsDeleted && l.EmployeeId != employeeId
                && l.Employee.AreaId == employee.AreaId
                && l.Status == LeaveRequestStatuses.Approved
                && l.StartDate <= endDate && l.EndDate >= startDate)
            .ToListAsync(cancellationToken);

        events.AddRange(teamLeaves.Select(l =>
            new CalendarEventDto("team_leave",
                $"Permiso: {l.Employee.FirstName} {l.Employee.LastName}",
                l.StartDate, l.EndDate, l.Status,
                l.Employee.FirstName + " " + l.Employee.LastName)));

        return events.OrderBy(e => e.StartDate).ThenBy(e => e.Type).ToList();
    }

    private static AccountProfileDto ToDto(User user)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList<string>();
        return new AccountProfileDto(
            user.Id, user.UserName, user.FullName, user.Email, roles,
            user.EmployeeId,
            user.Employee is not null ? user.Employee.FirstName + " " + user.Employee.LastName : null,
            user.Employee?.EmployeeCode,
            user.LastLoginAtUtc);
    }
}

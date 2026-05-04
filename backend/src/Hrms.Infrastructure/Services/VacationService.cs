using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Vacations;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class VacationService(HrmsDbContext dbContext, IAuditService auditService, IHolidayService holidayService, INotificationService notificationService, IIntegrationService integrationService) : IVacationService
{
    private const int DefaultAnnualVacationDays = 30;

    public async Task<PagedResultDto<VacationListItemDto>> GetPagedAsync(VacationQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var vacationQuery = dbContext.VacationRequests
            .AsNoTracking()
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            vacationQuery = vacationQuery.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search));
        }

        if (query.EmployeeId.HasValue)
        {
            vacationQuery = vacationQuery.Where(x => x.EmployeeId == query.EmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var normalizedStatus = query.Status.Trim().ToLowerInvariant();
            if (!VacationRequestStatuses.All.Contains(normalizedStatus))
            {
                throw new InvalidOperationException("El estado de vacaciones no es valido.");
            }

            vacationQuery = vacationQuery.Where(x => x.Status == normalizedStatus);
        }

        if (query.StartDateFrom.HasValue)
        {
            vacationQuery = vacationQuery.Where(x => x.StartDate >= query.StartDateFrom.Value);
        }

        if (query.StartDateTo.HasValue)
        {
            vacationQuery = vacationQuery.Where(x => x.StartDate <= query.StartDateTo.Value);
        }

        if (query.Year.HasValue)
        {
            var yearStart = new DateOnly(query.Year.Value, 1, 1);
            var yearEnd = new DateOnly(query.Year.Value, 12, 31);
            vacationQuery = vacationQuery.Where(x => x.StartDate <= yearEnd && x.EndDate >= yearStart);
        }

        var totalCount = await vacationQuery.CountAsync(cancellationToken);

        var items = await vacationQuery
            .OrderByDescending(x => x.StartDate)
            .ThenBy(x => x.Employee.LastName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new VacationListItemDto(
                x.Id,
                x.EmployeeId,
                x.Employee.EmployeeCode,
                x.Employee.FirstName + " " + x.Employee.LastName,
                x.Employee.Area.Name,
                x.StartDate,
                x.EndDate,
                x.RequestedDays,
                x.Status,
                x.Reason,
                x.ReviewerComment,
                x.RequestedAtUtc,
                x.ReviewedAtUtc,
                x.ReviewedByUserId,
                x.ReviewedByUserName))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<VacationListItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<VacationCatalogsDto> GetCatalogsAsync(int? year = null, CancellationToken cancellationToken = default)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var annualDays = await GetAnnualVacationDaysAsync(cancellationToken);

        var employees = await dbContext.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => new
            {
                x.Id,
                x.EmployeeCode,
                x.FirstName,
                x.LastName
            })
            .ToListAsync(cancellationToken);

        if (employees.Count == 0)
        {
            return new VacationCatalogsDto([]);
        }

        var employeeIds = employees.Select(x => x.Id).ToArray();
        var balances = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                employeeIds.Contains(x.EmployeeId) &&
                x.StartDate.Year == targetYear &&
                (x.Status == VacationRequestStatuses.Approved || x.Status == VacationRequestStatuses.Pending))
            .Select(x => new
            {
                x.EmployeeId,
                x.Status,
                x.RequestedDays
            })
            .ToListAsync(cancellationToken);

        var grouped = balances
            .GroupBy(x => x.EmployeeId)
            .ToDictionary(
                x => x.Key,
                x => new
                {
                    Used = x.Where(item => item.Status == VacationRequestStatuses.Approved).Sum(item => item.RequestedDays),
                    Pending = x.Where(item => item.Status == VacationRequestStatuses.Pending).Sum(item => item.RequestedDays)
                });

        var employeeBalances = employees
            .Select(employee =>
            {
                var result = grouped.TryGetValue(employee.Id, out var group)
                    ? group
                    : new { Used = 0, Pending = 0 };

                var availableDays = Math.Max(0, annualDays - result.Used - result.Pending);

                return new VacationEmployeeBalanceDto(
                    employee.Id,
                    employee.EmployeeCode + " - " + employee.FirstName + " " + employee.LastName,
                    annualDays,
                    result.Used,
                    result.Pending,
                    availableDays);
            })
            .ToList();

        return new VacationCatalogsDto(employeeBalances);
    }

    public async Task<VacationListItemDto> CreateAsync(CreateVacationRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.StartDate > request.EndDate)
        {
            throw new InvalidOperationException("La fecha de inicio no puede ser mayor a la fecha de fin.");
        }

        if (request.StartDate.Year != request.EndDate.Year)
        {
            throw new InvalidOperationException("La solicitud de vacaciones debe estar dentro del mismo ano.");
        }

        var employee = await dbContext.Employees
            .Include(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El empleado no existe.");

        if (!employee.IsActive)
        {
            throw new InvalidOperationException("No se puede solicitar vacaciones para un empleado inactivo.");
        }

        var holidayDates = await holidayService.GetHolidayDatesForYearAsync(request.StartDate.Year, cancellationToken);
        var requestedDays = CountBusinessDays(request.StartDate, request.EndDate, holidayDates);
        if (requestedDays <= 0)
        {
            throw new InvalidOperationException("La solicitud debe incluir al menos un dia habil.");
        }

        // Check overlap with other vacations
        var vacationOverlap = await dbContext.VacationRequests.AnyAsync(
            x =>
                !x.IsDeleted &&
                x.EmployeeId == request.EmployeeId &&
                (x.Status == VacationRequestStatuses.Pending || x.Status == VacationRequestStatuses.Approved) &&
                x.StartDate <= request.EndDate &&
                x.EndDate >= request.StartDate,
            cancellationToken);

        if (vacationOverlap)
        {
            throw new InvalidOperationException("El empleado ya tiene vacaciones solicitadas o aprobadas en ese rango.");
        }

        // Check overlap with leaves
        var leaveOverlap = await dbContext.LeaveRequests.AnyAsync(
            x =>
                !x.IsDeleted &&
                x.EmployeeId == request.EmployeeId &&
                (x.Status == LeaveRequestStatuses.Pending || x.Status == LeaveRequestStatuses.Approved) &&
                x.StartDate <= request.EndDate &&
                x.EndDate >= request.StartDate,
            cancellationToken);

        if (leaveOverlap)
        {
            throw new InvalidOperationException("El empleado ya tiene un permiso/licencia pendiente o aprobado en ese rango de fechas.");
        }

        var annualDays = await GetAnnualVacationDaysAsync(cancellationToken);
        var year = request.StartDate.Year;
        var availableDays = await GetAvailableDaysAsync(request.EmployeeId, year, annualDays, includePending: true, cancellationToken);
        if (requestedDays > availableDays)
        {
            throw new InvalidOperationException($"No hay saldo suficiente de vacaciones. Disponible: {availableDays} dias.");
        }

        var vacationRequest = new VacationRequest
        {
            EmployeeId = request.EmployeeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            RequestedDays = requestedDays,
            Status = VacationRequestStatuses.Pending,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            RequestedAtUtc = DateTime.UtcNow,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.VacationRequests.AddAsync(vacationRequest, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.CreateForUsersWithPermissionAsync(
            "vacations.approve",
            "Nueva solicitud de vacaciones",
            $"{employee.FirstName} {employee.LastName} solicitó vacaciones del {request.StartDate:dd/MM/yyyy} al {request.EndDate:dd/MM/yyyy}.",
            "vacations",
            cancellationToken);

        return ToDto(vacationRequest, employee);
    }

    public async Task<VacationListItemDto> ApproveAsync(Guid vacationRequestId, ApproveVacationRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default)
    {
        var vacationRequest = await dbContext.VacationRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == vacationRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud de vacaciones.");

        if (!string.Equals(vacationRequest.Status, VacationRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden aprobar solicitudes pendientes.");
        }

        var annualDays = await GetAnnualVacationDaysAsync(cancellationToken);

        var approvedDaysWithoutCurrent = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                x.Id != vacationRequestId &&
                x.EmployeeId == vacationRequest.EmployeeId &&
                x.StartDate.Year == vacationRequest.StartDate.Year &&
                x.Status == VacationRequestStatuses.Approved)
            .SumAsync(x => x.RequestedDays, cancellationToken);

        if (approvedDaysWithoutCurrent + vacationRequest.RequestedDays > annualDays)
        {
            throw new InvalidOperationException("La aprobacion excede el limite anual de vacaciones del empleado.");
        }

        vacationRequest.Status = VacationRequestStatuses.Approved;
        vacationRequest.ReviewerComment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        vacationRequest.ReviewedAtUtc = DateTime.UtcNow;
        vacationRequest.ReviewedByUserId = reviewerUserId;
        vacationRequest.ReviewedByUserName = reviewerUserName;
        vacationRequest.UpdatedAtUtc = DateTime.UtcNow;
        vacationRequest.UpdatedBy = reviewerUserName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(reviewerUserId, reviewerUserName, "Approve", "Vacations",
            vacationRequestId.ToString(), "VacationRequest", null, null, cancellationToken);

        await notificationService.CreateForEmployeeAsync(
            vacationRequest.EmployeeId,
            "Vacaciones aprobadas",
            $"Tu solicitud de vacaciones del {vacationRequest.StartDate:dd/MM/yyyy} al {vacationRequest.EndDate:dd/MM/yyyy} fue aprobada.",
            "vacations",
            cancellationToken);

        await integrationService.DispatchEventAsync("vacation.approved", new
        {
            requestId = vacationRequest.Id,
            employeeId = vacationRequest.EmployeeId,
            employeeName = $"{vacationRequest.Employee.FirstName} {vacationRequest.Employee.LastName}",
            startDate = vacationRequest.StartDate,
            endDate = vacationRequest.EndDate,
            requestedDays = vacationRequest.RequestedDays,
            approvedBy = reviewerUserName
        }, cancellationToken);

        return ToDto(vacationRequest);
    }

    public async Task<VacationListItemDto> RejectAsync(Guid vacationRequestId, RejectVacationRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new InvalidOperationException("Debes registrar un motivo para rechazar la solicitud.");
        }

        var vacationRequest = await dbContext.VacationRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == vacationRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud de vacaciones.");

        if (!string.Equals(vacationRequest.Status, VacationRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden rechazar solicitudes pendientes.");
        }

        vacationRequest.Status = VacationRequestStatuses.Rejected;
        vacationRequest.ReviewerComment = request.Comment.Trim();
        vacationRequest.ReviewedAtUtc = DateTime.UtcNow;
        vacationRequest.ReviewedByUserId = reviewerUserId;
        vacationRequest.ReviewedByUserName = reviewerUserName;
        vacationRequest.UpdatedAtUtc = DateTime.UtcNow;
        vacationRequest.UpdatedBy = reviewerUserName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(reviewerUserId, reviewerUserName, "Reject", "Vacations",
            vacationRequestId.ToString(), "VacationRequest", null, null, cancellationToken);

        await notificationService.CreateForEmployeeAsync(
            vacationRequest.EmployeeId,
            "Vacaciones rechazadas",
            $"Tu solicitud de vacaciones del {vacationRequest.StartDate:dd/MM/yyyy} al {vacationRequest.EndDate:dd/MM/yyyy} fue rechazada. Motivo: {request.Comment}",
            "vacations",
            cancellationToken);

        return ToDto(vacationRequest);
    }

    public async Task<VacationListItemDto> CancelAsync(Guid vacationRequestId, Guid userId, string userName, CancellationToken cancellationToken = default)
    {
        var vacationRequest = await dbContext.VacationRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == vacationRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud de vacaciones.");

        if (!string.Equals(vacationRequest.Status, VacationRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden cancelar solicitudes pendientes.");
        }

        vacationRequest.Status = VacationRequestStatuses.Cancelled;
        vacationRequest.UpdatedAtUtc = DateTime.UtcNow;
        vacationRequest.UpdatedBy = userName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(userId, userName, "Cancel", "Vacations",
            vacationRequestId.ToString(), "VacationRequest", null, null, cancellationToken);

        return ToDto(vacationRequest);
    }

    private async Task<int> GetAnnualVacationDaysAsync(CancellationToken cancellationToken)
    {
        var setting = await dbContext.GeneralSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == "vacation.annual_days" && !x.IsDeleted, cancellationToken);

        return setting is not null && int.TryParse(setting.Value, out var days) && days > 0
            ? days
            : DefaultAnnualVacationDays;
    }

    private async Task<int> GetAvailableDaysAsync(Guid employeeId, int year, int annualDays, bool includePending, CancellationToken cancellationToken)
    {
        var requests = await dbContext.VacationRequests
            .AsNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                x.EmployeeId == employeeId &&
                x.StartDate.Year == year &&
                (x.Status == VacationRequestStatuses.Approved || x.Status == VacationRequestStatuses.Pending))
            .Select(x => new { x.Status, x.RequestedDays })
            .ToListAsync(cancellationToken);

        var approvedDays = requests
            .Where(x => x.Status == VacationRequestStatuses.Approved)
            .Sum(x => x.RequestedDays);

        var pendingDays = includePending
            ? requests.Where(x => x.Status == VacationRequestStatuses.Pending).Sum(x => x.RequestedDays)
            : 0;

        return Math.Max(0, annualDays - approvedDays - pendingDays);
    }

    private static VacationListItemDto ToDto(VacationRequest request, Employee employee)
    {
        return new VacationListItemDto(
            request.Id,
            request.EmployeeId,
            employee.EmployeeCode,
            employee.FirstName + " " + employee.LastName,
            employee.Area.Name,
            request.StartDate,
            request.EndDate,
            request.RequestedDays,
            request.Status,
            request.Reason,
            request.ReviewerComment,
            request.RequestedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewedByUserId,
            request.ReviewedByUserName);
    }

    private static VacationListItemDto ToDto(VacationRequest request)
    {
        return new VacationListItemDto(
            request.Id,
            request.EmployeeId,
            request.Employee.EmployeeCode,
            request.Employee.FirstName + " " + request.Employee.LastName,
            request.Employee.Area.Name,
            request.StartDate,
            request.EndDate,
            request.RequestedDays,
            request.Status,
            request.Reason,
            request.ReviewerComment,
            request.RequestedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewedByUserId,
            request.ReviewedByUserName);
    }

    private static int CountBusinessDays(DateOnly startDate, DateOnly endDate, IReadOnlySet<DateOnly> holidayDates)
    {
        var totalDays = 0;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            {
                continue;
            }

            if (holidayDates.Contains(date))
            {
                continue;
            }

            totalDays++;
        }

        return totalDays;
    }
}

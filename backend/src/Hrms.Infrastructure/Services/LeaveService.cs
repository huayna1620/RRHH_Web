using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Leaves;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class LeaveService(HrmsDbContext dbContext, IAuditService auditService, INotificationService notificationService, IIntegrationService integrationService) : ILeaveService
{
    private static readonly IReadOnlyList<LeaveTypeOptionDto> LeaveTypeOptions =
    [
        new(LeaveRequestTypes.Personal, "Permiso personal"),
        new(LeaveRequestTypes.Medical, "Licencia medica"),
        new(LeaveRequestTypes.Study, "Licencia por estudios"),
        new(LeaveRequestTypes.MaternityPaternity, "Licencia maternidad/paternidad"),
        new(LeaveRequestTypes.Other, "Otro")
    ];

    // Default max days per leave type if not configured in GeneralSettings
    private static readonly IReadOnlyDictionary<string, int> DefaultMaxDaysPerType = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        [LeaveRequestTypes.Personal] = 15,
        [LeaveRequestTypes.Medical] = 60,
        [LeaveRequestTypes.Study] = 30,
        [LeaveRequestTypes.MaternityPaternity] = 98,
        [LeaveRequestTypes.Other] = 10
    };

    public async Task<PagedResultDto<LeaveListItemDto>> GetPagedAsync(LeaveQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var leaveQuery = dbContext.LeaveRequests
            .AsNoTracking()
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            leaveQuery = leaveQuery.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search));
        }

        if (query.EmployeeId.HasValue)
        {
            leaveQuery = leaveQuery.Where(x => x.EmployeeId == query.EmployeeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim().ToLowerInvariant();
            if (!LeaveRequestStatuses.All.Contains(status))
            {
                throw new InvalidOperationException("El estado de la solicitud no es valido.");
            }

            leaveQuery = leaveQuery.Where(x => x.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.LeaveType))
        {
            var leaveType = query.LeaveType.Trim().ToLowerInvariant();
            if (!LeaveRequestTypes.All.Contains(leaveType))
            {
                throw new InvalidOperationException("El tipo de permiso/licencia no es valido.");
            }

            leaveQuery = leaveQuery.Where(x => x.LeaveType == leaveType);
        }

        if (query.StartDateFrom.HasValue)
        {
            leaveQuery = leaveQuery.Where(x => x.StartDate >= query.StartDateFrom.Value);
        }

        if (query.StartDateTo.HasValue)
        {
            leaveQuery = leaveQuery.Where(x => x.StartDate <= query.StartDateTo.Value);
        }

        if (query.Year.HasValue)
        {
            var yearStart = new DateOnly(query.Year.Value, 1, 1);
            var yearEnd = new DateOnly(query.Year.Value, 12, 31);
            leaveQuery = leaveQuery.Where(x => x.StartDate <= yearEnd && x.EndDate >= yearStart);
        }

        var totalCount = await leaveQuery.CountAsync(cancellationToken);

        var items = await leaveQuery
            .OrderByDescending(x => x.StartDate)
            .ThenBy(x => x.Employee.LastName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new LeaveListItemDto(
                x.Id,
                x.EmployeeId,
                x.Employee.EmployeeCode,
                x.Employee.FirstName + " " + x.Employee.LastName,
                x.Employee.Area.Name,
                x.LeaveType,
                x.StartDate,
                x.EndDate,
                x.RequestedDays,
                x.IsPaid,
                x.Status,
                x.Reason,
                x.ReviewerComment,
                x.RequestedAtUtc,
                x.ReviewedAtUtc,
                x.ReviewedByUserId,
                x.ReviewedByUserName))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<LeaveListItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<LeaveCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default)
    {
        var employees = await dbContext.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => new LeaveEmployeeOptionDto(x.Id, x.EmployeeCode + " - " + x.FirstName + " " + x.LastName))
            .ToListAsync(cancellationToken);

        return new LeaveCatalogsDto(employees, LeaveTypeOptions);
    }

    public async Task<LeaveListItemDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("El motivo es obligatorio.");
        }

        if (request.StartDate > request.EndDate)
        {
            throw new InvalidOperationException("La fecha de inicio no puede ser mayor a la fecha de fin.");
        }

        var leaveType = request.LeaveType.Trim().ToLowerInvariant();
        if (!LeaveRequestTypes.All.Contains(leaveType))
        {
            throw new InvalidOperationException("El tipo de permiso/licencia no es valido.");
        }

        var employee = await dbContext.Employees
            .Include(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El empleado no existe.");

        if (!employee.IsActive)
        {
            throw new InvalidOperationException("No se puede registrar solicitud para un empleado inactivo.");
        }

        var requestedDays = CountDays(request.StartDate, request.EndDate);
        if (requestedDays <= 0)
        {
            throw new InvalidOperationException("El rango de fechas no es valido.");
        }

        // Validate max days per leave type
        var maxDays = await GetMaxDaysForTypeAsync(leaveType, cancellationToken);
        var year = request.StartDate.Year;
        var usedDaysForType = await dbContext.LeaveRequests
            .AsNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                x.EmployeeId == request.EmployeeId &&
                x.LeaveType == leaveType &&
                x.StartDate.Year == year &&
                (x.Status == LeaveRequestStatuses.Approved || x.Status == LeaveRequestStatuses.Pending))
            .SumAsync(x => x.RequestedDays, cancellationToken);

        if (usedDaysForType + requestedDays > maxDays)
        {
            throw new InvalidOperationException($"Excede el limite anual de {maxDays} dias para este tipo de permiso. Usado: {usedDaysForType}, Solicitado: {requestedDays}.");
        }

        // Check overlap with other leaves
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
            throw new InvalidOperationException("Ya existe una solicitud pendiente o aprobada en ese rango.");
        }

        // Check overlap with vacations
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
            throw new InvalidOperationException("El empleado ya tiene vacaciones pendientes o aprobadas en ese rango de fechas.");
        }

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = request.EmployeeId,
            LeaveType = leaveType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            RequestedDays = requestedDays,
            IsPaid = request.IsPaid,
            Status = LeaveRequestStatuses.Pending,
            Reason = request.Reason.Trim(),
            RequestedAtUtc = DateTime.UtcNow,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.LeaveRequests.AddAsync(leaveRequest, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.CreateForUsersWithPermissionAsync(
            "leaves.approve",
            "Nueva solicitud de permiso/licencia",
            $"{employee.FirstName} {employee.LastName} solicitó un permiso del {request.StartDate:dd/MM/yyyy} al {request.EndDate:dd/MM/yyyy}.",
            "leaves",
            cancellationToken);

        return ToDto(leaveRequest, employee);
    }

    public async Task<LeaveListItemDto> ApproveAsync(Guid leaveRequestId, ApproveLeaveRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default)
    {
        var leaveRequest = await dbContext.LeaveRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == leaveRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud.");

        if (!string.Equals(leaveRequest.Status, LeaveRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden aprobar solicitudes pendientes.");
        }

        leaveRequest.Status = LeaveRequestStatuses.Approved;
        leaveRequest.ReviewerComment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();
        leaveRequest.ReviewedAtUtc = DateTime.UtcNow;
        leaveRequest.ReviewedByUserId = reviewerUserId;
        leaveRequest.ReviewedByUserName = reviewerUserName;
        leaveRequest.UpdatedAtUtc = DateTime.UtcNow;
        leaveRequest.UpdatedBy = reviewerUserName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(reviewerUserId, reviewerUserName, "Approve", "Leaves",
            leaveRequestId.ToString(), "LeaveRequest", null, null, cancellationToken);

        await notificationService.CreateForEmployeeAsync(
            leaveRequest.EmployeeId,
            "Permiso/licencia aprobado",
            $"Tu solicitud de permiso del {leaveRequest.StartDate:dd/MM/yyyy} al {leaveRequest.EndDate:dd/MM/yyyy} fue aprobada.",
            "leaves",
            cancellationToken);

        await integrationService.DispatchEventAsync("leave.approved", new
        {
            requestId = leaveRequest.Id,
            employeeId = leaveRequest.EmployeeId,
            employeeName = $"{leaveRequest.Employee.FirstName} {leaveRequest.Employee.LastName}",
            type = leaveRequest.LeaveType,
            startDate = leaveRequest.StartDate,
            endDate = leaveRequest.EndDate,
            approvedBy = reviewerUserName
        }, cancellationToken);

        return ToDto(leaveRequest);
    }

    public async Task<LeaveListItemDto> RejectAsync(Guid leaveRequestId, RejectLeaveRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new InvalidOperationException("Debes ingresar motivo de rechazo.");
        }

        var leaveRequest = await dbContext.LeaveRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == leaveRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud.");

        if (!string.Equals(leaveRequest.Status, LeaveRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden rechazar solicitudes pendientes.");
        }

        leaveRequest.Status = LeaveRequestStatuses.Rejected;
        leaveRequest.ReviewerComment = request.Comment.Trim();
        leaveRequest.ReviewedAtUtc = DateTime.UtcNow;
        leaveRequest.ReviewedByUserId = reviewerUserId;
        leaveRequest.ReviewedByUserName = reviewerUserName;
        leaveRequest.UpdatedAtUtc = DateTime.UtcNow;
        leaveRequest.UpdatedBy = reviewerUserName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(reviewerUserId, reviewerUserName, "Reject", "Leaves",
            leaveRequestId.ToString(), "LeaveRequest", null, null, cancellationToken);

        await notificationService.CreateForEmployeeAsync(
            leaveRequest.EmployeeId,
            "Permiso/licencia rechazado",
            $"Tu solicitud de permiso del {leaveRequest.StartDate:dd/MM/yyyy} al {leaveRequest.EndDate:dd/MM/yyyy} fue rechazada. Motivo: {request.Comment}",
            "leaves",
            cancellationToken);

        return ToDto(leaveRequest);
    }

    public async Task<LeaveListItemDto> CancelAsync(Guid leaveRequestId, Guid userId, string userName, CancellationToken cancellationToken = default)
    {
        var leaveRequest = await dbContext.LeaveRequests
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == leaveRequestId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe la solicitud.");

        if (!string.Equals(leaveRequest.Status, LeaveRequestStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Solo se pueden cancelar solicitudes pendientes.");
        }

        leaveRequest.Status = LeaveRequestStatuses.Cancelled;
        leaveRequest.UpdatedAtUtc = DateTime.UtcNow;
        leaveRequest.UpdatedBy = userName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(userId, userName, "Cancel", "Leaves",
            leaveRequestId.ToString(), "LeaveRequest", null, null, cancellationToken);

        return ToDto(leaveRequest);
    }

    private async Task<int> GetMaxDaysForTypeAsync(string leaveType, CancellationToken cancellationToken)
    {
        var settingKey = $"leave.{leaveType}.max_days";
        var setting = await dbContext.GeneralSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == settingKey && !x.IsDeleted, cancellationToken);

        if (setting is not null && int.TryParse(setting.Value, out var days) && days > 0)
        {
            return days;
        }

        return DefaultMaxDaysPerType.TryGetValue(leaveType, out var defaultDays) ? defaultDays : 30;
    }

    private static LeaveListItemDto ToDto(LeaveRequest request, Employee employee)
    {
        return new LeaveListItemDto(
            request.Id,
            request.EmployeeId,
            employee.EmployeeCode,
            employee.FirstName + " " + employee.LastName,
            employee.Area.Name,
            request.LeaveType,
            request.StartDate,
            request.EndDate,
            request.RequestedDays,
            request.IsPaid,
            request.Status,
            request.Reason,
            request.ReviewerComment,
            request.RequestedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewedByUserId,
            request.ReviewedByUserName);
    }

    private static LeaveListItemDto ToDto(LeaveRequest request)
    {
        return new LeaveListItemDto(
            request.Id,
            request.EmployeeId,
            request.Employee.EmployeeCode,
            request.Employee.FirstName + " " + request.Employee.LastName,
            request.Employee.Area.Name,
            request.LeaveType,
            request.StartDate,
            request.EndDate,
            request.RequestedDays,
            request.IsPaid,
            request.Status,
            request.Reason,
            request.ReviewerComment,
            request.RequestedAtUtc,
            request.ReviewedAtUtc,
            request.ReviewedByUserId,
            request.ReviewedByUserName);
    }

    private static int CountDays(DateOnly startDate, DateOnly endDate) =>
        endDate.DayNumber - startDate.DayNumber + 1;
}

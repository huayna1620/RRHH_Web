using Hrms.Application.DTOs.Attendance;
using Hrms.Application.DTOs.Common;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AttendanceIncidentService(HrmsDbContext dbContext, IAuditService auditService) : IAttendanceIncidentService
{
    public async Task<PagedResultDto<AttendanceIncidentDto>> GetPagedAsync(
        AttendanceIncidentQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 20 : Math.Min(query.PageSize, 100);

        var q = dbContext.AttendanceIncidents
            .AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .Where(x => !x.IsDeleted);

        if (query.EmployeeId.HasValue)
            q = q.Where(x => x.EmployeeId == query.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(query.IncidentType))
            q = q.Where(x => x.IncidentType == query.IncidentType.Trim().ToLowerInvariant());

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(x => x.Status == query.Status.Trim().ToLowerInvariant());

        if (query.FromDate.HasValue)
            q = q.Where(x => x.IncidentDate >= query.FromDate.Value);

        if (query.ToDate.HasValue)
            q = q.Where(x => x.IncidentDate <= query.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            q = q.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search));
        }

        var totalCount = await q.CountAsync(cancellationToken);

        // Materialize first, then project. ToDto is a regular static method (not an expression),
        // so running it client-side keeps the SQL query clean and efficient.
        var entities = await q
            .OrderByDescending(x => x.IncidentDate)
            .ThenBy(x => x.Employee.LastName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = entities.Select(ToDto).ToList();

        return new PagedResultDto<AttendanceIncidentDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<AttendanceIncidentDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var incident = await dbContext.AttendanceIncidents
            .AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Incidencia no encontrada.");

        return ToDto(incident);
    }

    public async Task<AttendanceIncidentDto> SubmitJustificationAsync(
        Guid id,
        SubmitIncidentJustificationRequestDto request,
        string submittedByUserName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.JustificationText))
            throw new InvalidOperationException("El texto de justificacion es obligatorio.");

        var incident = await dbContext.AttendanceIncidents
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Incidencia no encontrada.");

        if (incident.Status != AttendanceIncidentStatuses.Open)
            throw new InvalidOperationException($"Solo se puede justificar una incidencia con estado '{AttendanceIncidentStatuses.Open}'. Estado actual: {incident.Status}.");

        if (incident.JustificationDeadlineUtc.HasValue && DateTime.UtcNow > incident.JustificationDeadlineUtc.Value)
            throw new InvalidOperationException("El plazo para presentar la justificacion ha vencido.");

        incident.JustificationText = request.JustificationText.Trim();
        incident.JustificationSubmittedAtUtc = DateTime.UtcNow;
        incident.UpdatedAtUtc = DateTime.UtcNow;
        incident.UpdatedBy = submittedByUserName;

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(
            null,
            submittedByUserName,
            "Justify",
            "Incidents",
            incident.Id.ToString(),
            nameof(AttendanceIncident),
            $"Incidencia {incident.IncidentType} justificada por {incident.Employee.EmployeeCode} - {incident.Employee.FirstName} {incident.Employee.LastName}",
            cancellationToken: cancellationToken);
        return ToDto(incident);
    }

    public async Task<AttendanceIncidentDto> ApproveAsync(
        Guid id,
        ReviewIncidentRequestDto request,
        Guid reviewedByUserId,
        string reviewedByUserName,
        CancellationToken cancellationToken = default)
    {
        var incident = await dbContext.AttendanceIncidents
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Incidencia no encontrada.");

        if (incident.Status != AttendanceIncidentStatuses.Open)
            throw new InvalidOperationException($"Solo se puede aprobar una incidencia con estado '{AttendanceIncidentStatuses.Open}'. Estado actual: {incident.Status}.");

        if (string.IsNullOrWhiteSpace(incident.JustificationText))
            throw new InvalidOperationException("No se puede aprobar una incidencia sin justificacion enviada.");

        incident.Status = AttendanceIncidentStatuses.Justified;
        incident.ReviewedByUserId = reviewedByUserId;
        incident.ReviewedByUserName = reviewedByUserName;
        incident.ReviewedAtUtc = DateTime.UtcNow;
        incident.ReviewerComment = request.ReviewerComment?.Trim();
        incident.UpdatedAtUtc = DateTime.UtcNow;
        incident.UpdatedBy = reviewedByUserName;

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(
            reviewedByUserId,
            reviewedByUserName,
            "Approve",
            "Incidents",
            incident.Id.ToString(),
            nameof(AttendanceIncident),
            $"Incidencia {incident.IncidentType} aprobada para {incident.Employee.EmployeeCode} - {incident.Employee.FirstName} {incident.Employee.LastName}",
            cancellationToken: cancellationToken);
        return ToDto(incident);
    }

    public async Task<AttendanceIncidentDto> RejectAsync(
        Guid id,
        ReviewIncidentRequestDto request,
        Guid reviewedByUserId,
        string reviewedByUserName,
        CancellationToken cancellationToken = default)
    {
        var incident = await dbContext.AttendanceIncidents
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Incidencia no encontrada.");

        if (incident.Status != AttendanceIncidentStatuses.Open)
            throw new InvalidOperationException($"Solo se puede rechazar una incidencia con estado '{AttendanceIncidentStatuses.Open}'. Estado actual: {incident.Status}.");

        incident.Status = AttendanceIncidentStatuses.Rejected;
        incident.ReviewedByUserId = reviewedByUserId;
        incident.ReviewedByUserName = reviewedByUserName;
        incident.ReviewedAtUtc = DateTime.UtcNow;
        incident.ReviewerComment = request.ReviewerComment?.Trim();
        incident.UpdatedAtUtc = DateTime.UtcNow;
        incident.UpdatedBy = reviewedByUserName;

        await dbContext.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(
            reviewedByUserId,
            reviewedByUserName,
            "Reject",
            "Incidents",
            incident.Id.ToString(),
            nameof(AttendanceIncident),
            $"Incidencia {incident.IncidentType} rechazada para {incident.Employee.EmployeeCode} - {incident.Employee.FirstName} {incident.Employee.LastName}",
            cancellationToken: cancellationToken);
        return ToDto(incident);
    }

    public async Task<int> ExpireOpenIncidentsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        // Only expire incidents where:
        //   1) status is still Open
        //   2) deadline has passed
        //   3) the employee did NOT submit a justification before the deadline
        // Incidents with a justification already submitted must wait for the reviewer,
        // even if the deadline passed — they must not be silently expired.
        var expired = await dbContext.AttendanceIncidents
            .Where(x => !x.IsDeleted
                && x.Status == AttendanceIncidentStatuses.Open
                && x.JustificationDeadlineUtc.HasValue
                && x.JustificationDeadlineUtc.Value < now
                && x.JustificationSubmittedAtUtc == null)
            .ToListAsync(cancellationToken);

        if (expired.Count == 0)
            return 0;

        foreach (var incident in expired)
        {
            incident.Status = AttendanceIncidentStatuses.Expired;
            incident.UpdatedAtUtc = now;
            incident.UpdatedBy = "system";
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return expired.Count;
    }

    public async Task<IReadOnlyList<AttendanceIncidentSummaryDto>> GetIncidentSummaryAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        var incidents = await dbContext.AttendanceIncidents
            .AsNoTracking()
            .Include(x => x.Employee)
            .Where(x => !x.IsDeleted && x.IncidentDate >= fromDate && x.IncidentDate <= toDate)
            .ToListAsync(cancellationToken);

        var grouped = incidents
            .GroupBy(x => new { x.EmployeeId, x.Employee.EmployeeCode, FullName = x.Employee.FirstName + " " + x.Employee.LastName })
            .Select(g => new AttendanceIncidentSummaryDto(
                EmployeeId: g.Key.EmployeeId,
                EmployeeCode: g.Key.EmployeeCode,
                EmployeeName: g.Key.FullName,
                OpenCount: g.Count(x => x.Status == AttendanceIncidentStatuses.Open),
                JustifiedCount: g.Count(x => x.Status == AttendanceIncidentStatuses.Justified),
                RejectedCount: g.Count(x => x.Status == AttendanceIncidentStatuses.Rejected),
                ExpiredCount: g.Count(x => x.Status == AttendanceIncidentStatuses.Expired),
                TotalTardanzaMinutes: g.Where(x => x.IncidentType == AttendanceIncidentTypes.Tardanza
                    && x.Status != AttendanceIncidentStatuses.Justified).Sum(x => x.MinutesImpacted),
                TotalSalidaAnticipadaMinutes: g.Where(x => x.IncidentType == AttendanceIncidentTypes.SalidaAnticipada
                    && x.Status != AttendanceIncidentStatuses.Justified).Sum(x => x.MinutesImpacted),
                TotalFaltas: g.Count(x => x.IncidentType == AttendanceIncidentTypes.Falta
                    && x.Status != AttendanceIncidentStatuses.Justified),
                TotalNoMarcaciones: g.Count(x => x.IncidentType == AttendanceIncidentTypes.NoMarcacion
                    && x.Status != AttendanceIncidentStatuses.Justified)))
            .OrderBy(x => x.EmployeeName)
            .ToList();

        return grouped;
    }

    public async Task<AttendanceIncidentStatsDto> GetStatsAsync(
        AttendanceIncidentQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var q = dbContext.AttendanceIncidents
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (query.EmployeeId.HasValue)
            q = q.Where(x => x.EmployeeId == query.EmployeeId.Value);

        if (!string.IsNullOrWhiteSpace(query.IncidentType))
            q = q.Where(x => x.IncidentType == query.IncidentType.Trim().ToLowerInvariant());

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(x => x.Status == query.Status.Trim().ToLowerInvariant());

        if (query.FromDate.HasValue)
            q = q.Where(x => x.IncidentDate >= query.FromDate.Value);

        if (query.ToDate.HasValue)
            q = q.Where(x => x.IncidentDate <= query.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            q = q.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search));
        }

        var grouped = await q
            .GroupBy(x => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Open = g.Count(x => x.Status == AttendanceIncidentStatuses.Open),
                Justified = g.Count(x => x.Status == AttendanceIncidentStatuses.Justified),
                Rejected = g.Count(x => x.Status == AttendanceIncidentStatuses.Rejected),
                Expired = g.Count(x => x.Status == AttendanceIncidentStatuses.Expired),
                OpenPendingReview = g.Count(x => x.Status == AttendanceIncidentStatuses.Open && x.JustificationSubmittedAtUtc != null),
                OpenAwaitingJustification = g.Count(x => x.Status == AttendanceIncidentStatuses.Open && x.JustificationSubmittedAtUtc == null)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (grouped is null)
            return new AttendanceIncidentStatsDto(0, 0, 0, 0, 0, 0, 0);

        return new AttendanceIncidentStatsDto(
            grouped.Total,
            grouped.Open,
            grouped.Justified,
            grouped.Rejected,
            grouped.Expired,
            grouped.OpenPendingReview,
            grouped.OpenAwaitingJustification);
    }

    private static AttendanceIncidentDto ToDto(AttendanceIncident x) =>
        new(
            x.Id,
            x.EmployeeId,
            x.Employee.EmployeeCode,
            x.Employee.FirstName + " " + x.Employee.LastName,
            x.Employee.Area.Name,
            x.AttendanceRecordId,
            x.IncidentType,
            x.IncidentDate,
            x.MinutesImpacted,
            x.Status,
            x.JustificationText,
            x.JustificationSubmittedAtUtc,
            x.JustificationDeadlineUtc,
            x.ReviewedByUserName,
            x.ReviewedAtUtc,
            x.ReviewerComment,
            x.CreatedAtUtc);
}

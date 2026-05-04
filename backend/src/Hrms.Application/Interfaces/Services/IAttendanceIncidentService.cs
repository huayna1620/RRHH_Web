using Hrms.Application.DTOs.Attendance;
using Hrms.Application.DTOs.Common;

namespace Hrms.Application.Interfaces.Services;

public interface IAttendanceIncidentService
{
    Task<PagedResultDto<AttendanceIncidentDto>> GetPagedAsync(AttendanceIncidentQueryDto query, CancellationToken cancellationToken = default);

    Task<AttendanceIncidentDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AttendanceIncidentDto> SubmitJustificationAsync(Guid id, SubmitIncidentJustificationRequestDto request, string submittedByUserName, CancellationToken cancellationToken = default);

    Task<AttendanceIncidentDto> ApproveAsync(Guid id, ReviewIncidentRequestDto request, Guid reviewedByUserId, string reviewedByUserName, CancellationToken cancellationToken = default);

    Task<AttendanceIncidentDto> RejectAsync(Guid id, ReviewIncidentRequestDto request, Guid reviewedByUserId, string reviewedByUserName, CancellationToken cancellationToken = default);

    /// <summary>Marks open incidents past their deadline as expired. Call from a scheduled trigger or manually.</summary>
    Task<int> ExpireOpenIncidentsAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns per-employee incident summary for a period. Used by FASE 3 payroll.</summary>
    Task<IReadOnlyList<AttendanceIncidentSummaryDto>> GetIncidentSummaryAsync(DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken = default);

    /// <summary>Global counters for the incidents page KPI cards. Applies the same filters as GetPagedAsync.</summary>
    Task<AttendanceIncidentStatsDto> GetStatsAsync(AttendanceIncidentQueryDto query, CancellationToken cancellationToken = default);
}

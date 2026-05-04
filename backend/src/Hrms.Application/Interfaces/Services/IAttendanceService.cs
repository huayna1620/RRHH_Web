using Hrms.Application.DTOs.Attendance;
using Hrms.Application.DTOs.Common;

namespace Hrms.Application.Interfaces.Services;

public interface IAttendanceService
{
    Task<PagedResultDto<AttendanceListItemDto>> GetPagedAsync(AttendanceQueryDto query, CancellationToken cancellationToken = default);
    Task<AttendanceListItemDto> CheckInAsync(CheckInRequestDto request, CancellationToken cancellationToken = default);
    Task<AttendanceListItemDto> CheckOutAsync(Guid attendanceId, CheckOutRequestDto request, CancellationToken cancellationToken = default);
    Task<AttendanceListItemDto> MarkAbsentAsync(MarkAbsentRequestDto request, CancellationToken cancellationToken = default);
    Task<AttendanceListItemDto> JustifyAsync(Guid attendanceId, JustifyAttendanceRequestDto request, CancellationToken cancellationToken = default);
    Task<AttendanceCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default);
    Task<AttendanceSummaryDto> GetSummaryAsync(AttendanceQueryDto query, CancellationToken cancellationToken = default);
}

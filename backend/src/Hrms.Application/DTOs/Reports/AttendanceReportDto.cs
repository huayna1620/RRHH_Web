namespace Hrms.Application.DTOs.Reports;

public sealed record AttendanceReportDto(
    int Year,
    int Month,
    int TotalRecords,
    int PresentRecords,
    int AbsentRecords,
    int LateRecords,
    double AverageLateMinutes,
    IReadOnlyList<AttendanceDailyReportItemDto> Daily);

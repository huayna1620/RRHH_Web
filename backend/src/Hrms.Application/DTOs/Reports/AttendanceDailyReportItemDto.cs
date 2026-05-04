namespace Hrms.Application.DTOs.Reports;

public sealed record AttendanceDailyReportItemDto(
    DateOnly Date,
    int TotalRecords,
    int PresentRecords,
    int AbsentRecords,
    int LateRecords);

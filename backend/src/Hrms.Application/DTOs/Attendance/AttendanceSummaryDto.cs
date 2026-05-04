namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceSummaryDto(
    int OnTime,
    int Late,
    int Absent,
    int Justified,
    int PendingCheckOut,
    int Present,
    int NoRecord);

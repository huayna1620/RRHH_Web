namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceScheduleDto(
    string TimeZoneId,
    string ShiftName,
    string ExpectedStart,
    string ExpectedEnd);

public sealed record AttendanceAreaOptionDto(Guid Id, string Name);

public sealed record AttendanceCatalogsDto(
    IReadOnlyList<AttendanceEmployeeOptionDto> Employees,
    IReadOnlyList<AttendanceAreaOptionDto> Areas,
    AttendanceScheduleDto Schedule);

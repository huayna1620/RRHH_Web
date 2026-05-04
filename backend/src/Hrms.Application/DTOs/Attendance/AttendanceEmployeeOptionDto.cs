namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceEmployeeOptionDto(
    Guid Id,
    string Label,
    string EmployeeCode,
    string? DocumentNumber,
    string FullName,
    Guid AreaId,
    string Area,
    string Position,
    string ShiftName,
    string ExpectedSchedule);

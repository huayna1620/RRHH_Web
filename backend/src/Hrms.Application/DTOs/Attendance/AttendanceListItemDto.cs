namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceListItemDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string Area,
    DateOnly AttendanceDate,
    DateTime? CheckInAtUtc,
    DateTime? CheckOutAtUtc,
    int LateMinutes,
    bool IsAbsent,
    string? Justification,
    bool IsJustified);

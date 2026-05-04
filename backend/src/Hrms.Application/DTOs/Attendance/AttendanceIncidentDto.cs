namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceIncidentDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string Area,
    Guid AttendanceRecordId,
    string IncidentType,
    DateOnly IncidentDate,
    int MinutesImpacted,
    string Status,
    string? JustificationText,
    DateTime? JustificationSubmittedAtUtc,
    DateTime? JustificationDeadlineUtc,
    string? ReviewedByUserName,
    DateTime? ReviewedAtUtc,
    string? ReviewerComment,
    DateTime CreatedAtUtc);

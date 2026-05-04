namespace Hrms.Application.DTOs.Attendance;

public sealed record AttendanceIncidentQueryDto(
    Guid? EmployeeId,
    string? IncidentType,
    string? Status,
    DateOnly? FromDate,
    DateOnly? ToDate,
    string? Search,
    int PageNumber = 1,
    int PageSize = 20);

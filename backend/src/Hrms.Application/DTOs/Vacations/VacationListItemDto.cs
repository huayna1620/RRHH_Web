namespace Hrms.Application.DTOs.Vacations;

public sealed record VacationListItemDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string Area,
    DateOnly StartDate,
    DateOnly EndDate,
    int RequestedDays,
    string Status,
    string? Reason,
    string? ReviewerComment,
    DateTime RequestedAtUtc,
    DateTime? ReviewedAtUtc,
    Guid? ReviewedByUserId,
    string? ReviewedByUserName);

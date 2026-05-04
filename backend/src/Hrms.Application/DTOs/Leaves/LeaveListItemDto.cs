namespace Hrms.Application.DTOs.Leaves;

public sealed record LeaveListItemDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string Area,
    string LeaveType,
    DateOnly StartDate,
    DateOnly EndDate,
    int RequestedDays,
    bool IsPaid,
    string Status,
    string? Reason,
    string? ReviewerComment,
    DateTime RequestedAtUtc,
    DateTime? ReviewedAtUtc,
    Guid? ReviewedByUserId,
    string? ReviewedByUserName);

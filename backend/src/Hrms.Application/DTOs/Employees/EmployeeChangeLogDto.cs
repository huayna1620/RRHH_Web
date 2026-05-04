namespace Hrms.Application.DTOs.Employees;

public sealed record EmployeeChangeLogDto(
    Guid Id,
    Guid EmployeeId,
    string ChangeType,
    string FieldName,
    string? OldValue,
    string? NewValue,
    string? Reason,
    Guid? ChangedByUserId,
    string? ChangedByUserName,
    DateTime ChangedAtUtc);

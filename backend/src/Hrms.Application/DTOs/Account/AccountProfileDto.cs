namespace Hrms.Application.DTOs.Account;

public sealed record AccountProfileDto(
    Guid Id,
    string UserName,
    string FullName,
    string Email,
    IReadOnlyList<string> Roles,
    Guid? EmployeeId,
    string? EmployeeName,
    string? EmployeeCode,
    DateTime? LastLoginAtUtc);

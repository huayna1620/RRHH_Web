namespace Hrms.Application.DTOs.Users;

public sealed record UserDto(
    Guid Id,
    string UserName,
    string Email,
    string FullName,
    bool IsActive,
    IReadOnlyList<string> Roles,
    Guid? EmployeeId,
    string? EmployeeName,
    DateTime? LastLoginAtUtc);

namespace Hrms.Application.DTOs.Users;

public sealed record UpdateUserRequestDto(
    string FullName,
    string Email,
    IReadOnlyList<Guid> RoleIds,
    Guid? EmployeeId);

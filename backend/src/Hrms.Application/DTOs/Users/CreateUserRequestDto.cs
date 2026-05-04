namespace Hrms.Application.DTOs.Users;

public sealed record CreateUserRequestDto(
    string UserName,
    string Email,
    string FullName,
    string Password,
    IReadOnlyList<Guid> RoleIds);

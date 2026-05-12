namespace Hrms.Application.DTOs.Roles;

public sealed record UpdateRoleRequestDto(string Name, string Description, bool IsActive);

namespace Hrms.Application.DTOs.Roles;

public sealed record RoleDto(Guid Id, string Name, string Description, bool IsActive);

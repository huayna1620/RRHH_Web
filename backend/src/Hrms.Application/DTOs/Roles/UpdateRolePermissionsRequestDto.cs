namespace Hrms.Application.DTOs.Roles;

public sealed record UpdateRolePermissionsRequestDto(IReadOnlyList<Guid> PermissionIds);

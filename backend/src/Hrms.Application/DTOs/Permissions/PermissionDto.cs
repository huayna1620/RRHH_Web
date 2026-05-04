namespace Hrms.Application.DTOs.Permissions;

public sealed record PermissionDto(Guid Id, string Code, string Name, string Module);

namespace Hrms.Application.DTOs.Roles;

public sealed record RoleDto(
    Guid Id,
    string Name,
    string Description,
    bool IsActive,
    int UserCount,
    int PermissionCount,
    DateTime CreatedAtUtc,
    string? CreatedBy,
    DateTime? UpdatedAtUtc,
    string? UpdatedBy);

using Hrms.Application.DTOs.Roles;

namespace Hrms.Application.Interfaces.Services;

public interface IRoleService
{
    Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<RoleDto> CreateAsync(CreateRoleRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdatePermissionsAsync(Guid roleId, IReadOnlyList<Guid> permissionIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Guid>> GetPermissionIdsByRoleIdAsync(Guid roleId, CancellationToken cancellationToken = default);
}

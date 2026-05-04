using Hrms.Application.DTOs.Permissions;
using Hrms.Application.Interfaces.Persistence;
using Hrms.Application.Interfaces.Services;

namespace Hrms.Infrastructure.Services;

public sealed class PermissionService(IPermissionRepository permissionRepository) : IPermissionService
{
    public async Task<IReadOnlyList<PermissionDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await permissionRepository.GetAllAsync(cancellationToken);

        return permissions
            .Select(x => new PermissionDto(x.Id, x.Code, x.Name, x.Module))
            .ToList();
    }
}

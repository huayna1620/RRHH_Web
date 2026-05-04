using Hrms.Application.DTOs.Permissions;

namespace Hrms.Application.Interfaces.Services;

public interface IPermissionService
{
    Task<IReadOnlyList<PermissionDto>> GetAllAsync(CancellationToken cancellationToken = default);
}

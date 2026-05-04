using Hrms.Application.Interfaces.Persistence;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Repositories;

public sealed class PermissionRepository(HrmsDbContext dbContext) : IPermissionRepository
{
    public async Task<IReadOnlyList<Permission>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Permissions
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Module)
            .ThenBy(x => x.Code)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Permission>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default)
    {
        var idSet = ids.Distinct().ToList();
        return await dbContext.Permissions
            .Where(x => idSet.Contains(x.Id) && !x.IsDeleted)
            .ToListAsync(cancellationToken);
    }
}

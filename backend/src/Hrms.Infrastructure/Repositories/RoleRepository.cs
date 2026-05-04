using Hrms.Application.Interfaces.Persistence;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Repositories;

public sealed class RoleRepository(HrmsDbContext dbContext) : IRoleRepository
{
    public Task<Role?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Roles
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

    public Task<Role?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToUpperInvariant();
        return dbContext.Roles.FirstOrDefaultAsync(x => x.NormalizedName == normalized && !x.IsDeleted, cancellationToken);
    }

    public async Task<IReadOnlyList<Role>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Roles
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Role>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default)
    {
        var idSet = ids.Distinct().ToList();
        return await dbContext.Roles
            .Where(x => idSet.Contains(x.Id) && !x.IsDeleted)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(Role role, CancellationToken cancellationToken = default) => dbContext.Roles.AddAsync(role, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => dbContext.SaveChangesAsync(cancellationToken);
}

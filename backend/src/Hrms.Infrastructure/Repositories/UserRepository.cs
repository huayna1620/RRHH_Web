using Hrms.Application.Interfaces.Persistence;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Repositories;

public sealed class UserRepository(HrmsDbContext dbContext) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        dbContext.Users
            .Include(x => x.UserRoles)
                .ThenInclude(x => x.Role)
                    .ThenInclude(x => x.RolePermissions)
                        .ThenInclude(x => x.Permission)
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

    public Task<User?> GetByUserNameOrEmailAsync(string userNameOrEmail, CancellationToken cancellationToken = default)
    {
        var normalized = userNameOrEmail.Trim().ToUpperInvariant();
        return dbContext.Users
            .Include(x => x.UserRoles)
                .ThenInclude(x => x.Role)
                    .ThenInclude(x => x.RolePermissions)
                        .ThenInclude(x => x.Permission)
            .FirstOrDefaultAsync(
                x => (x.NormalizedUserName == normalized || x.NormalizedEmail == normalized) && !x.IsDeleted,
                cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToUpperInvariant();
        return dbContext.Users
            .FirstOrDefaultAsync(x => x.NormalizedEmail == normalized && !x.IsDeleted, cancellationToken);
    }

    public Task<User?> GetByResetPasswordTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        dbContext.Users.FirstOrDefaultAsync(
            x => x.ResetPasswordTokenHash == tokenHash && !x.IsDeleted,
            cancellationToken);

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Users
            .AsNoTracking()
            .Include(x => x.UserRoles)
                .ThenInclude(x => x.Role)
            .Include(x => x.Employee)
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.FullName)
            .ToListAsync(cancellationToken);

    public Task AddAsync(User user, CancellationToken cancellationToken = default) => dbContext.Users.AddAsync(user, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => dbContext.SaveChangesAsync(cancellationToken);
}

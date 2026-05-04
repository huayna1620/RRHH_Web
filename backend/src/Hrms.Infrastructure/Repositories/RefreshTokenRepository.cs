using Hrms.Application.Interfaces.Persistence;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Repositories;

public sealed class RefreshTokenRepository(HrmsDbContext dbContext) : IRefreshTokenRepository
{
    public Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default) =>
        dbContext.RefreshTokens.AddAsync(refreshToken, cancellationToken).AsTask();

    public Task<RefreshToken?> GetByHashedTokenAsync(string hashedToken, CancellationToken cancellationToken = default) =>
        dbContext.RefreshTokens
            .Include(x => x.User)
                .ThenInclude(x => x.UserRoles)
                    .ThenInclude(x => x.Role)
                        .ThenInclude(x => x.RolePermissions)
                            .ThenInclude(x => x.Permission)
            .FirstOrDefaultAsync(x => x.TokenHash == hashedToken && !x.IsDeleted, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => dbContext.SaveChangesAsync(cancellationToken);
}

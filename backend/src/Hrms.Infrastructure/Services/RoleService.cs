using Hrms.Application.DTOs.Roles;
using Hrms.Application.Interfaces.Persistence;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class RoleService(
    IRoleRepository roleRepository,
    IPermissionRepository permissionRepository,
    HrmsDbContext dbContext) : IRoleService
{
    public async Task<IReadOnlyList<RoleDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var roles = await roleRepository.GetAllAsync(cancellationToken);
        return roles.Select(x => new RoleDto(x.Id, x.Name, x.Description, x.IsActive)).ToList();
    }

    public async Task<RoleDto> CreateAsync(CreateRoleRequestDto request, CancellationToken cancellationToken = default)
    {
        var existing = await roleRepository.GetByNameAsync(request.Name, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("El rol ya existe.");
        }

        var role = new Role
        {
            Name = request.Name.Trim(),
            NormalizedName = request.Name.Trim().ToUpperInvariant(),
            Description = request.Description.Trim(),
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await roleRepository.AddAsync(role, cancellationToken);
        await roleRepository.SaveChangesAsync(cancellationToken);

        return new RoleDto(role.Id, role.Name, role.Description, role.IsActive);
    }

    public async Task<IReadOnlyList<Guid>> GetPermissionIdsByRoleIdAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        return await dbContext.RolePermissions
            .AsNoTracking()
            .Where(x => x.RoleId == roleId)
            .Select(x => x.PermissionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> UpdatePermissionsAsync(Guid roleId, IReadOnlyList<Guid> permissionIds, CancellationToken cancellationToken = default)
    {
        var role = await dbContext.Roles
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(x => x.Id == roleId && !x.IsDeleted, cancellationToken);

        if (role is null)
        {
            return false;
        }

        var permissions = await permissionRepository.GetByIdsAsync(permissionIds, cancellationToken);

        dbContext.RolePermissions.RemoveRange(role.RolePermissions);

        var rolePermissions = permissions
            .Select(permission => new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id
            })
            .ToList();

        await dbContext.RolePermissions.AddRangeAsync(rolePermissions, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }
}

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
        return await dbContext.Roles
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => ToDto(
                x.Id,
                x.Name,
                x.Description,
                x.IsActive,
                x.UserRoles.Count,
                x.RolePermissions.Count,
                x.CreatedAtUtc,
                x.CreatedBy,
                x.UpdatedAtUtc,
                x.UpdatedBy))
            .ToListAsync(cancellationToken);
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

        return ToDto(role, 0, 0);
    }

    public async Task<RoleDto?> UpdateAsync(Guid roleId, UpdateRoleRequestDto request, CancellationToken cancellationToken = default)
    {
        var role = await dbContext.Roles
            .Include(x => x.UserRoles)
            .Include(x => x.RolePermissions)
            .FirstOrDefaultAsync(x => x.Id == roleId && !x.IsDeleted, cancellationToken);

        if (role is null)
        {
            return null;
        }

        var normalizedName = request.Name.Trim().ToUpperInvariant();
        var duplicate = await dbContext.Roles
            .AnyAsync(x => x.Id != roleId && x.NormalizedName == normalizedName && !x.IsDeleted, cancellationToken);

        if (duplicate)
        {
            throw new InvalidOperationException("El rol ya existe.");
        }

        role.Name = request.Name.Trim();
        role.NormalizedName = normalizedName;
        role.Description = request.Description.Trim();
        role.IsActive = request.IsActive;
        role.UpdatedAtUtc = DateTime.UtcNow;
        role.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(role, role.UserRoles.Count, role.RolePermissions.Count);
    }

    public async Task<bool> UpdateStatusAsync(Guid roleId, bool isActive, CancellationToken cancellationToken = default)
    {
        var role = await dbContext.Roles.FirstOrDefaultAsync(x => x.Id == roleId && !x.IsDeleted, cancellationToken);

        if (role is null)
        {
            return false;
        }

        role.IsActive = isActive;
        role.UpdatedAtUtc = DateTime.UtcNow;
        role.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
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
        role.UpdatedAtUtc = DateTime.UtcNow;
        role.UpdatedBy = "system";
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static RoleDto ToDto(Role role, int userCount, int permissionCount) =>
        ToDto(
            role.Id,
            role.Name,
            role.Description,
            role.IsActive,
            userCount,
            permissionCount,
            role.CreatedAtUtc,
            role.CreatedBy,
            role.UpdatedAtUtc,
            role.UpdatedBy);

    private static RoleDto ToDto(
        Guid id,
        string name,
        string description,
        bool isActive,
        int userCount,
        int permissionCount,
        DateTime createdAtUtc,
        string? createdBy,
        DateTime? updatedAtUtc,
        string? updatedBy) =>
        new(id, name, description, isActive, userCount, permissionCount, createdAtUtc, createdBy, updatedAtUtc, updatedBy);
}

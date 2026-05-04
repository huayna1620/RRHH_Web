using Hrms.Application.DTOs.Users;
using Hrms.Application.Interfaces.Persistence;
using Hrms.Application.Interfaces.Security;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;

namespace Hrms.Infrastructure.Services;

public sealed class UserService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IPasswordHasherService passwordHasherService) : IUserService
{
    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await userRepository.GetAllAsync(cancellationToken);

        return users
            .Select(ToDto)
            .ToList();
    }

    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        return user is null ? null : ToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequestDto request, CancellationToken cancellationToken = default)
    {
        var existingByUserName = await userRepository.GetByUserNameOrEmailAsync(request.UserName, cancellationToken);
        if (existingByUserName is not null)
        {
            throw new InvalidOperationException("El nombre de usuario ya existe.");
        }

        var existingByEmail = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingByEmail is not null)
        {
            throw new InvalidOperationException("El correo ya existe.");
        }

        var roles = await roleRepository.GetByIdsAsync(request.RoleIds, cancellationToken);
        if (roles.Count == 0)
        {
            throw new InvalidOperationException("Debe asignar al menos un rol v�lido.");
        }

        var user = new User
        {
            UserName = request.UserName.Trim(),
            NormalizedUserName = request.UserName.Trim().ToUpperInvariant(),
            Email = request.Email.Trim(),
            NormalizedEmail = request.Email.Trim().ToUpperInvariant(),
            FullName = request.FullName.Trim(),
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        user.PasswordHash = passwordHasherService.HashPassword(user, request.Password);

        foreach (var role in roles)
        {
            user.UserRoles.Add(new UserRole { User = user, Role = role, UserId = user.Id, RoleId = role.Id });
        }

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var existingByEmail = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingByEmail is not null && existingByEmail.Id != id)
        {
            throw new InvalidOperationException("El correo ya est\u00e1 en uso por otro usuario.");
        }

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();
        user.NormalizedEmail = normalizedEmail;
        user.EmployeeId = request.EmployeeId;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = "system";

        var newRoles = await roleRepository.GetByIdsAsync(request.RoleIds, cancellationToken);
        if (newRoles.Count == 0)
        {
            throw new InvalidOperationException("Debe asignar al menos un rol v\u00e1lido.");
        }

        user.UserRoles.Clear();
        foreach (var role in newRoles)
        {
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        }

        await userRepository.SaveChangesAsync(cancellationToken);

        return ToDto(user);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.IsActive = isActive;
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = "system";

        await userRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static UserDto ToDto(User user)
    {
        var roles = user.UserRoles.Select(x => x.Role.Name).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        return new UserDto(
            user.Id,
            user.UserName,
            user.Email,
            user.FullName,
            user.IsActive,
            roles,
            user.EmployeeId,
            user.Employee is null ? null : user.Employee.FirstName + " " + user.Employee.LastName,
            user.LastLoginAtUtc);
    }
}

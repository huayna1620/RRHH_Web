using Hrms.Application.DTOs.Users;

namespace Hrms.Application.Interfaces.Services;

public interface IUserService
{
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UserDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserDto> CreateAsync(CreateUserRequestDto request, CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
}

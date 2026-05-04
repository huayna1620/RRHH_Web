using Hrms.Application.DTOs.Notifications;

namespace Hrms.Application.Interfaces.Services;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string title, string message, string? category, CancellationToken cancellationToken = default);
    Task CreateForUsersWithPermissionAsync(string permissionCode, string title, string message, string? category, CancellationToken cancellationToken = default);
    Task CreateForEmployeeAsync(Guid employeeId, string title, string message, string? category, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppNotificationDto>> GetRecentAsync(Guid userId, int limit, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default);
    Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);
}

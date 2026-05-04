using Hrms.Application.DTOs.Notifications;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class NotificationService(HrmsDbContext dbContext) : INotificationService
{
    public async Task CreateAsync(Guid userId, string title, string message, string? category, CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty) return;
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(message)) return;

        var notification = new AppNotification
        {
            UserId = userId,
            Title = title.Length > 200 ? title[..200] : title,
            Message = message.Length > 1000 ? message[..1000] : message,
            Category = category,
            CreatedAtUtc = DateTime.UtcNow
        };
        await dbContext.AppNotifications.AddAsync(notification, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task CreateForUsersWithPermissionAsync(string permissionCode, string title, string message, string? category, CancellationToken cancellationToken = default)
    {
        var userIds = await dbContext.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted && u.IsActive &&
                u.UserRoles.Any(ur => ur.Role.RolePermissions.Any(rp => rp.Permission.Code == permissionCode)))
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (userIds.Count == 0) return;

        var notifications = userIds.Select(uid => new AppNotification
        {
            UserId = uid,
            Title = title,
            Message = message,
            Category = category,
            CreatedAtUtc = DateTime.UtcNow
        }).ToList();

        await dbContext.AppNotifications.AddRangeAsync(notifications, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task CreateForEmployeeAsync(Guid employeeId, string title, string message, string? category, CancellationToken cancellationToken = default)
    {
        if (employeeId == Guid.Empty) return;

        var userId = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.EmployeeId == employeeId && !u.IsDeleted && u.IsActive)
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        // Employee has no linked active user — skip silently (common for employees without system access)
        if (userId == Guid.Empty) return;

        await CreateAsync(userId, title, message, category, cancellationToken);
    }

    public async Task<IReadOnlyList<AppNotificationDto>> GetRecentAsync(Guid userId, int limit, CancellationToken cancellationToken = default)
    {
        var safeLimit = Math.Min(Math.Max(1, limit), 50);
        return await dbContext.AppNotifications
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(safeLimit)
            .Select(x => new AppNotificationDto(x.Id, x.Title, x.Message, x.Category, x.IsRead, x.ReadAtUtc, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await dbContext.AppNotifications
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && !x.IsRead, cancellationToken);
    }

    public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var notification = await dbContext.AppNotifications
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == userId, cancellationToken);

        if (notification is null || notification.IsRead) return false;

        notification.IsRead = true;
        notification.ReadAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await dbContext.AppNotifications
            .Where(x => x.UserId == userId && !x.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAtUtc, now),
            cancellationToken);
    }
}

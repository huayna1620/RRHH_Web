namespace Hrms.Application.DTOs.Notifications;

public sealed record AppNotificationDto(
    Guid Id,
    string Title,
    string Message,
    string? Category,
    bool IsRead,
    DateTime? ReadAtUtc,
    DateTime CreatedAtUtc);

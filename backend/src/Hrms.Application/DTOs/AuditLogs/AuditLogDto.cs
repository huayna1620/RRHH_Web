namespace Hrms.Application.DTOs.AuditLogs;

public sealed record AuditLogDto(
    Guid Id,
    Guid? UserId,
    string UserName,
    string Action,
    string Module,
    string EntityId,
    string EntityType,
    string? Details,
    string? IpAddress,
    DateTime Timestamp);

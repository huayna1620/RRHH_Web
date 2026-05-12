namespace Hrms.Application.DTOs.AuditLogs;

public sealed record AuditLogQueryDto(
    string? Search = null,
    string? Module = null,
    string? Action = null,
    string? UserName = null,
    Guid? UserId = null,
    DateTime? From = null,
    DateTime? To = null,
    int PageNumber = 1,
    int PageSize = 20);

using Hrms.Application.DTOs.AuditLogs;
using Hrms.Application.DTOs.Common;

namespace Hrms.Application.Interfaces.Services;

public interface IAuditService
{
    Task LogAsync(
        Guid? userId,
        string userName,
        string action,
        string module,
        string entityId,
        string entityType,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task<PagedResultDto<AuditLogDto>> GetPagedAsync(AuditLogQueryDto query, CancellationToken cancellationToken = default);
}

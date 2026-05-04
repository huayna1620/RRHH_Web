using Hrms.Application.DTOs.AuditLogs;
using Hrms.Application.DTOs.Common;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AuditService(HrmsDbContext dbContext) : IAuditService
{
    public async Task LogAsync(
        Guid? userId,
        string userName,
        string action,
        string module,
        string entityId,
        string entityType,
        string? details = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var auditLog = new AuditLog
        {
            UserId = userId,
            UserName = userName,
            Action = action,
            Module = module,
            EntityId = entityId,
            EntityType = entityType,
            Details = details,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        await dbContext.AuditLogs.AddAsync(auditLog, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResultDto<AuditLogDto>> GetPagedAsync(AuditLogQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 20 : Math.Min(query.PageSize, 100);

        var auditQuery = dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            auditQuery = auditQuery.Where(x =>
                x.UserName.ToLower().Contains(search) ||
                x.EntityType.ToLower().Contains(search) ||
                x.EntityId.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Module))
        {
            var module = query.Module.Trim().ToLowerInvariant();
            auditQuery = auditQuery.Where(x => x.Module.ToLower() == module);
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim().ToLowerInvariant();
            auditQuery = auditQuery.Where(x => x.Action.ToLower() == action);
        }

        if (query.UserId.HasValue)
        {
            auditQuery = auditQuery.Where(x => x.UserId == query.UserId.Value);
        }

        if (query.From.HasValue)
        {
            auditQuery = auditQuery.Where(x => x.Timestamp >= query.From.Value);
        }

        if (query.To.HasValue)
        {
            auditQuery = auditQuery.Where(x => x.Timestamp <= query.To.Value);
        }

        var totalCount = await auditQuery.CountAsync(cancellationToken);

        var items = await auditQuery
            .OrderByDescending(x => x.Timestamp)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AuditLogDto(
                x.Id,
                x.UserId,
                x.UserName,
                x.Action,
                x.Module,
                x.EntityId,
                x.EntityType,
                x.Details,
                x.IpAddress,
                x.Timestamp))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AuditLogDto>(items, pageNumber, pageSize, totalCount);
    }
}

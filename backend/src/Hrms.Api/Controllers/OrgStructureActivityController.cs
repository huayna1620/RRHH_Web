using Hrms.Infrastructure.Persistence.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/org-structure/activity")]
[Authorize]
public sealed class OrgStructureActivityController(HrmsDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRecent([FromQuery] int pageSize = 5, CancellationToken cancellationToken = default)
    {
        var size = pageSize <= 0 ? 5 : Math.Min(pageSize, 20);

        var items = await dbContext.AuditLogs
            .AsNoTracking()
            .Where(x => x.Module == "org.areas" || x.Module == "org.positions")
            .OrderByDescending(x => x.Timestamp)
            .Take(size)
            .Select(x => new OrgStructureActivityDto(
                x.Id,
                x.Module,
                x.EntityType,
                x.Details ?? x.EntityType,
                x.Action,
                x.UserName,
                x.Timestamp))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}

public sealed record OrgStructureActivityDto(
    Guid Id,
    string Module,
    string EntityType,
    string EntityName,
    string Action,
    string UserName,
    DateTime Timestamp);

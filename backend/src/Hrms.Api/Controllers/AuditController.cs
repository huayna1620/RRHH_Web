using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.AuditLogs;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize]
public sealed class AuditController(IAuditService auditService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.AuditLogView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] AuditLogQueryDto query, CancellationToken cancellationToken)
    {
        var result = await auditService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }
}

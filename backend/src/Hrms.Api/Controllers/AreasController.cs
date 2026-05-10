using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Areas;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/areas")]
[Authorize]
public sealed class AreasController(IAreaService areaService, IAuditService auditService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.AreasView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] AreaQueryDto query, CancellationToken cancellationToken)
    {
        var result = await areaService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AreasView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var area = await areaService.GetByIdAsync(id, cancellationToken);
        return area is null ? NotFound() : Ok(area);
    }

    [Authorize(Policy = AppPermissions.AreasCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAreaRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var area = await areaService.CreateAsync(request, cancellationToken);
        await auditService.LogAsync(userId, userName, "create", "org.areas", area.Id.ToString(), nameof(Domain.Entities.Area), $"{area.Code} - {area.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = area.Id }, area);
    }

    [Authorize(Policy = AppPermissions.AreasEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAreaRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var area = await areaService.UpdateAsync(id, request, cancellationToken);
        if (area is not null)
        {
            await auditService.LogAsync(userId, userName, "update", "org.areas", id.ToString(), nameof(Domain.Entities.Area), $"{area.Code} - {area.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        }
        return area is null ? NotFound() : Ok(area);
    }

    [Authorize(Policy = AppPermissions.AreasEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAreaStatusRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var updated = await areaService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        if (updated)
        {
            await auditService.LogAsync(userId, userName, request.IsActive ? "activate" : "deactivate", "org.areas", id.ToString(), nameof(Domain.Entities.Area), request.IsActive ? "Área activada" : "Área desactivada", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        }
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.AreasDelete)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var deleted = await areaService.DeleteAsync(id, cancellationToken);
        if (deleted)
        {
            await auditService.LogAsync(userId, userName, "delete", "org.areas", id.ToString(), nameof(Domain.Entities.Area), null, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        }
        return deleted ? NoContent() : NotFound();
    }

    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }
}


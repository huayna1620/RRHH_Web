using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Positions;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/positions")]
[Authorize]
public sealed class PositionsController(IPositionService positionService, IAuditService auditService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.PositionsView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PositionQueryDto query, CancellationToken cancellationToken)
    {
        var result = await positionService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.PositionsView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var position = await positionService.GetByIdAsync(id, cancellationToken);
        return position is null ? NotFound() : Ok(position);
    }

    [Authorize(Policy = AppPermissions.PositionsCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePositionRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var position = await positionService.CreateAsync(request, cancellationToken);
        await auditService.LogAsync(userId, userName, "create", "org.positions", position.Id.ToString(), nameof(Domain.Entities.Position), $"{position.Code} - {position.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = position.Id }, position);
    }

    [Authorize(Policy = AppPermissions.PositionsEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePositionRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var position = await positionService.UpdateAsync(id, request, cancellationToken);
        if (position is not null)
        {
            await auditService.LogAsync(userId, userName, "update", "org.positions", id.ToString(), nameof(Domain.Entities.Position), $"{position.Code} - {position.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        }
        return position is null ? NotFound() : Ok(position);
    }

    [Authorize(Policy = AppPermissions.PositionsEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdatePositionStatusRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var updated = await positionService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        if (updated)
        {
            await auditService.LogAsync(userId, userName, request.IsActive ? "activate" : "deactivate", "org.positions", id.ToString(), nameof(Domain.Entities.Position), request.IsActive ? "Puesto activado" : "Puesto desactivado", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        }
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.PositionsDelete)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var deleted = await positionService.DeleteAsync(id, cancellationToken);
        if (deleted)
        {
            await auditService.LogAsync(userId, userName, "delete", "org.positions", id.ToString(), nameof(Domain.Entities.Position), null, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
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


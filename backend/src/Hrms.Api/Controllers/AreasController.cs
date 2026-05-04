using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Areas;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/areas")]
[Authorize]
public sealed class AreasController(IAreaService areaService) : ControllerBase
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
        var area = await areaService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = area.Id }, area);
    }

    [Authorize(Policy = AppPermissions.AreasEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAreaRequestDto request, CancellationToken cancellationToken)
    {
        var area = await areaService.UpdateAsync(id, request, cancellationToken);
        return area is null ? NotFound() : Ok(area);
    }

    [Authorize(Policy = AppPermissions.AreasEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAreaStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await areaService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.AreasDelete)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await areaService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}


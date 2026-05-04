using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Recruitment;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/recruitment")]
[Authorize]
public sealed class RecruitmentController(IRecruitmentService recruitmentService) : ControllerBase
{
    private string GetCurrentUser() =>
        User.FindFirstValue(ClaimTypes.Name) ?? "system";

    [Authorize(Policy = AppPermissions.RecruitmentView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] RecruitmentQueryDto query, CancellationToken cancellationToken)
    {
        var result = await recruitmentService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.RecruitmentView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var candidate = await recruitmentService.GetByIdAsync(id, cancellationToken);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [Authorize(Policy = AppPermissions.RecruitmentView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs(CancellationToken cancellationToken)
    {
        var catalogs = await recruitmentService.GetCatalogsAsync(cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.RecruitmentView)]
    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> GetStatusHistory(Guid id, CancellationToken cancellationToken)
    {
        var history = await recruitmentService.GetStatusHistoryAsync(id, cancellationToken);
        return Ok(history);
    }

    [Authorize(Policy = AppPermissions.RecruitmentCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecruitmentCandidateRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var candidate = await recruitmentService.CreateAsync(request, GetCurrentUser(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = candidate.Id }, candidate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.RecruitmentEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateRecruitmentCandidateRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var candidate = await recruitmentService.UpdateAsync(id, request, GetCurrentUser(), cancellationToken);
            return candidate is null ? NotFound() : Ok(candidate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.RecruitmentEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateRecruitmentStatusRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var candidate = await recruitmentService.UpdateStatusAsync(id, request, GetCurrentUser(), cancellationToken);
            return candidate is null ? NotFound() : Ok(candidate);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.RecruitmentEdit)]
    [HttpPost("{id:guid}/convert-to-employee")]
    public async Task<IActionResult> ConvertToEmployee(Guid id, [FromBody] ConvertToEmployeeRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await recruitmentService.ConvertToEmployeeAsync(id, request, GetCurrentUser(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.RecruitmentDelete)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await recruitmentService.DeleteAsync(id, GetCurrentUser(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}

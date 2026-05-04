using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.JobPostings;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/job-postings")]
[Authorize]
public sealed class JobPostingsController(IJobPostingService jobPostingService) : ControllerBase
{
    private string GetCurrentUser() =>
        User.FindFirstValue(ClaimTypes.Name) ?? "system";

    [Authorize(Policy = AppPermissions.JobPostingsView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] JobPostingQueryDto query, CancellationToken cancellationToken)
    {
        var result = await jobPostingService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.JobPostingsView)]
    [HttpGet("open")]
    public async Task<IActionResult> GetOpen(CancellationToken cancellationToken)
    {
        var result = await jobPostingService.GetOpenAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.JobPostingsView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await jobPostingService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Policy = AppPermissions.JobPostingsCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateJobPostingRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await jobPostingService.CreateAsync(request, GetCurrentUser(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.JobPostingsEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJobPostingRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await jobPostingService.UpdateAsync(id, request, GetCurrentUser(), cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.JobPostingsEdit)]
    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id, CancellationToken cancellationToken)
    {
        var closed = await jobPostingService.CloseAsync(id, GetCurrentUser(), cancellationToken);
        return closed ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.JobPostingsEdit)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await jobPostingService.DeleteAsync(id, GetCurrentUser(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}

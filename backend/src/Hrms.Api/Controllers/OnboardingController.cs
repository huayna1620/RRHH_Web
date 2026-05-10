using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Onboarding;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/onboarding")]
[Authorize]
public sealed class OnboardingController(IOnboardingService onboardingService) : ControllerBase
{
    private string GetUserName() => User.FindFirstValue(ClaimTypes.Name) ?? "system";

    // ── Templates ────────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.OnboardingView)]
    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(CancellationToken cancellationToken)
    {
        var result = await onboardingService.GetTemplatesAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.OnboardingCreate)]
    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateOnboardingTemplateRequestDto request, CancellationToken cancellationToken)
    {
        var result = await onboardingService.CreateTemplateAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/onboarding/templates/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpPut("templates/{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateOnboardingTemplateRequestDto request, CancellationToken cancellationToken)
    {
        var result = await onboardingService.UpdateTemplateAsync(id, request, GetUserName(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Policy = AppPermissions.OnboardingCreate)]
    [HttpPost("templates/{id:guid}/duplicate")]
    public async Task<IActionResult> DuplicateTemplate(Guid id, CancellationToken cancellationToken)
    {
        var result = await onboardingService.DuplicateTemplateAsync(id, GetUserName(), cancellationToken);
        return result is null ? NotFound() : Created($"/api/v1/onboarding/templates/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpPatch("templates/{id:guid}/status")]
    public async Task<IActionResult> UpdateTemplateStatus(Guid id, [FromBody] UpdateOnboardingTemplateStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await onboardingService.UpdateTemplateStatusAsync(id, request.IsActive, GetUserName(), cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpDelete("templates/{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await onboardingService.DeleteTemplateAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    // ── Processes ────────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.OnboardingView)]
    [HttpGet("processes")]
    public async Task<IActionResult> GetProcesses([FromQuery] Guid? employeeId, CancellationToken cancellationToken)
    {
        var result = await onboardingService.GetProcessesAsync(employeeId, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.OnboardingView)]
    [HttpGet("processes/{id:guid}")]
    public async Task<IActionResult> GetProcess(Guid id, CancellationToken cancellationToken)
    {
        var result = await onboardingService.GetProcessAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Policy = AppPermissions.OnboardingCreate)]
    [HttpPost("processes")]
    public async Task<IActionResult> StartProcess([FromBody] StartOnboardingRequestDto request, CancellationToken cancellationToken)
    {
        var result = await onboardingService.StartProcessAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/onboarding/processes/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpPost("processes/{processId:guid}/tasks/{taskId:guid}/complete")]
    public async Task<IActionResult> CompleteTask(Guid processId, Guid taskId, CancellationToken cancellationToken)
    {
        var completed = await onboardingService.CompleteTaskAsync(processId, taskId, GetUserName(), cancellationToken);
        return completed ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpPost("processes/{processId:guid}/complete")]
    public async Task<IActionResult> CompleteProcess(Guid processId, CancellationToken cancellationToken)
    {
        var completed = await onboardingService.CompleteProcessAsync(processId, GetUserName(), cancellationToken);
        return completed ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.OnboardingEdit)]
    [HttpPost("processes/{processId:guid}/cancel")]
    public async Task<IActionResult> CancelProcess(Guid processId, CancellationToken cancellationToken)
    {
        var cancelled = await onboardingService.CancelProcessAsync(processId, GetUserName(), cancellationToken);
        return cancelled ? NoContent() : NotFound();
    }
}

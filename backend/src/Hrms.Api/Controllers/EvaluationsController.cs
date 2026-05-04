using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Evaluations;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/evaluations")]
[Authorize]
public sealed class EvaluationsController(IEvaluationService evaluationService) : ControllerBase
{
    private string GetUserName() => User.FindFirstValue(ClaimTypes.Name) ?? "system";
    private Guid GetUserId() => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    // ── Cycles ───────────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.EvaluationsView)]
    [HttpGet("cycles")]
    public async Task<IActionResult> GetCycles(CancellationToken cancellationToken)
    {
        var result = await evaluationService.GetCyclesAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.EvaluationsCreate)]
    [HttpPost("cycles")]
    public async Task<IActionResult> CreateCycle([FromBody] CreateEvaluationCycleRequestDto request, CancellationToken cancellationToken)
    {
        var result = await evaluationService.CreateCycleAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/evaluations/cycles/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.EvaluationsEdit)]
    [HttpPost("cycles/{id:guid}/activate")]
    public async Task<IActionResult> ActivateCycle(Guid id, CancellationToken cancellationToken)
    {
        var ok = await evaluationService.ActivateCycleAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.EvaluationsEdit)]
    [HttpPost("cycles/{id:guid}/close")]
    public async Task<IActionResult> CloseCycle(Guid id, CancellationToken cancellationToken)
    {
        var ok = await evaluationService.CloseCycleAsync(id, cancellationToken);
        return ok ? NoContent() : NotFound();
    }

    // ── Assignments ──────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.EvaluationsView)]
    [HttpGet("assignments")]
    public async Task<IActionResult> GetAssignments([FromQuery] Guid? cycleId, [FromQuery] Guid? employeeId, CancellationToken cancellationToken)
    {
        var result = await evaluationService.GetAssignmentsAsync(cycleId, employeeId, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.EvaluationsCreate)]
    [HttpPost("assignments")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateEvaluationAssignmentRequestDto request, CancellationToken cancellationToken)
    {
        var result = await evaluationService.CreateAssignmentAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/evaluations/assignments/{result.Id}", result);
    }

    // Self-evaluation (employee fills)
    [HttpPost("assignments/{id:guid}/self")]
    public async Task<IActionResult> SubmitSelfEvaluation(Guid id, [FromBody] SubmitSelfEvaluationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await evaluationService.SubmitSelfEvaluationAsync(id, request, GetUserId(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    // Evaluator evaluation (manager fills)
    [HttpPost("assignments/{id:guid}/evaluator")]
    public async Task<IActionResult> SubmitEvaluatorEvaluation(Guid id, [FromBody] SubmitEvaluatorEvaluationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await evaluationService.SubmitEvaluatorEvaluationAsync(id, request, GetUserId(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    // Finalize (HR)
    [Authorize(Policy = AppPermissions.EvaluationsEdit)]
    [HttpPost("assignments/{id:guid}/finalize")]
    public async Task<IActionResult> Finalize(Guid id, [FromBody] FinalizeEvaluationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await evaluationService.FinalizeAsync(id, request, GetUserName(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    // My evaluations (for employee portal)
    [HttpGet("my")]
    public async Task<IActionResult> GetMyEvaluations(CancellationToken cancellationToken)
    {
        var result = await evaluationService.GetMyEvaluationsAsync(GetUserId(), cancellationToken);
        return Ok(result);
    }
}

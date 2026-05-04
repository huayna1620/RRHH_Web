using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Vacations;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/vacations")]
[Authorize]
public sealed class VacationsController(IVacationService vacationService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.VacationsView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] VacationQueryDto query, CancellationToken cancellationToken)
    {
        var result = await vacationService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.VacationsView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs([FromQuery] int? year, CancellationToken cancellationToken)
    {
        var catalogs = await vacationService.GetCatalogsAsync(year, cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.VacationsCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVacationRequestDto request, CancellationToken cancellationToken)
    {
        var result = await vacationService.CreateAsync(request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.VacationsApprove)]
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveVacationRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await vacationService.ApproveAsync(id, request, userId, userName, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.VacationsApprove)]
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectVacationRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await vacationService.RejectAsync(id, request, userId, userName, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.VacationsCreate)]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await vacationService.CancelAsync(id, userId, userName, cancellationToken);
        return Ok(result);
    }

    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }
}

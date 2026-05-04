using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Leaves;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/leaves")]
[Authorize]
public sealed class LeavesController(ILeaveService leaveService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.LeavesView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] LeaveQueryDto query, CancellationToken cancellationToken)
    {
        var result = await leaveService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.LeavesView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs(CancellationToken cancellationToken)
    {
        var catalogs = await leaveService.GetCatalogsAsync(cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.LeavesCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLeaveRequestDto request, CancellationToken cancellationToken)
    {
        var result = await leaveService.CreateAsync(request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.LeavesApprove)]
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveLeaveRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await leaveService.ApproveAsync(id, request, userId, userName, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.LeavesApprove)]
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectLeaveRequestDto request, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await leaveService.RejectAsync(id, request, userId, userName, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.LeavesCreate)]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var result = await leaveService.CancelAsync(id, userId, userName, cancellationToken);
        return Ok(result);
    }

    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }
}

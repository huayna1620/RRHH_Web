using System.Security.Claims;
using Hrms.Application.DTOs.Account;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/account")]
public sealed class AccountController(IAccountService accountService) : ControllerBase
{
    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var profile = await accountService.GetProfileAsync(userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var profile = await accountService.UpdateProfileAsync(userId, request, cancellationToken);
            return profile is null ? NotFound() : Ok(profile);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("my-dashboard")]
    public async Task<IActionResult> GetEmployeeDashboard(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var dashboard = await accountService.GetEmployeeDashboardAsync(userId, cancellationToken);
        return dashboard is null ? NotFound(new { message = "No tienes un empleado vinculado." }) : Ok(dashboard);
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendarEvents([FromQuery] int? year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var resolvedYear = year ?? DateTime.UtcNow.Year;
        var resolvedMonth = month ?? DateTime.UtcNow.Month;

        var events = await accountService.GetCalendarEventsAsync(userId, resolvedYear, resolvedMonth, cancellationToken);
        return Ok(events);
    }
}

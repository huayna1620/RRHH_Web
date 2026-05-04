using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Attendance;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/attendance-incidents")]
[Authorize]
public sealed class AttendanceIncidentsController(IAttendanceIncidentService incidentService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.AttendanceIncidentsView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] Guid? employeeId,
        [FromQuery] string? incidentType,
        [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new AttendanceIncidentQueryDto(
            employeeId, incidentType, status, fromDate, toDate, search, pageNumber, pageSize);

        var result = await incidentService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AttendanceIncidentsView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await incidentService.GetByIdAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.AttendanceIncidentsJustify)]
    [HttpPost("{id:guid}/justify")]
    public async Task<IActionResult> SubmitJustification(
        Guid id,
        [FromBody] SubmitIncidentJustificationRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (_, userName) = GetCurrentUser();
            var result = await incidentService.SubmitJustificationAsync(id, request, userName, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.AttendanceIncidentsApprove)]
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(
        Guid id,
        [FromBody] ReviewIncidentRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await incidentService.ApproveAsync(id, request, userId, userName, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.AttendanceIncidentsApprove)]
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid id,
        [FromBody] ReviewIncidentRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await incidentService.RejectAsync(id, request, userId, userName, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Expire open incidents past their deadline. Can be called manually or from a cron trigger.</summary>
    [Authorize(Policy = AppPermissions.AttendanceIncidentsApprove)]
    [HttpPost("expire")]
    public async Task<IActionResult> ExpireOpenIncidents(CancellationToken cancellationToken)
    {
        var count = await incidentService.ExpireOpenIncidentsAsync(cancellationToken);
        return Ok(new { expiredCount = count });
    }

    /// <summary>Global KPI counters honoring the same filters as the list endpoint.</summary>
    [Authorize(Policy = AppPermissions.AttendanceIncidentsView)]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(
        [FromQuery] Guid? employeeId,
        [FromQuery] string? incidentType,
        [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var query = new AttendanceIncidentQueryDto(
            employeeId, incidentType, status, fromDate, toDate, search, 1, 1);

        var result = await incidentService.GetStatsAsync(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>Summary for a period — consumed by FASE 3 payroll module.</summary>
    [Authorize(Policy = AppPermissions.AttendanceIncidentsView)]
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateOnly fromDate,
        [FromQuery] DateOnly toDate,
        CancellationToken cancellationToken)
    {
        var result = await incidentService.GetIncidentSummaryAsync(fromDate, toDate, cancellationToken);
        return Ok(result);
    }

    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }
}

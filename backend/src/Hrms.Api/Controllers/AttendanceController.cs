using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Attendance;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/attendance")]
[Authorize]
public sealed class AttendanceController(IAttendanceService attendanceService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.AttendanceView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] AttendanceQueryDto query, CancellationToken cancellationToken)
    {
        var result = await attendanceService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AttendanceView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs(CancellationToken cancellationToken)
    {
        var catalogs = await attendanceService.GetCatalogsAsync(cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.AttendanceView)]
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] AttendanceQueryDto query, CancellationToken cancellationToken)
    {
        var summary = await attendanceService.GetSummaryAsync(query, cancellationToken);
        return Ok(summary);
    }

    [Authorize(Policy = AppPermissions.AttendanceCreate)]
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequestDto request, CancellationToken cancellationToken)
    {
        var result = await attendanceService.CheckInAsync(request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AttendanceEdit)]
    [HttpPost("{id:guid}/check-out")]
    public async Task<IActionResult> CheckOut(Guid id, [FromBody] CheckOutRequestDto request, CancellationToken cancellationToken)
    {
        var result = await attendanceService.CheckOutAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AttendanceEdit)]
    [HttpPost("mark-absent")]
    public async Task<IActionResult> MarkAbsent([FromBody] MarkAbsentRequestDto request, CancellationToken cancellationToken)
    {
        var result = await attendanceService.MarkAbsentAsync(request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.AttendanceJustify)]
    [HttpPost("{id:guid}/justify")]
    public async Task<IActionResult> Justify(Guid id, [FromBody] JustifyAttendanceRequestDto request, CancellationToken cancellationToken)
    {
        var result = await attendanceService.JustifyAsync(id, request, cancellationToken);
        return Ok(result);
    }
}

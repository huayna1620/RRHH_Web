using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Holidays;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/holidays")]
[Authorize]
public sealed class HolidaysController(IHolidayService holidayService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.HolidaysView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var holidays = await holidayService.GetAllAsync(cancellationToken);
        return Ok(holidays);
    }

    [Authorize(Policy = AppPermissions.HolidaysEdit)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHolidayRequestDto request, CancellationToken cancellationToken)
    {
        var result = await holidayService.CreateAsync(request, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.HolidaysEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateHolidayRequestDto request, CancellationToken cancellationToken)
    {
        var result = await holidayService.UpdateAsync(id, request, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Policy = AppPermissions.HolidaysEdit)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await holidayService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}

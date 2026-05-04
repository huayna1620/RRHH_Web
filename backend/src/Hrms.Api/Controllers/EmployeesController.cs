using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Employees;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/employees")]
[Authorize]
public sealed class EmployeesController(IEmployeeService employeeService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.EmployeesView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] EmployeeQueryDto query, CancellationToken cancellationToken)
    {
        var result = await employeeService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.EmployeesView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var employee = await employeeService.GetByIdAsync(id, cancellationToken);
        return employee is null ? NotFound() : Ok(employee);
    }

    [Authorize(Policy = AppPermissions.EmployeesView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs(CancellationToken cancellationToken)
    {
        var catalogs = await employeeService.GetCatalogsAsync(cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.EmployeesCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeRequestDto request, CancellationToken cancellationToken)
    {
        var employee = await employeeService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, employee);
    }

    [Authorize(Policy = AppPermissions.EmployeesEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeeRequestDto request, CancellationToken cancellationToken)
    {
        var employee = await employeeService.UpdateAsync(id, request, cancellationToken);
        return employee is null ? NotFound() : Ok(employee);
    }

    [Authorize(Policy = AppPermissions.EmployeesEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateEmployeeStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await employeeService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.EmployeesDelete)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await employeeService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.EmployeesView)]
    [HttpGet("{id:guid}/change-log")]
    public async Task<IActionResult> GetChangeLog(Guid id, CancellationToken cancellationToken)
    {
        var logs = await employeeService.GetChangeLogAsync(id, cancellationToken);
        return Ok(logs);
    }
}

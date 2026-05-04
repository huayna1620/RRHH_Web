using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/payroll/concepts")]
[Authorize]
public sealed class PayrollConceptsController(IPayrollConceptService payrollConceptService, IAuditService auditService) : ControllerBase
{
    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }

    [Authorize(Policy = AppPermissions.PayrollConceptsView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await payrollConceptService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.PayrollConceptsEdit)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePayrollConceptRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollConceptService.CreateAsync(request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "create", "payroll.concepts", result.Id.ToString(), nameof(Domain.Entities.PayrollConcept), $"{result.Code} - {result.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollConceptsEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePayrollConceptRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollConceptService.UpdateAsync(id, request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "update", "payroll.concepts", id.ToString(), nameof(Domain.Entities.PayrollConcept), $"{result.Code} - {result.Name}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollConceptsEdit)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var deleted = await payrollConceptService.DeleteAsync(id, userName, cancellationToken);
        if (deleted)
            await auditService.LogAsync(userId, userName, "delete", "payroll.concepts", id.ToString(), nameof(Domain.Entities.PayrollConcept), null, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}

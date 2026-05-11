using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/payroll/loans")]
[Authorize]
public sealed class PayrollLoansController(IPayrollLoanService payrollLoanService, IAuditService auditService) : ControllerBase
{
    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }

    [Authorize(Policy = AppPermissions.PayrollLoansView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] Guid? employeeId,
        [FromQuery] bool? activeOnly,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await payrollLoanService.GetPagedAsync(employeeId, activeOnly, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.PayrollLoansView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await payrollLoanService.GetByIdAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollLoansCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePayrollLoanRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollLoanService.CreateAsync(request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "create", "payroll.loans", result.Id.ToString(), nameof(Domain.Entities.PayrollLoan), $"{result.LoanType} S/{result.TotalAmount} x{result.TotalInstallments} → {result.EmployeeName}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollLoansEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePayrollLoanRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollLoanService.UpdateAsync(id, request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "update", "payroll.loans", id.ToString(), nameof(Domain.Entities.PayrollLoan), $"LoanType={result.LoanType}, Notes={result.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollLoansEdit)]
    [HttpPost("{id:guid}/installments/{installmentId:guid}/pay")]
    public async Task<IActionResult> RegisterPayment(Guid id, Guid installmentId, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollLoanService.RegisterPaymentAsync(id, installmentId, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "payment", "payroll.loans", id.ToString(), nameof(Domain.Entities.PayrollLoan), $"Cuota {installmentId} marcada como pagada manualmente", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollLoansEdit)]
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var (userId, userName) = GetCurrentUser();
        var cancelled = await payrollLoanService.CancelAsync(id, userName, cancellationToken);
        if (cancelled)
            await auditService.LogAsync(userId, userName, "cancel", "payroll.loans", id.ToString(), nameof(Domain.Entities.PayrollLoan), null, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return cancelled ? NoContent() : NotFound();
    }
}

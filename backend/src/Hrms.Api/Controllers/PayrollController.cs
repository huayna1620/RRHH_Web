using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Banking;
using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/payroll")]
[Authorize]
public sealed class PayrollController(IPayrollService payrollService, IAuditService auditService, IBankFileService bankFileService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PayrollQueryDto query, CancellationToken cancellationToken)
    {
        var result = await payrollService.GetPagedAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await payrollService.GetByIdAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("catalogs")]
    public async Task<IActionResult> GetCatalogs(CancellationToken cancellationToken)
    {
        var catalogs = await payrollService.GetCatalogsAsync(cancellationToken);
        return Ok(catalogs);
    }

    [Authorize(Policy = AppPermissions.PayrollCreate)]
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] GeneratePayrollRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollService.GenerateAsync(request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "generate", "payroll", $"{request.Year}-{request.Month:D2}", "PayrollPeriod", $"new={result.GeneratedCount} updated={result.UpdatedCount}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollEdit)]
    [HttpPut("{id:guid}/adjustments")]
    public async Task<IActionResult> UpdateAdjustments(Guid id, [FromBody] UpdatePayrollAdjustmentsRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var result = await payrollService.UpdateAdjustmentsAsync(id, request, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "adjust", "payroll", id.ToString(), nameof(Domain.Entities.PayrollRecord), $"bonuses={request.Bonuses} deductions={request.Deductions}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollApprove)]
    [HttpPost("approve")]
    public async Task<IActionResult> Approve([FromBody] ApprovePayrollRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var count = await payrollService.ApproveAsync(request.Year, request.Month, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "approve", "payroll", $"{request.Year}-{request.Month:D2}", "PayrollPeriod", $"approvedCount={count}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(new { approvedCount = count });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollApprove)]
    [HttpPost("unapprove")]
    public async Task<IActionResult> Unapprove([FromBody] ApprovePayrollRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var count = await payrollService.UnapproveAsync(request.Year, request.Month, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "unapprove", "payroll", $"{request.Year}-{request.Month:D2}", "PayrollPeriod", $"unapprovedCount={count}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(new { unapprovedCount = count });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollApprove)]
    [HttpPost("mark-paid")]
    public async Task<IActionResult> MarkPaid([FromBody] MarkPaidPayrollRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var (userId, userName) = GetCurrentUser();
            var count = await payrollService.MarkPaidAsync(request.Year, request.Month, userName, cancellationToken);
            await auditService.LogAsync(userId, userName, "mark-paid", "payroll", $"{request.Year}-{request.Month:D2}", "PayrollPeriod", $"paidCount={count}", HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
            return Ok(new { paidCount = count });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("bulk-payslips")]
    public async Task<IActionResult> GetBulkPayslips([FromQuery] int year, [FromQuery] int month, CancellationToken cancellationToken)
    {
        try
        {
            var zipBytes = await payrollService.GenerateBulkPayslipZipAsync(year, month, cancellationToken);
            return File(zipBytes, "application/zip", $"boletas_{year}_{month:D2}.zip");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("{id:guid}/payslip")]
    public async Task<IActionResult> GetPayslip(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var pdfBytes = await payrollService.GeneratePayslipPdfAsync(id, cancellationToken);
            return File(pdfBytes, "application/pdf", $"boleta_{id}.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>Genera el archivo de pago masivo para un banco especifico</summary>
    /// <remarks>
    /// Solo considera planillas aprobadas o pagadas. Si un empleado no tiene datos bancarios
    /// completos, se excluye del archivo y se reporta en la cabecera JSON cuando se usa el
    /// parametro `preview=true`.
    ///
    /// **Formatos soportados:** GENERIC, BCP, BBVA, INTERBANK, SCOTIABANK.
    /// </remarks>
    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("bank-file")]
    public async Task<IActionResult> GetBankFile(
        [FromQuery] int year,
        [FromQuery] int month,
        [FromQuery] string format = "GENERIC",
        [FromQuery] bool preview = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await bankFileService.GenerateAsync(new BankFileRequestDto(year, month, format), cancellationToken);

            if (preview)
            {
                return Ok(new
                {
                    result.FileName,
                    result.IncludedCount,
                    result.TotalAmount,
                    result.Skipped
                });
            }

            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Lista los formatos bancarios disponibles</summary>
    [Authorize(Policy = AppPermissions.PayrollView)]
    [HttpGet("bank-file/formats")]
    public IActionResult GetBankFormats()
    {
        return Ok(bankFileService.GetSupportedFormats());
    }

    private (Guid UserId, string UserName) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "system";
        return (Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, userName);
    }
}

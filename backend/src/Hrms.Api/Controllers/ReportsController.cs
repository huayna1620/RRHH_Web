using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Reports;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
[EnableRateLimiting("heavy")]
public sealed class ReportsController(
    IReportsService reportsService,
    IExcelExportService excelExportService,
    IEmployeePdfService employeePdfService) : ControllerBase
{
    // ── existing reports ──────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees(CancellationToken cancellationToken)
    {
        var result = await reportsService.GetEmployeesReportAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("attendance")]
    public async Task<IActionResult> GetAttendance([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetAttendanceReportAsync(query.Year, query.Month, query.StartDate, query.EndDate, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("vacations")]
    public async Task<IActionResult> GetVacations([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetVacationsReportAsync(query.Year, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("leaves")]
    public async Task<IActionResult> GetLeaves([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetLeavesReportAsync(query.Year, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("payroll")]
    public async Task<IActionResult> GetPayroll([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetPayrollReportAsync(query.Year, query.Month, cancellationToken);
        return Ok(result);
    }

    // ── FASE 6: new reports ───────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("rotation")]
    public async Task<IActionResult> GetRotation([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetRotationReportAsync(query.Year, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("absenteeism")]
    public async Task<IActionResult> GetAbsenteeism([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetAbsenteeismReportAsync(query.Year, query.Month, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("labor-cost")]
    public async Task<IActionResult> GetLaborCost([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var result = await reportsService.GetLaborCostReportAsync(query.Year, query.Month, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("employees/{employeeId:guid}/pdf")]
    public async Task<IActionResult> GetEmployeeDetailPdf(Guid employeeId, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetEmployeeDetailReportAsync(employeeId, cancellationToken);
        if (report is null) return NotFound();
        var bytes = employeePdfService.GenerateEmployeeDetailPdf(report);
        return File(bytes, "application/pdf", $"empleado_{employeeId}.pdf");
    }

    // ── FASE 6: Excel exports ─────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("employees/excel")]
    public async Task<IActionResult> ExportEmployeesExcel(CancellationToken cancellationToken)
    {
        var report = await reportsService.GetEmployeesReportAsync(cancellationToken);
        var bytes = excelExportService.ExportEmployeesReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "reporte-empleados.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("attendance/excel")]
    public async Task<IActionResult> ExportAttendanceExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetAttendanceReportAsync(query.Year, query.Month, query.StartDate, query.EndDate, cancellationToken);
        var bytes = excelExportService.ExportAttendanceReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-asistencia-{query.Year}-{query.Month}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("vacations/excel")]
    public async Task<IActionResult> ExportVacationsExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetVacationsReportAsync(query.Year, cancellationToken);
        var bytes = excelExportService.ExportVacationsReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-vacaciones-{query.Year}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("leaves/excel")]
    public async Task<IActionResult> ExportLeavesExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetLeavesReportAsync(query.Year, cancellationToken);
        var bytes = excelExportService.ExportLeavesReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-permisos-{query.Year}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("payroll/excel")]
    public async Task<IActionResult> ExportPayrollExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetPayrollReportAsync(query.Year, query.Month, cancellationToken);
        var bytes = excelExportService.ExportPayrollReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-planilla-{query.Year}-{query.Month}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("rotation/excel")]
    public async Task<IActionResult> ExportRotationExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetRotationReportAsync(query.Year, cancellationToken);
        var bytes = excelExportService.ExportRotationReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-rotacion-{query.Year}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("absenteeism/excel")]
    public async Task<IActionResult> ExportAbsenteeismExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetAbsenteeismReportAsync(query.Year, query.Month, cancellationToken);
        var bytes = excelExportService.ExportAbsenteeismReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-ausentismo-{query.Year}-{query.Month}.xlsx");
    }

    [Authorize(Policy = AppPermissions.ReportsView)]
    [HttpGet("labor-cost/excel")]
    public async Task<IActionResult> ExportLaborCostExcel([FromQuery] ReportsPeriodQueryDto query, CancellationToken cancellationToken)
    {
        var report = await reportsService.GetLaborCostReportAsync(query.Year, query.Month, cancellationToken);
        var bytes = excelExportService.ExportLaborCostReport(report);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"reporte-costo-laboral-{query.Year}-{query.Month}.xlsx");
    }
}

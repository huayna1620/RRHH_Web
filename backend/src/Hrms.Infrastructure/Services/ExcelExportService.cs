using ClosedXML.Excel;
using Hrms.Application.DTOs.Reports;
using Hrms.Application.Interfaces.Services;

namespace Hrms.Infrastructure.Services;

public sealed class ExcelExportService : IExcelExportService
{
    public byte[] ExportEmployeesReport(EmployeesReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Empleados");

        // Summary
        ws.Cell(1, 1).Value = "Reporte de Empleados";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Total: {report.TotalEmployees}  |  Activos: {report.ActiveEmployees}  |  Inactivos: {report.InactiveEmployees}";

        // Table header
        var headers = new[] { "Área", "Total", "Activos", "Inactivos" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByArea)
        {
            ws.Cell(row, 1).Value = item.AreaName;
            ws.Cell(row, 2).Value = item.TotalEmployees;
            ws.Cell(row, 3).Value = item.ActiveEmployees;
            ws.Cell(row, 4).Value = item.TotalEmployees - item.ActiveEmployees;
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportAttendanceReport(AttendanceReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Asistencia");

        ws.Cell(1, 1).Value = $"Reporte de Asistencia — {report.Month}/{report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Presentes: {report.PresentRecords}  |  Faltas: {report.AbsentRecords}  |  Tardanzas: {report.LateRecords}";

        var headers = new[] { "Fecha", "Registros", "Presentes", "Faltas", "Tardanzas" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.Daily)
        {
            ws.Cell(row, 1).Value = item.Date.ToString("yyyy-MM-dd");
            ws.Cell(row, 2).Value = item.TotalRecords;
            ws.Cell(row, 3).Value = item.PresentRecords;
            ws.Cell(row, 4).Value = item.AbsentRecords;
            ws.Cell(row, 5).Value = item.LateRecords;
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportVacationsReport(VacationsReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Vacaciones");

        ws.Cell(1, 1).Value = $"Reporte de Vacaciones — {report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Total solicitudes: {report.TotalRequests}  |  Días aprobados: {report.ApprovedDays}";

        var headers = new[] { "Estado", "Solicitudes", "Días solicitados" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByStatus)
        {
            ws.Cell(row, 1).Value = item.Status;
            ws.Cell(row, 2).Value = item.Requests;
            ws.Cell(row, 3).Value = item.RequestedDays;
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportLeavesReport(LeavesReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Permisos");

        ws.Cell(1, 1).Value = $"Reporte de Permisos/Licencias — {report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Con goce: {report.PaidRequests}  |  Sin goce: {report.UnpaidRequests}";

        var headers = new[] { "Tipo", "Solicitudes", "Días solicitados" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByType)
        {
            ws.Cell(row, 1).Value = item.LeaveType;
            ws.Cell(row, 2).Value = item.Requests;
            ws.Cell(row, 3).Value = item.RequestedDays;
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportPayrollReport(PayrollReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Planilla");

        ws.Cell(1, 1).Value = $"Reporte de Planilla — {report.Month}/{report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Registros: {report.RecordsCount}  |  Total neto: {report.TotalNetPay:N2}  |  Promedio: {report.AverageNetPay:N2}";

        var headers = new[] { "Código", "Empleado", "Neto" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.TopNetPays)
        {
            ws.Cell(row, 1).Value = item.EmployeeCode;
            ws.Cell(row, 2).Value = item.EmployeeName;
            ws.Cell(row, 3).Value = (double)item.NetPay;
            ws.Cell(row, 3).Style.NumberFormat.Format = "#,##0.00";
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportRotationReport(RotationReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Rotación");

        ws.Cell(1, 1).Value = $"Reporte de Rotación — {report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Ingresos: {report.HiredCount}  |  Salidas: {report.InactivatedCount}  |  Tasa: {report.TurnoverRate:P2}";

        var headers = new[] { "Área", "Ingresos", "Salidas" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByArea)
        {
            ws.Cell(row, 1).Value = item.AreaName;
            ws.Cell(row, 2).Value = item.HiredCount;
            ws.Cell(row, 3).Value = item.InactivatedCount;
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportAbsenteeismReport(AbsenteeismReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Ausentismo");

        ws.Cell(1, 1).Value = $"Reporte de Ausentismo — {report.Month}/{report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Total empleados: {report.TotalEmployees}  |  Días de falta: {report.TotalAbsenceDays}  |  Tasa: {report.AbsenteeismRate:P2}";

        var headers = new[] { "Área", "Empleados", "Días de falta", "Tasa (%)" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByArea)
        {
            ws.Cell(row, 1).Value = item.AreaName;
            ws.Cell(row, 2).Value = item.EmployeeCount;
            ws.Cell(row, 3).Value = item.AbsenceDays;
            ws.Cell(row, 4).Value = item.AbsenteeismRate * 100;
            ws.Cell(row, 4).Style.NumberFormat.Format = "0.00";
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    public byte[] ExportLaborCostReport(LaborCostReportDto report)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Costo Laboral");

        ws.Cell(1, 1).Value = $"Reporte de Costo Laboral — {report.Month}/{report.Year}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Registros: {report.RecordCount}  |  Total neto: {report.TotalNetPay:N2}  |  Promedio: {report.AverageNetPay:N2}";

        var headers = new[] { "Área", "Empleados", "Salario base", "Bonos", "Descuentos", "Neto total" };
        WriteHeader(ws, 4, headers);

        int row = 5;
        foreach (var item in report.ByArea)
        {
            ws.Cell(row, 1).Value = item.AreaName;
            ws.Cell(row, 2).Value = item.EmployeeCount;
            ws.Cell(row, 3).Value = (double)item.TotalBaseSalary;
            ws.Cell(row, 4).Value = (double)item.TotalBonuses;
            ws.Cell(row, 5).Value = (double)item.TotalDeductions;
            ws.Cell(row, 6).Value = (double)item.TotalNetPay;
            for (int col = 3; col <= 6; col++)
                ws.Cell(row, col).Style.NumberFormat.Format = "#,##0.00";
            row++;
        }

        AutoFitColumns(ws, headers.Length);
        return ToBytes(workbook);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static void WriteHeader(IXLWorksheet ws, int row, string[] headers)
    {
        for (int col = 0; col < headers.Length; col++)
        {
            var cell = ws.Cell(row, col + 1);
            cell.Value = headers[col];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }
    }

    private static void AutoFitColumns(IXLWorksheet ws, int count)
    {
        for (int col = 1; col <= count; col++)
            ws.Column(col).AdjustToContents();
    }

    private static byte[] ToBytes(XLWorkbook workbook)
    {
        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}

using ClosedXML.Excel;
using Hrms.Application.DTOs.Reports;
using Hrms.Application.Interfaces.Services;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// Genera archivos Excel con formato profesional para cada tipo de reporte RRHH.
/// Estructura: fila 1 título, 2 período, 3 resumen, 4 generado, 5 cabecera, 6+ datos, última fila totales.
/// </summary>
public sealed class ExcelExportService : IExcelExportService
{
    // ── Layout constants ────────────────────────────────────────────────────────
    private const int RowTitle   = 1;
    private const int RowPeriod  = 2;
    private const int RowSummary = 3;
    private const int RowGenDate = 4;
    private const int RowHeader  = 5;
    private const int RowDataStart = 6;

    // ── Colors ──────────────────────────────────────────────────────────────────
    private static readonly XLColor ColPrimary    = XLColor.FromHtml("#1e3a5f");
    private static readonly XLColor ColPrimaryDark= XLColor.FromHtml("#0f2340");
    private static readonly XLColor ColHeaderBg   = XLColor.FromHtml("#f0f4ff");
    private static readonly XLColor ColEvenRow     = XLColor.FromHtml("#f8fafc");
    private static readonly XLColor ColBorder      = XLColor.FromHtml("#e2e8f0");
    private static readonly XLColor ColTotalBg     = XLColor.FromHtml("#dbeafe");
    private static readonly XLColor ColTotalBorder = XLColor.FromHtml("#93c5fd");
    private static readonly XLColor ColSubtitle    = XLColor.FromHtml("#475569");
    private static readonly XLColor ColMuted       = XLColor.FromHtml("#94a3b8");

    // ── Export methods ──────────────────────────────────────────────────────────

    public byte[] ExportEmployeesReport(EmployeesReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Empleados");
        const int cols = 5;

        SetupTitle(ws, "Reporte de Empleados", "Actualidad",
            $"Total: {report.TotalEmployees}  |  Activos: {report.ActiveEmployees}  |  Inactivos: {report.InactiveEmployees}",
            cols);
        WriteHeader(ws, new[] { "Área", "Total", "Activos", "Inactivos", "% Activos" });

        int row = RowDataStart;
        foreach (var (item, i) in report.ByArea.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            var pct = item.TotalEmployees > 0
                ? $"{item.ActiveEmployees * 100.0 / item.TotalEmployees:0.0}%"
                : "0%";
            SetStr(ws, row, 1, item.AreaName, even);
            SetNum(ws, row, 2, item.TotalEmployees, even);
            SetNum(ws, row, 3, item.ActiveEmployees, even);
            SetNum(ws, row, 4, item.TotalEmployees - item.ActiveEmployees, even);
            SetStr(ws, row, 5, pct, even, right: true);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "TOTAL",
            report.TotalEmployees.ToString(),
            report.ActiveEmployees.ToString(),
            report.InactiveEmployees.ToString(),
            "—"
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportAttendanceReport(AttendanceReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Asistencia");
        const int cols = 5;

        SetupTitle(ws,
            $"Reporte de Asistencia — {report.Month}/{report.Year}",
            $"Mes {report.Month} / {report.Year}",
            $"Presentes: {report.PresentRecords}  |  Faltas: {report.AbsentRecords}  |  Tardanzas: {report.LateRecords}  |  Puntualidad: {(report.TotalRecords > 0 ? (double)report.PresentRecords / report.TotalRecords * 100 : 0):0.0}%",
            cols);
        WriteHeader(ws, new[] { "Fecha", "Total", "Presentes", "Faltas", "Tardanzas" });

        int row = RowDataStart;
        foreach (var (item, i) in report.Daily.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, item.Date.ToString("yyyy-MM-dd"), even);
            SetNum(ws, row, 2, item.TotalRecords, even);
            SetNum(ws, row, 3, item.PresentRecords, even);
            SetNum(ws, row, 4, item.AbsentRecords, even);
            SetNum(ws, row, 5, item.LateRecords, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "TOTAL MES",
            report.TotalRecords.ToString(),
            report.PresentRecords.ToString(),
            report.AbsentRecords.ToString(),
            report.LateRecords.ToString()
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportVacationsReport(VacationsReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Vacaciones");
        const int cols = 3;

        SetupTitle(ws,
            $"Reporte de Vacaciones — {report.Year}",
            $"Año {report.Year}",
            $"Total solicitudes: {report.TotalRequests}  |  Aprobadas: {report.ApprovedRequests}  |  Pendientes: {report.PendingRequests}  |  Días aprobados: {report.ApprovedDays}",
            cols);
        WriteHeader(ws, new[] { "Estado", "Solicitudes", "Días solicitados" });

        var statusMap = new Dictionary<string, string>
        {
            ["pending"]   = "Pendiente",
            ["approved"]  = "Aprobado",
            ["rejected"]  = "Rechazado",
            ["cancelled"] = "Cancelado"
        };

        int row = RowDataStart;
        foreach (var (item, i) in report.ByStatus.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, statusMap.GetValueOrDefault(item.Status, item.Status), even);
            SetNum(ws, row, 2, item.Requests, even);
            SetNum(ws, row, 3, item.RequestedDays, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "TOTAL",
            report.TotalRequests.ToString(),
            report.TotalRequestedDays.ToString()
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportLeavesReport(LeavesReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Permisos");
        const int cols = 3;

        SetupTitle(ws,
            $"Reporte de Permisos — {report.Year}",
            $"Año {report.Year}",
            $"Total: {report.TotalRequests}  |  Con goce: {report.PaidRequests}  |  Sin goce: {report.UnpaidRequests}  |  Aprobados: {report.ApprovedRequests}",
            cols);
        WriteHeader(ws, new[] { "Tipo de permiso", "Solicitudes", "Días solicitados" });

        var typeMap = new Dictionary<string, string>
        {
            ["personal"]            = "Personal",
            ["medical"]             = "Médico / Salud",
            ["study"]               = "Estudio",
            ["maternity_paternity"] = "Maternidad / Paternidad",
            ["other"]               = "Otro"
        };

        int row = RowDataStart;
        foreach (var (item, i) in report.ByType.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, typeMap.GetValueOrDefault(item.LeaveType, item.LeaveType), even);
            SetNum(ws, row, 2, item.Requests, even);
            SetNum(ws, row, 3, item.RequestedDays, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "TOTAL",
            report.TotalRequests.ToString(),
            "—"
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportPayrollReport(PayrollReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Planilla");
        const int cols = 4;

        SetupTitle(ws,
            $"Reporte de Planilla — {report.Month}/{report.Year}",
            $"Mes {report.Month} / {report.Year}",
            $"Registros: {report.RecordsCount}  |  Salario base: {report.TotalBaseSalary:N2}  |  Bonificaciones: {report.TotalBonuses:N2}  |  Descuentos: {report.TotalDeductions:N2}  |  Neto total: {report.TotalNetPay:N2}",
            cols);
        WriteHeader(ws, new[] { "#", "Código", "Empleado", "Sueldo neto (S/)" });

        int row = RowDataStart;
        foreach (var (item, i) in report.TopNetPays.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetNum(ws, row, 1, i + 1, even);
            SetStr(ws, row, 2, item.EmployeeCode, even);
            SetStr(ws, row, 3, item.EmployeeName, even);
            SetCurrency(ws, row, 4, (double)item.NetPay, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "",
            "",
            "TOTAL NETO",
            $"{report.TotalNetPay:N2}"
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportRotationReport(RotationReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Rotación");
        const int cols = 3;

        SetupTitle(ws,
            $"Reporte de Rotación de Personal — {report.Year}",
            $"Año {report.Year}",
            $"Activos al inicio: {report.TotalActiveAtStart}  |  Ingresos: {report.HiredCount}  |  Salidas: {report.InactivatedCount}  |  Tasa de rotación: {report.TurnoverRate * 100:0.0}%",
            cols);
        WriteHeader(ws, new[] { "Área", "Ingresos", "Salidas" });

        int row = RowDataStart;
        foreach (var (item, i) in report.ByArea.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, item.AreaName, even);
            SetNum(ws, row, 2, item.HiredCount, even);
            SetNum(ws, row, 3, item.InactivatedCount, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            $"Tasa global: {report.TurnoverRate * 100:0.0}%",
            report.HiredCount.ToString(),
            report.InactivatedCount.ToString()
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportAbsenteeismReport(AbsenteeismReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Ausentismo");
        const int cols = 4;

        SetupTitle(ws,
            $"Reporte de Ausentismo — {report.Month}/{report.Year}",
            $"Mes {report.Month} / {report.Year}",
            $"Total empleados: {report.TotalEmployees}  |  Días de falta: {report.TotalAbsenceDays}  |  Tasa global: {report.AbsenteeismRate * 100:0.00}%",
            cols);
        WriteHeader(ws, new[] { "Área", "Empleados", "Días de falta", "Tasa (%)" });

        int row = RowDataStart;
        foreach (var (item, i) in report.ByArea.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, item.AreaName, even);
            SetNum(ws, row, 2, item.EmployeeCount, even);
            SetNum(ws, row, 3, item.AbsenceDays, even);
            var cell = ws.Cell(row, 4);
            cell.Value = item.AbsenteeismRate * 100;
            cell.Style.NumberFormat.Format = "0.00\"%\"";
            ApplyDataStyle(cell, even, right: true);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "GLOBAL",
            report.TotalEmployees.ToString(),
            report.TotalAbsenceDays.ToString(),
            $"{report.AbsenteeismRate * 100:0.00}%"
        });

        return Finalize(ws, wb, cols);
    }

    public byte[] ExportLaborCostReport(LaborCostReportDto report)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Costo Laboral");
        const int cols = 6;

        SetupTitle(ws,
            $"Reporte de Costo Laboral — {report.Month}/{report.Year}",
            $"Mes {report.Month} / {report.Year}",
            $"Registros: {report.RecordCount}  |  Base total: {report.TotalBaseSalary:N2}  |  Bonos: {report.TotalBonuses:N2}  |  Descuentos: {report.TotalDeductions:N2}  |  Neto: {report.TotalNetPay:N2}",
            cols);
        WriteHeader(ws, new[] { "Área", "Empleados", "Salario base", "Bonificaciones", "Deducciones", "Neto total" });

        int row = RowDataStart;
        foreach (var (item, i) in report.ByArea.Select((x, idx) => (x, idx)))
        {
            bool even = i % 2 == 1;
            SetStr(ws, row, 1, item.AreaName, even);
            SetNum(ws, row, 2, item.EmployeeCount, even);
            SetCurrency(ws, row, 3, (double)item.TotalBaseSalary, even);
            SetCurrency(ws, row, 4, (double)item.TotalBonuses, even);
            SetCurrency(ws, row, 5, (double)item.TotalDeductions, even);
            SetCurrency(ws, row, 6, (double)item.TotalNetPay, even);
            row++;
        }

        WriteTotals(ws, row, cols, new[]
        {
            "TOTAL",
            report.RecordCount.ToString(),
            $"{report.TotalBaseSalary:N2}",
            $"{report.TotalBonuses:N2}",
            $"{report.TotalDeductions:N2}",
            $"{report.TotalNetPay:N2}"
        });

        return Finalize(ws, wb, cols);
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private static void SetupTitle(IXLWorksheet ws, string title, string period, string summary, int cols)
    {
        // Row 1: Main title
        var t = ws.Cell(RowTitle, 1);
        t.Value = title;
        t.Style.Font.Bold = true;
        t.Style.Font.FontSize = 16;
        t.Style.Font.FontColor = ColPrimary;
        t.Style.Fill.BackgroundColor = ColHeaderBg;
        t.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        if (cols > 1) ws.Range(RowTitle, 1, RowTitle, cols).Merge();
        ws.Row(RowTitle).Height = 28;

        // Row 2: Period
        var p = ws.Cell(RowPeriod, 1);
        p.Value = period;
        p.Style.Font.FontSize = 11;
        p.Style.Font.FontColor = ColSubtitle;
        p.Style.Fill.BackgroundColor = ColHeaderBg;
        if (cols > 1) ws.Range(RowPeriod, 1, RowPeriod, cols).Merge();
        ws.Row(RowPeriod).Height = 18;

        // Row 3: Summary stats
        var s = ws.Cell(RowSummary, 1);
        s.Value = summary;
        s.Style.Font.FontSize = 9;
        s.Style.Font.FontColor = ColSubtitle;
        s.Style.Fill.BackgroundColor = XLColor.FromHtml("#f8fafc");
        if (cols > 1) ws.Range(RowSummary, 1, RowSummary, cols).Merge();
        ws.Row(RowSummary).Height = 16;

        // Row 4: Generated date
        var g = ws.Cell(RowGenDate, 1);
        g.Value = $"Generado: {DateTime.Now:dd/MM/yyyy HH:mm}   |   Sistema RRHH";
        g.Style.Font.FontSize = 8;
        g.Style.Font.FontColor = ColMuted;
        g.Style.Fill.BackgroundColor = XLColor.FromHtml("#f8fafc");
        if (cols > 1) ws.Range(RowGenDate, 1, RowGenDate, cols).Merge();
        ws.Row(RowGenDate).Height = 14;
    }

    private static void WriteHeader(IXLWorksheet ws, string[] headers)
    {
        ws.Row(RowHeader).Height = 22;
        for (int col = 0; col < headers.Length; col++)
        {
            var cell = ws.Cell(RowHeader, col + 1);
            cell.Value = headers[col];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 10;
            cell.Style.Fill.BackgroundColor = ColPrimary;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            cell.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
            cell.Style.Border.BottomBorderColor = ColPrimaryDark;
            cell.Style.Border.LeftBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.LeftBorderColor = ColPrimaryDark;
            cell.Style.Border.RightBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.RightBorderColor = ColPrimaryDark;
            cell.Style.Border.TopBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.TopBorderColor = ColPrimaryDark;
        }
    }

    private static void WriteTotals(IXLWorksheet ws, int row, int cols, string[] values)
    {
        ws.Row(row).Height = 20;
        for (int col = 0; col < values.Length && col < cols; col++)
        {
            var cell = ws.Cell(row, col + 1);
            cell.Value = values[col];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontSize = 10;
            cell.Style.Fill.BackgroundColor = ColTotalBg;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Medium;
            cell.Style.Border.OutsideBorderColor = ColTotalBorder;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            // Right-align numbers/currency
            if (col > 0 && double.TryParse(values[col].Replace(",", "").Replace(".", ""), System.Globalization.NumberStyles.Any, null, out _))
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        }
    }

    private static void ApplyDataStyle(IXLCell cell, bool even, bool right = false)
    {
        cell.Style.Fill.BackgroundColor = even ? ColEvenRow : XLColor.White;
        cell.Style.Border.OutsideBorder = XLBorderStyleValues.Hair;
        cell.Style.Border.OutsideBorderColor = ColBorder;
        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        if (right) cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
    }

    private static void SetStr(IXLWorksheet ws, int row, int col, string value, bool even, bool right = false)
    {
        var cell = ws.Cell(row, col);
        cell.Value = value;
        ApplyDataStyle(cell, even, right);
    }

    private static void SetNum(IXLWorksheet ws, int row, int col, int value, bool even)
    {
        var cell = ws.Cell(row, col);
        cell.Value = value;
        ApplyDataStyle(cell, even, right: true);
    }

    private static void SetCurrency(IXLWorksheet ws, int row, int col, double value, bool even)
    {
        var cell = ws.Cell(row, col);
        cell.Value = value;
        cell.Style.NumberFormat.Format = "#,##0.00";
        ApplyDataStyle(cell, even, right: true);
    }

    private static byte[] Finalize(IXLWorksheet ws, XLWorkbook wb, int cols)
    {
        // Freeze the header rows
        ws.SheetView.FreezeRows(RowHeader);

        // Auto-fit + minimum width
        for (int col = 1; col <= cols; col++)
        {
            ws.Column(col).AdjustToContents();
            if (ws.Column(col).Width < 12) ws.Column(col).Width = 12;
            if (ws.Column(col).Width > 50) ws.Column(col).Width = 50;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}

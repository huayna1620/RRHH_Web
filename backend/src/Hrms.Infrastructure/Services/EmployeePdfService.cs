using Hrms.Application.DTOs.Reports;
using Hrms.Application.Interfaces.Services;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Hrms.Infrastructure.Services;

public sealed class EmployeePdfService : IEmployeePdfService
{
    static EmployeePdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateEmployeeDetailPdf(EmployeeDetailReportDto r)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(content => ComposeContent(content, r));
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Generado el ").FontSize(8).FontColor(Colors.Grey.Medium);
                    text.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("Ficha del Empleado")
                    .FontSize(18).Bold().FontColor(Color.FromHex("#1e3a5f"));
                col.Item().Text("Sistema de Recursos Humanos")
                    .FontSize(10).FontColor(Colors.Grey.Medium);
            });
        });
    }

    private static void ComposeContent(IContainer container, EmployeeDetailReportDto r)
    {
        container.PaddingTop(10).Column(col =>
        {
            // Personal info
            col.Item().Element(c => SectionTitle(c, "Información Personal"));
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                });

                TableRow(table, "Código", r.EmployeeCode, "Nombre completo", r.FullName);
                TableRow(table, "Tipo documento", r.DocumentType, "Número documento", r.DocumentNumber);
                TableRow(table, "Fecha nacimiento", r.BirthDate.ToString("dd/MM/yyyy"), "Fecha ingreso", r.HireDate.ToString("dd/MM/yyyy"));
                TableRow(table, "Fin contrato", r.ContractEndDate?.ToString("dd/MM/yyyy") ?? "—", "Estado", r.IsActive ? "Activo" : "Inactivo");
            });

            col.Item().PaddingTop(8).Element(c => SectionTitle(c, "Cargo y Organización"));
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                });

                TableRow(table, "Área", r.AreaName, "Cargo", r.PositionName);
                TableRow(table, "Sucursal", r.BranchName, "Tipo contrato", r.ContractTypeName);
                TableRow(table, "Salario base", $"S/ {r.BaseSalary:N2}", "", "");
            });

            col.Item().PaddingTop(8).Element(c => SectionTitle(c, "Contacto"));
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(2);
                });

                TableRow(table, "Email personal", r.PersonalEmail, "Email trabajo", r.WorkEmail);
                TableRow(table, "Teléfono", r.PhoneNumber, "", "");
            });

            col.Item().PaddingTop(8).Element(c => SectionTitle(c, $"Indicadores {r.AttendanceYear}"));
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                });

                table.Header(header =>
                {
                    foreach (var text in new[] { "Asistencias", "Faltas", "Tardanzas", "Vac. aprobadas", "Vac. pendientes", "Permisos" })
                        header.Cell().Background(Color.FromHex("#1e3a5f")).Padding(4)
                              .Text(text).Bold().FontSize(9).FontColor(Colors.White);
                });

                table.Cell().Element(CellStyle).Text(r.TotalAttendance.ToString());
                table.Cell().Element(CellStyle).Text(r.AbsenceDays.ToString());
                table.Cell().Element(CellStyle).Text(r.LateDays.ToString());
                table.Cell().Element(CellStyle).Text(r.VacationDaysApproved.ToString());
                table.Cell().Element(CellStyle).Text(r.VacationDaysPending.ToString());
                table.Cell().Element(CellStyle).Text(r.LeaveRequestsTotal.ToString());
            });

            if (r.LastNetPay.HasValue)
            {
                col.Item().PaddingTop(8).Element(c => SectionTitle(c, "Última Planilla"));
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(1);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(1);
                        cols.RelativeColumn(2);
                    });

                    TableRow(table, "Periodo", $"{r.LastPayrollMonth}/{r.LastPayrollYear}", "Neto pagado", $"S/ {r.LastNetPay:N2}");
                });
            }
        });
    }

    private static void SectionTitle(IContainer c, string title)
    {
        c.BorderBottom(1).BorderColor(Color.FromHex("#1e3a5f"))
         .PaddingBottom(2)
         .Text(title).Bold().FontSize(11).FontColor(Color.FromHex("#1e3a5f"));
    }

    private static void TableRow(TableDescriptor table, string label1, string value1, string label2, string value2)
    {
        table.Cell().Element(LabelStyle).Text(label1);
        table.Cell().Element(CellStyle).Text(value1);
        table.Cell().Element(LabelStyle).Text(label2);
        table.Cell().Element(CellStyle).Text(value2);
    }

    private static IContainer LabelStyle(IContainer container) =>
        container.Background(Color.FromHex("#f0f4f8")).Padding(4).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);

    private static IContainer CellStyle(IContainer container) =>
        container.Padding(4).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
}

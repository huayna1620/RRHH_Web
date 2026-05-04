using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Hrms.Infrastructure.Reports;

public sealed record PayslipData(
    string EmployeeCode,
    string EmployeeName,
    string Area,
    string Position,
    string CompanyName,
    string CompanyRuc,
    int Year,
    int Month,
    string Status,
    decimal BaseSalary,
    decimal Bonuses,
    decimal AutomaticBonuses,
    decimal ManualDeductions,
    decimal AutomaticDeductions,
    decimal IncidentDeductions,
    decimal LoanDeductions,
    decimal GrossIncome,
    decimal NetPay,
    int IncidentFaltas,
    int IncidentTardanzaMinutes,
    string? Notes,
    DateTime GeneratedAtUtc);

public static class PayslipPdfGenerator
{
    private static readonly string[] MonthNames =
    [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    public static byte[] Generate(PayslipData data)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                page.Header().Element(ComposeHeader(data));
                page.Content().Element(ComposeContent(data));
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Documento generado el ").FontSize(7).FontColor(Colors.Grey.Medium);
                    t.Span(data.GeneratedAtUtc.ToString("dd/MM/yyyy HH:mm") + " UTC").FontSize(7).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    private static Action<IContainer> ComposeHeader(PayslipData data) => container =>
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(data.CompanyName).Bold().FontSize(13).FontColor(Colors.Blue.Darken3);
                    c.Item().Text($"RUC: {data.CompanyRuc}").FontSize(8).FontColor(Colors.Grey.Darken1);
                });
                row.ConstantItem(150).Column(c =>
                {
                    c.Item().Background(Colors.Blue.Darken3).Padding(6).Text("BOLETA DE PAGO")
                        .Bold().FontSize(11).FontColor(Colors.White).AlignCenter();
                    c.Item().Background(Colors.Blue.Lighten4).Padding(4)
                        .Text($"{MonthNames[data.Month - 1]} {data.Year}")
                        .Bold().FontSize(10).FontColor(Colors.Blue.Darken3).AlignCenter();
                });
            });

            col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Blue.Darken3);
        });
    };

    private static Action<IContainer> ComposeContent(PayslipData data) => container =>
    {
        container.PaddingTop(8).Column(col =>
        {
            // Employee info
            col.Item().Background(Colors.Grey.Lighten4).Padding(8).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Row(r =>
                    {
                        r.ConstantItem(90).Text("Trabajador:").Bold();
                        r.RelativeItem().Text(data.EmployeeName);
                    });
                    c.Item().Row(r =>
                    {
                        r.ConstantItem(90).Text("Código:").Bold();
                        r.RelativeItem().Text(data.EmployeeCode);
                    });
                    c.Item().Row(r =>
                    {
                        r.ConstantItem(90).Text("Área:").Bold();
                        r.RelativeItem().Text(data.Area);
                    });
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Row(r =>
                    {
                        r.ConstantItem(90).Text("Cargo:").Bold();
                        r.RelativeItem().Text(data.Position);
                    });
                    c.Item().Row(r =>
                    {
                        r.ConstantItem(90).Text("Estado:").Bold();
                        r.RelativeItem().Text(data.Status.ToUpperInvariant()).FontColor(
                            data.Status == "paid" ? Colors.Green.Darken2 :
                            data.Status == "approved" ? Colors.Blue.Darken2 : Colors.Orange.Darken2);
                    });
                });
            });

            col.Item().PaddingTop(10).Row(row =>
            {
                // Haberes
                row.RelativeItem().Column(c =>
                {
                    c.Item().Background(Colors.Green.Lighten3).Padding(5)
                        .Text("HABERES").Bold().FontSize(9).FontColor(Colors.Green.Darken3).AlignCenter();
                    c.Item().Element(EarningsTable(data));
                });

                row.ConstantItem(10);

                // Descuentos
                row.RelativeItem().Column(c =>
                {
                    c.Item().Background(Colors.Red.Lighten4).Padding(5)
                        .Text("DESCUENTOS").Bold().FontSize(9).FontColor(Colors.Red.Darken3).AlignCenter();
                    c.Item().Element(DeductionsTable(data));
                });
            });

            // Net pay summary
            col.Item().PaddingTop(8).Border(1).BorderColor(Colors.Blue.Darken3).Padding(8).Row(row =>
            {
                row.RelativeItem().Text("TOTAL HABERES").Bold().FontSize(10);
                row.ConstantItem(100).Text(FormatS(data.GrossIncome)).Bold().FontSize(10).AlignRight();
                row.ConstantItem(20);
                row.RelativeItem().Text("TOTAL DESCUENTOS").Bold().FontSize(10);
                row.ConstantItem(100).Text(FormatS(data.ManualDeductions + data.IncidentDeductions + data.LoanDeductions)).Bold().FontSize(10).AlignRight().FontColor(Colors.Red.Darken2);
            });

            col.Item().PaddingTop(2).Background(Colors.Blue.Darken3).Padding(8).Row(row =>
            {
                row.RelativeItem().Text("NETO A PAGAR").Bold().FontSize(12).FontColor(Colors.White);
                row.ConstantItem(120).Text(FormatS(data.NetPay)).Bold().FontSize(14).AlignRight().FontColor(Colors.White);
            });

            if (!string.IsNullOrWhiteSpace(data.Notes))
            {
                col.Item().PaddingTop(8).Background(Colors.Yellow.Lighten4).Padding(6).Column(c =>
                {
                    c.Item().Text("Observaciones:").Bold().FontSize(8);
                    c.Item().Text(data.Notes).FontSize(8);
                });
            }

            col.Item().PaddingTop(20).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
                    c.Item().Text("Firma del Empleado").AlignCenter().FontSize(8).FontColor(Colors.Grey.Darken1);
                });
                row.ConstantItem(30);
                row.RelativeItem().Column(c =>
                {
                    c.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
                    c.Item().Text("Firma de RRHH").AlignCenter().FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        });
    };

    private static Action<IContainer> EarningsTable(PayslipData data) => container =>
    {
        container.Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(); c.ConstantColumn(80); });

            ConceptRow(t, "Sueldo Básico", data.BaseSalary);
            if (data.Bonuses > 0) ConceptRow(t, "Bonificaciones (manual)", data.Bonuses);
            if (data.AutomaticBonuses > 0) ConceptRow(t, "Bonificaciones (automáticas)", data.AutomaticBonuses);

            SummaryRow(t, "TOTAL HABERES", data.GrossIncome, Colors.Green.Darken3);
        });
    };

    private static Action<IContainer> DeductionsTable(PayslipData data) => container =>
    {
        container.Table(t =>
        {
            t.ColumnsDefinition(c => { c.RelativeColumn(); c.ConstantColumn(80); });

            if (data.IncidentDeductions > 0)
            {
                ConceptRow(t, $"Desc. incidencias ({data.IncidentFaltas} f., {data.IncidentTardanzaMinutes} min)", data.IncidentDeductions);
            }
            if (data.LoanDeductions > 0)
            {
                ConceptRow(t, "Cuota préstamo/adelanto", data.LoanDeductions);
            }
            if (data.AutomaticDeductions > 0)
            {
                ConceptRow(t, "Descuentos automáticos", data.AutomaticDeductions);
            }
            if (data.ManualDeductions > 0)
            {
                ConceptRow(t, "Descuentos manuales", data.ManualDeductions);
            }
            var totalDeductions = data.ManualDeductions + data.AutomaticDeductions + data.IncidentDeductions + data.LoanDeductions;
            if (totalDeductions == 0)
            {
                ConceptRow(t, "Sin descuentos", 0);
            }

            SummaryRow(t, "TOTAL DESCUENTOS", totalDeductions, Colors.Red.Darken3);
        });
    };

    private static void ConceptRow(TableDescriptor t, string label, decimal amount)
    {
        t.Cell().BorderBottom(0.3f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(label).FontSize(8);
        t.Cell().BorderBottom(0.3f).BorderColor(Colors.Grey.Lighten2).Padding(4).AlignRight().Text(FormatS(amount)).FontSize(8);
    }

    private static void SummaryRow(TableDescriptor t, string label, decimal amount, string color)
    {
        t.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(label).Bold().FontSize(8).FontColor(color);
        t.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(FormatS(amount)).Bold().FontSize(8).FontColor(color);
    }

    private static string FormatS(decimal value) => $"S/ {value:N2}";
}

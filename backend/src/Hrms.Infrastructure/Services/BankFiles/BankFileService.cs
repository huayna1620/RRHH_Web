using System.Globalization;
using System.Text;
using Hrms.Application.DTOs.Banking;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services.BankFiles;

/// <summary>
/// Genera archivos de pago masivo segun el formato requerido por cada banco peruano.
///
/// **Importante sobre formatos:** los bancos actualizan sus specs periodicamente. Si la
/// version vigente cambia, solo se toca la clase concreta <c>GenerateXxx</c> correspondiente.
/// Los formatos aqui implementados son los *comunmente aceptados* al 2026 — el cliente
/// debe validar con su banco antes del primer uso en produccion.
/// </summary>
public sealed class BankFileService(HrmsDbContext db) : IBankFileService
{
    private static readonly IReadOnlyList<BankFormatDescriptor> _formats =
    [
        new(BankFileFormats.Generic,    "Generico (CSV)",         "csv", "CSV universal aceptado por la mayoria de bancos."),
        new(BankFileFormats.Bcp,        "BCP — Telecredito",      "txt", "Formato pipe-separated para pago masivo BCP."),
        new(BankFileFormats.Bbva,       "BBVA — Net Cash",        "txt", "Formato pipe-separated para BBVA Continental."),
        new(BankFileFormats.Interbank,  "Interbank — Net",        "txt", "Formato pipe-separated para Interbank."),
        new(BankFileFormats.Scotiabank, "Scotiabank",             "csv", "Formato CSV para Scotiabank.")
    ];

    public IReadOnlyList<BankFormatDescriptor> GetSupportedFormats() => _formats;

    public async Task<BankFileResultDto> GenerateAsync(BankFileRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.Year < 2000 || request.Year > 2100)
            throw new InvalidOperationException("Anio fuera de rango.");
        if (request.Month is < 1 or > 12)
            throw new InvalidOperationException("Mes fuera de rango (1-12).");

        var format = (request.Format ?? string.Empty).Trim().ToUpperInvariant();
        var descriptor = _formats.FirstOrDefault(x => x.Code == format)
            ?? throw new InvalidOperationException($"Formato bancario no soportado: {request.Format}");

        // Solo planillas aprobadas o pagadas. Draft no deberia generar archivo bancario.
        var records = await db.PayrollRecords
            .AsNoTracking()
            .Include(x => x.Employee)
            .Where(x => x.Year == request.Year && x.Month == request.Month && !x.IsDeleted)
            .Where(x => x.Status == PayrollRecordStatuses.Approved || x.Status == PayrollRecordStatuses.Paid)
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
            throw new InvalidOperationException($"No hay planilla aprobada para {request.Month:D2}/{request.Year}.");

        var included = new List<PayrollRecord>();
        var skipped = new List<BankFileSkippedEmployeeDto>();

        foreach (var r in records)
        {
            var reason = ValidateEmployeeBankData(r.Employee, r.NetPay);
            if (reason is null) included.Add(r);
            else skipped.Add(new BankFileSkippedEmployeeDto(
                r.EmployeeId,
                r.Employee.EmployeeCode,
                $"{r.Employee.FirstName} {r.Employee.LastName}",
                reason));
        }

        if (included.Count == 0)
            throw new InvalidOperationException("Ningun empleado tiene los datos bancarios completos para generar el archivo.");

        var content = format switch
        {
            BankFileFormats.Bcp        => GenerateBcp(included),
            BankFileFormats.Bbva       => GenerateBbva(included),
            BankFileFormats.Interbank  => GenerateInterbank(included),
            BankFileFormats.Scotiabank => GenerateScotiabank(included),
            _                          => GenerateGenericCsv(included)
        };

        var total = included.Sum(x => x.NetPay);
        var fileName = $"planilla_{request.Year}_{request.Month:D2}_{descriptor.Code.ToLowerInvariant()}.{descriptor.FileExtension}";
        var contentType = descriptor.FileExtension == "csv" ? "text/csv" : "text/plain";

        return new BankFileResultDto(content, fileName, contentType, included.Count, total, skipped);
    }

    // ── Validaciones comunes ─────────────────────────────────────────────

    private static string? ValidateEmployeeBankData(Employee e, decimal netPay)
    {
        if (netPay <= 0m) return "Neto no positivo";
        if (string.IsNullOrWhiteSpace(e.BankName)) return "Falta banco";
        if (string.IsNullOrWhiteSpace(e.BankAccountNumber) && string.IsNullOrWhiteSpace(e.BankAccountCci))
            return "Falta cuenta o CCI";
        if (!string.IsNullOrWhiteSpace(e.BankAccountCci) && !IsValidCci(e.BankAccountCci))
            return "CCI invalido";
        return null;
    }

    private static bool IsValidCci(string cci) =>
        cci.Length == 20 && cci.All(char.IsDigit);

    // ── Generadores por banco ────────────────────────────────────────────

    // Generico CSV: columnas universales que cualquier banco que acepte carga manual
    // puede mapear. Encabezado en castellano.
    private static byte[] GenerateGenericCsv(IReadOnlyList<PayrollRecord> records)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Codigo,Empleado,TipoDoc,NumeroDoc,Banco,TipoCuenta,NumeroCuenta,CCI,Moneda,Monto,Referencia");
        foreach (var r in records)
        {
            var e = r.Employee;
            sb.Append(Csv(e.EmployeeCode)).Append(',')
              .Append(Csv($"{e.FirstName} {e.LastName}")).Append(',')
              .Append(Csv(e.DocumentType)).Append(',')
              .Append(Csv(e.DocumentNumber)).Append(',')
              .Append(Csv(e.BankName ?? "")).Append(',')
              .Append(Csv(e.BankAccountType ?? "")).Append(',')
              .Append(Csv(e.BankAccountNumber ?? "")).Append(',')
              .Append(Csv(e.BankAccountCci ?? "")).Append(',')
              .Append(Csv(e.BankCurrency ?? "PEN")).Append(',')
              .Append(r.NetPay.ToString("F2", CultureInfo.InvariantCulture)).Append(',')
              .Append(Csv($"Planilla {r.Month:D2}/{r.Year}"))
              .AppendLine();
        }
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // BCP Telecredito (pago masivo): TXT pipe-separated. Layout tipico:
    // tipoCuenta|numeroCuenta|monto|tipoDoc|numeroDoc|nombreCompleto|referencia
    private static byte[] GenerateBcp(IReadOnlyList<PayrollRecord> records)
    {
        var sb = new StringBuilder();
        foreach (var r in records)
        {
            var e = r.Employee;
            // BCP prefiere numero de cuenta interna si existe, sino CCI.
            var account = !string.IsNullOrWhiteSpace(e.BankAccountNumber) ? e.BankAccountNumber! : e.BankAccountCci!;
            var accountTypeCode = e.BankAccountType == "checking" ? "1" : "2"; // 1=corriente, 2=ahorros
            sb.Append(accountTypeCode).Append('|')
              .Append(account.PadRight(20)).Append('|')
              .Append(r.NetPay.ToString("F2", CultureInfo.InvariantCulture)).Append('|')
              .Append(e.DocumentType).Append('|')
              .Append(e.DocumentNumber).Append('|')
              .Append($"{e.FirstName} {e.LastName}".ToUpperInvariant()).Append('|')
              .Append($"PLANILLA {r.Month:D2}{r.Year}")
              .AppendLine();
        }
        return Encoding.GetEncoding("ISO-8859-1").GetBytes(sb.ToString());
    }

    // BBVA Net Cash (pago de haberes): pipe separated con header.
    // Cabecera: H|fechaProceso|total|conteo|moneda
    // Detalle:  D|tipoCuenta|cuenta|monto|nombre|tipoDoc|numDoc|referencia
    private static byte[] GenerateBbva(IReadOnlyList<PayrollRecord> records)
    {
        var sb = new StringBuilder();
        var today = DateTime.Now.ToString("yyyyMMdd");
        var total = records.Sum(x => x.NetPay);
        var currency = records.FirstOrDefault()?.Employee.BankCurrency ?? "PEN";
        sb.Append("H|").Append(today).Append('|')
          .Append(total.ToString("F2", CultureInfo.InvariantCulture)).Append('|')
          .Append(records.Count).Append('|').Append(currency).AppendLine();

        foreach (var r in records)
        {
            var e = r.Employee;
            var account = !string.IsNullOrWhiteSpace(e.BankAccountNumber) ? e.BankAccountNumber! : e.BankAccountCci!;
            var accountTypeCode = e.BankAccountType == "checking" ? "CC" : "CA";
            sb.Append("D|").Append(accountTypeCode).Append('|')
              .Append(account).Append('|')
              .Append(r.NetPay.ToString("F2", CultureInfo.InvariantCulture)).Append('|')
              .Append($"{e.FirstName} {e.LastName}".ToUpperInvariant()).Append('|')
              .Append(e.DocumentType).Append('|')
              .Append(e.DocumentNumber).Append('|')
              .Append($"HABERES {r.Month:D2}{r.Year}").AppendLine();
        }
        return Encoding.GetEncoding("ISO-8859-1").GetBytes(sb.ToString());
    }

    // Interbank: pipe separated
    // cci|monto|moneda|tipoDoc|numDoc|nombre|referencia
    private static byte[] GenerateInterbank(IReadOnlyList<PayrollRecord> records)
    {
        var sb = new StringBuilder();
        foreach (var r in records)
        {
            var e = r.Employee;
            // Interbank exige CCI (20 digitos). Si no hay, se usa el numero de cuenta.
            var account = !string.IsNullOrWhiteSpace(e.BankAccountCci) ? e.BankAccountCci! : (e.BankAccountNumber ?? "");
            sb.Append(account).Append('|')
              .Append(r.NetPay.ToString("F2", CultureInfo.InvariantCulture)).Append('|')
              .Append(e.BankCurrency ?? "PEN").Append('|')
              .Append(e.DocumentType).Append('|')
              .Append(e.DocumentNumber).Append('|')
              .Append($"{e.FirstName} {e.LastName}".ToUpperInvariant()).Append('|')
              .Append($"PLANILLA {r.Month:D2}{r.Year}").AppendLine();
        }
        return Encoding.GetEncoding("ISO-8859-1").GetBytes(sb.ToString());
    }

    // Scotiabank: CSV con cabecera
    private static byte[] GenerateScotiabank(IReadOnlyList<PayrollRecord> records)
    {
        var sb = new StringBuilder();
        sb.AppendLine("TipoCuenta,NumeroCuenta,Monto,Moneda,TipoDoc,NroDoc,Beneficiario,Referencia");
        foreach (var r in records)
        {
            var e = r.Employee;
            var account = !string.IsNullOrWhiteSpace(e.BankAccountNumber) ? e.BankAccountNumber! : e.BankAccountCci!;
            var accountTypeCode = e.BankAccountType == "checking" ? "CTE" : "AHO";
            sb.Append(accountTypeCode).Append(',')
              .Append(Csv(account)).Append(',')
              .Append(r.NetPay.ToString("F2", CultureInfo.InvariantCulture)).Append(',')
              .Append(e.BankCurrency ?? "PEN").Append(',')
              .Append(Csv(e.DocumentType)).Append(',')
              .Append(Csv(e.DocumentNumber)).Append(',')
              .Append(Csv($"{e.FirstName} {e.LastName}".ToUpperInvariant())).Append(',')
              .Append(Csv($"Planilla {r.Month:D2}/{r.Year}"))
              .AppendLine();
        }
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /// <summary>Escapa un valor para CSV: comillas dobles si contiene delimitadores.</summary>
    private static string Csv(string value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

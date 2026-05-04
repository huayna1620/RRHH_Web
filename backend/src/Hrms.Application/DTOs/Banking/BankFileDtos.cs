namespace Hrms.Application.DTOs.Banking;

/// <summary>
/// Tipos de archivo bancario soportados por el sistema. Cada valor corresponde a un
/// formato concreto de cabecera, separador y layout de columnas exigido por el banco.
/// </summary>
public static class BankFileFormats
{
    public const string Generic = "GENERIC";     // CSV generico aceptado por la mayoria de bancos
    public const string Bcp     = "BCP";          // BCP Telecredito - pipe separated
    public const string Bbva    = "BBVA";         // BBVA Net Cash - pipe separated
    public const string Interbank = "INTERBANK"; // Interbank - pipe separated
    public const string Scotiabank = "SCOTIABANK"; // Scotiabank - CSV
}

/// <summary>Solicitud de generacion de archivo bancario para una planilla aprobada.</summary>
public sealed record BankFileRequestDto(int Year, int Month, string Format);

/// <summary>
/// Resultado con el archivo generado + metadatos utiles: total, conteo y lista de empleados
/// que fueron excluidos por datos bancarios incompletos (para que RRHH los corrija).
/// </summary>
public sealed record BankFileResultDto(
    byte[] Content,
    string FileName,
    string ContentType,
    int IncludedCount,
    decimal TotalAmount,
    IReadOnlyList<BankFileSkippedEmployeeDto> Skipped);

public sealed record BankFileSkippedEmployeeDto(
    Guid EmployeeId,
    string EmployeeCode,
    string FullName,
    string Reason);

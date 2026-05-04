using Hrms.Application.DTOs.Banking;

namespace Hrms.Application.Interfaces.Services;

/// <summary>
/// Genera archivos de pago masivo para los bancos soportados a partir de una planilla
/// aprobada. Solo considera <c>PayrollRecord</c>s con estado <c>approved</c>.
/// </summary>
public interface IBankFileService
{
    Task<BankFileResultDto> GenerateAsync(BankFileRequestDto request, CancellationToken cancellationToken = default);

    /// <summary>Lista de formatos bancarios soportados con un nombre legible para la UI.</summary>
    IReadOnlyList<BankFormatDescriptor> GetSupportedFormats();
}

public sealed record BankFormatDescriptor(string Code, string DisplayName, string FileExtension, string Description);

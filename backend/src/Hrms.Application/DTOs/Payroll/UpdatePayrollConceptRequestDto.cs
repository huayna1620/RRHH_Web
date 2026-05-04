namespace Hrms.Application.DTOs.Payroll;

public sealed record UpdatePayrollConceptRequestDto(
    string Name,
    string Type,
    decimal? FixedAmount,
    decimal? Percentage,
    bool IsAutomatic,
    bool IsActive,
    string? Description);

namespace Hrms.Application.DTOs.Payroll;

public sealed record CreatePayrollConceptRequestDto(
    string Code,
    string Name,
    string Type,
    decimal? FixedAmount,
    decimal? Percentage,
    bool IsAutomatic,
    string? Description);

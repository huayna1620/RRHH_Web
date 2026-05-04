namespace Hrms.Application.DTOs.Payroll;

public sealed record PayrollConceptDto(
    Guid Id,
    string Code,
    string Name,
    string Type,
    decimal? FixedAmount,
    decimal? Percentage,
    bool IsAutomatic,
    bool IsActive,
    string? Description);

namespace Hrms.Application.DTOs.Payroll;

public sealed record UpdatePayrollAdjustmentsRequestDto(
    decimal Bonuses,
    decimal Deductions,
    string? Notes);

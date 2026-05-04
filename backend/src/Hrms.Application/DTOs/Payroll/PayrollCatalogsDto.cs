namespace Hrms.Application.DTOs.Payroll;

public sealed record PayrollCatalogsDto(
    IReadOnlyList<PayrollEmployeeOptionDto> Employees,
    IReadOnlyList<PayrollAreaOptionDto> Areas);

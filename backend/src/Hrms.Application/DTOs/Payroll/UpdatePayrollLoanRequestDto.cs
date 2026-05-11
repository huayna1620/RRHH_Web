namespace Hrms.Application.DTOs.Payroll;

public sealed record UpdatePayrollLoanRequestDto(
    string? LoanType,
    string? Notes);

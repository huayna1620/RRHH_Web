namespace Hrms.Application.DTOs.Payroll;

public sealed record CreatePayrollLoanRequestDto(
    Guid EmployeeId,
    string LoanType,
    decimal TotalAmount,
    int TotalInstallments,
    DateOnly StartDate,
    string? Notes);

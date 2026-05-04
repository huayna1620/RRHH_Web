namespace Hrms.Application.DTOs.Payroll;

public sealed record PayrollLoanDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string LoanType,
    decimal TotalAmount,
    decimal MonthlyInstallment,
    int TotalInstallments,
    int PaidInstallments,
    int RemainingInstallments,
    decimal RemainingAmount,
    DateOnly StartDate,
    bool IsActive,
    string? Notes,
    IReadOnlyList<PayrollLoanInstallmentDto> Installments);

public sealed record PayrollLoanInstallmentDto(
    Guid Id,
    int InstallmentNumber,
    int Year,
    int Month,
    decimal Amount,
    bool IsPaid,
    DateTime? PaidAtUtc);

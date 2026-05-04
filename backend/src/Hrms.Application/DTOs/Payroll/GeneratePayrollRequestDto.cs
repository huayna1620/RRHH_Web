namespace Hrms.Application.DTOs.Payroll;

public sealed record GeneratePayrollRequestDto(
    int Year,
    int Month,
    Guid? EmployeeId,
    bool ForceRecalculate = false);

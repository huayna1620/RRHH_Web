namespace Hrms.Application.DTOs.Payroll;

public sealed record ApprovePayrollRequestDto(int Year, int Month);
public sealed record MarkPaidPayrollRequestDto(int Year, int Month);

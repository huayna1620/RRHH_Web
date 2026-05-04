namespace Hrms.Application.DTOs.Payroll;

public sealed record GeneratePayrollResultDto(
    int GeneratedCount,
    int UpdatedCount,
    int TotalProcessed);

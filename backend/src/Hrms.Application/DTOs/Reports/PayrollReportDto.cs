namespace Hrms.Application.DTOs.Reports;

public sealed record PayrollReportDto(
    int Year,
    int Month,
    int RecordsCount,
    decimal TotalBaseSalary,
    decimal TotalBonuses,
    decimal TotalDeductions,
    decimal TotalNetPay,
    decimal AverageNetPay,
    IReadOnlyList<PayrollTopNetItemDto> TopNetPays);

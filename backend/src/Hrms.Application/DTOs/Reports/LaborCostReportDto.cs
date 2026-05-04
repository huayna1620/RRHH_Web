namespace Hrms.Application.DTOs.Reports;

public sealed record LaborCostReportDto(
    int Year,
    int Month,
    int RecordCount,
    decimal TotalBaseSalary,
    decimal TotalBonuses,
    decimal TotalDeductions,
    decimal TotalGrossIncome,
    decimal TotalNetPay,
    decimal AverageNetPay,
    IReadOnlyList<LaborCostAreaItemDto> ByArea);

public sealed record LaborCostAreaItemDto(
    Guid AreaId,
    string AreaName,
    int EmployeeCount,
    decimal TotalBaseSalary,
    decimal TotalBonuses,
    decimal TotalDeductions,
    decimal TotalNetPay);

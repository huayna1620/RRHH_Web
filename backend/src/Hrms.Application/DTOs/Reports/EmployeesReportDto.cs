namespace Hrms.Application.DTOs.Reports;

public sealed record EmployeesReportDto(
    int TotalEmployees,
    int ActiveEmployees,
    int InactiveEmployees,
    IReadOnlyList<EmployeeAreaReportItemDto> ByArea);

namespace Hrms.Application.DTOs.Reports;

public sealed record EmployeeAreaReportItemDto(
    Guid AreaId,
    string AreaName,
    int TotalEmployees,
    int ActiveEmployees);

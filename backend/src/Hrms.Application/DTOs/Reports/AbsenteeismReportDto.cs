namespace Hrms.Application.DTOs.Reports;

public sealed record AbsenteeismReportDto(
    int Year,
    int Month,
    int TotalEmployees,
    int TotalAbsenceDays,
    double AbsenteeismRate,
    IReadOnlyList<AbsenteeismAreaItemDto> ByArea);

public sealed record AbsenteeismAreaItemDto(
    Guid AreaId,
    string AreaName,
    int EmployeeCount,
    int AbsenceDays,
    double AbsenteeismRate);

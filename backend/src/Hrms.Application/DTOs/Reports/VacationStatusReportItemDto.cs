namespace Hrms.Application.DTOs.Reports;

public sealed record VacationStatusReportItemDto(
    string Status,
    int Requests,
    int RequestedDays);

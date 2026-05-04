namespace Hrms.Application.DTOs.Reports;

public sealed record VacationsReportDto(
    int Year,
    int TotalRequests,
    int PendingRequests,
    int ApprovedRequests,
    int RejectedRequests,
    int TotalRequestedDays,
    int ApprovedDays,
    IReadOnlyList<VacationStatusReportItemDto> ByStatus);

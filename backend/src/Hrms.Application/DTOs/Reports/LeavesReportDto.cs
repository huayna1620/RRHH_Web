namespace Hrms.Application.DTOs.Reports;

public sealed record LeavesReportDto(
    int Year,
    int TotalRequests,
    int PendingRequests,
    int ApprovedRequests,
    int RejectedRequests,
    int PaidRequests,
    int UnpaidRequests,
    IReadOnlyList<LeaveTypeReportItemDto> ByType);

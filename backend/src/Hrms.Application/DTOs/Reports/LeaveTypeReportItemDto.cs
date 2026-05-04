namespace Hrms.Application.DTOs.Reports;

public sealed record LeaveTypeReportItemDto(
    string LeaveType,
    int Requests,
    int RequestedDays);

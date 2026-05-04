namespace Hrms.Application.DTOs.Account;

public sealed record EmployeeDashboardDto(
    // Employee info
    string EmployeeCode,
    string FullName,
    string AreaName,
    string PositionName,
    DateOnly HireDate,

    // Attendance summary (current month)
    int AttendanceDaysPresent,
    int AttendanceDaysAbsent,
    int AttendanceDaysLate,

    // Vacation balance
    int VacationDaysAvailable,
    int VacationDaysUsed,
    int VacationDaysPending,

    // Leave summary (current year)
    int LeaveRequestsTotal,
    int LeaveRequestsApproved,
    int LeaveRequestsPending,

    // Last payroll
    decimal? LastNetPay,
    int? LastPayrollYear,
    int? LastPayrollMonth,
    DateTime? LastPayrollPaidAtUtc,

    // Profile details
    string? BranchName,
    string? ContractTypeName,
    string? ManagerName,

    // Upcoming
    IReadOnlyList<UpcomingEventDto> UpcomingEvents,

    // Real-time personal feed
    IReadOnlyList<PortalRequestDto> RecentRequests,
    IReadOnlyList<PortalNoticeDto> Notices);

public sealed record UpcomingEventDto(
    string Type,
    string Title,
    DateOnly Date);

public sealed record PortalRequestDto(
    string Type,
    string Status,
    string Title,
    string Detail,
    DateOnly StartDate,
    DateOnly? EndDate,
    DateTime CreatedAtUtc);

public sealed record PortalNoticeDto(
    string Type,
    string Title,
    string Detail,
    string? Status,
    DateTime CreatedAtUtc);

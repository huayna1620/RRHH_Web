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

    // Upcoming
    IReadOnlyList<UpcomingEventDto> UpcomingEvents);

public sealed record UpcomingEventDto(
    string Type,
    string Title,
    DateOnly Date);

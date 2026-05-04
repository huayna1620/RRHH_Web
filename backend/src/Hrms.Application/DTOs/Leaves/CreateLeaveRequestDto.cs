namespace Hrms.Application.DTOs.Leaves;

public sealed record CreateLeaveRequestDto(
    Guid EmployeeId,
    string LeaveType,
    DateOnly StartDate,
    DateOnly EndDate,
    bool IsPaid,
    string Reason);

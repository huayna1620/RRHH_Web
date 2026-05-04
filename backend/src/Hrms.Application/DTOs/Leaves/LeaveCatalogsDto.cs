namespace Hrms.Application.DTOs.Leaves;

public sealed record LeaveCatalogsDto(
    IReadOnlyList<LeaveEmployeeOptionDto> Employees,
    IReadOnlyList<LeaveTypeOptionDto> LeaveTypes);

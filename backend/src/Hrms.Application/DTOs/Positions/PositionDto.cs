namespace Hrms.Application.DTOs.Positions;

public sealed record PositionDto(
    Guid Id,
    string Code,
    string Name,
    bool IsActive,
    int EmployeesCount,
    string? Description,
    string? Level,
    Guid? AreaId,
    string? AreaName,
    Guid? ReportsToEmployeeId,
    string? ReportsToName);


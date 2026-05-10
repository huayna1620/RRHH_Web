namespace Hrms.Application.DTOs.Areas;

public sealed record AreaDto(
    Guid Id,
    string Code,
    string Name,
    bool IsActive,
    int EmployeesCount,
    string? Description,
    Guid? ResponsibleEmployeeId,
    string? ResponsibleName,
    string? ResponsiblePosition);


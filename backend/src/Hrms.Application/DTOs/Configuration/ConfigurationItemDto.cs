namespace Hrms.Application.DTOs.Configuration;

public sealed record ConfigurationItemDto(
    Guid Id,
    string Code,
    string Name,
    bool IsActive,
    int EmployeesCount);

namespace Hrms.Application.DTOs.Employees;

public sealed record EmployeeListItemDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    string DocumentNumber,
    string Area,
    string Position,
    string Branch,
    string ContractType,
    DateOnly HireDate,
    decimal BaseSalary,
    bool IsActive);

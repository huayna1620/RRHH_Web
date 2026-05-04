namespace Hrms.Application.DTOs.Employees;

public sealed record EmployeeCatalogsDto(
    IReadOnlyList<EmployeeCatalogOptionDto> Branches,
    IReadOnlyList<EmployeeCatalogOptionDto> Areas,
    IReadOnlyList<EmployeeCatalogOptionDto> Positions,
    IReadOnlyList<EmployeeCatalogOptionDto> ContractTypes,
    IReadOnlyList<EmployeeCatalogOptionDto> Managers);

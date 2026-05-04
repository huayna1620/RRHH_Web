namespace Hrms.Application.DTOs.Recruitment;

public sealed record ConvertToEmployeeRequestDto(
    string EmployeeCode,
    string DocumentType,
    string DocumentNumber,
    DateOnly BirthDate,
    DateOnly HireDate,
    decimal BaseSalary,
    string WorkEmail,
    Guid BranchId,
    Guid AreaId,
    Guid PositionId,
    Guid ContractTypeId,
    Guid? ManagerId);

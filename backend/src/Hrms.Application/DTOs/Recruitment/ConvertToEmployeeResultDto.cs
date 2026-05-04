namespace Hrms.Application.DTOs.Recruitment;

public sealed record ConvertToEmployeeResultDto(
    Guid EmployeeId,
    string EmployeeCode,
    string FullName);

namespace Hrms.Application.DTOs.Employees;

public sealed class CreateEmployeeRequestDto
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string DocumentType { get; set; } = "DNI";
    public string DocumentNumber { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public DateOnly HireDate { get; set; }
    public decimal BaseSalary { get; set; }
    public string PersonalEmail { get; set; } = string.Empty;
    public string WorkEmail { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? ProfilePhotoUrl { get; set; }
    public string? Notes { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public DateOnly? ContractEndDate { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountCci { get; set; }
    public string? BankAccountType { get; set; }
    public string? BankCurrency { get; set; }
    public Guid BranchId { get; set; }
    public Guid AreaId { get; set; }
    public Guid PositionId { get; set; }
    public Guid ContractTypeId { get; set; }
    public Guid? ManagerId { get; set; }
}

using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class Employee : AuditableEntity
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

    // Datos bancarios para pagos masivos. Opcionales: si faltan, el empleado queda
    // excluido del archivo bancario y se reporta al generar.
    public string? BankName { get; set; }              // BCP, BBVA, Interbank, Scotiabank, etc.
    public string? BankAccountNumber { get; set; }     // Numero de cuenta del banco
    public string? BankAccountCci { get; set; }        // Codigo de Cuenta Interbancario (20 digitos)
    public string? BankAccountType { get; set; }       // savings | checking
    public string? BankCurrency { get; set; }          // PEN | USD (default PEN)

    public Guid BranchId { get; set; }
    public Guid AreaId { get; set; }
    public Guid PositionId { get; set; }
    public Guid ContractTypeId { get; set; }
    public Guid? ManagerId { get; set; }

    public Branch Branch { get; set; } = default!;
    public Area Area { get; set; } = default!;
    public Position Position { get; set; } = default!;
    public ContractType ContractType { get; set; } = default!;
    public Employee? Manager { get; set; }
    public ICollection<Employee> DirectReports { get; set; } = new List<Employee>();
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<VacationRequest> VacationRequests { get; set; } = new List<VacationRequest>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<PayrollRecord> PayrollRecords { get; set; } = new List<PayrollRecord>();
}

using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class PayrollLoan : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public string LoanType { get; set; } = "loan"; // loan | advance
    public decimal TotalAmount { get; set; }
    public decimal MonthlyInstallment { get; set; }
    public int TotalInstallments { get; set; }
    public int PaidInstallments { get; set; }
    public DateOnly StartDate { get; set; }
    public string? Notes { get; set; }

    public Employee Employee { get; set; } = default!;
    public ICollection<PayrollLoanInstallment> Installments { get; set; } = new List<PayrollLoanInstallment>();
}

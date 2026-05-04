using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class PayrollLoanInstallment : AuditableEntity
{
    public Guid PayrollLoanId { get; set; }
    public int InstallmentNumber { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal Amount { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAtUtc { get; set; }

    public PayrollLoan PayrollLoan { get; set; } = default!;
}

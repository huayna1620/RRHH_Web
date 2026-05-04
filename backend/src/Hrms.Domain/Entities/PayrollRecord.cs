using Hrms.Domain.Common;
using Hrms.Domain.Constants;

namespace Hrms.Domain.Entities;

public sealed class PayrollRecord : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }

    /// <summary>draft | approved | paid</summary>
    public string Status { get; set; } = PayrollRecordStatuses.Draft;

    public decimal BaseSalary { get; set; }

    /// <summary>Manual bonuses entered by HR.</summary>
    public decimal Bonuses { get; set; }

    /// <summary>Auto-computed from active automatic 'earning' concepts.</summary>
    public decimal AutomaticBonuses { get; set; }

    /// <summary>Manual deductions entered by HR.</summary>
    public decimal ManualDeductions { get; set; }

    /// <summary>Auto-computed from active automatic 'deduction' concepts.</summary>
    public decimal AutomaticDeductions { get; set; }

    /// <summary>Auto-computed from unresolved attendance incidents.</summary>
    public decimal IncidentDeductions { get; set; }

    /// <summary>Auto-computed from active loan installments for this period.</summary>
    public decimal LoanDeductions { get; set; }

    /// <summary>Total deductions = ManualDeductions + AutomaticDeductions + IncidentDeductions + LoanDeductions.</summary>
    public decimal Deductions { get; set; }

    public decimal GrossIncome { get; set; }
    public decimal NetPay { get; set; }
    public string? Notes { get; set; }

    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastCalculatedAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public string? PaidBy { get; set; }

    public Employee Employee { get; set; } = default!;
}

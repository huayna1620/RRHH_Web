using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class PayrollConcept : AuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>earning | deduction</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Fixed amount. Null means percentage-based.</summary>
    public decimal? FixedAmount { get; set; }

    /// <summary>Percentage of BaseSalary (0-100). Null means fixed amount.</summary>
    public decimal? Percentage { get; set; }

    /// <summary>Applied automatically on every payroll generation when true.</summary>
    public bool IsAutomatic { get; set; }

    public string? Description { get; set; }
}

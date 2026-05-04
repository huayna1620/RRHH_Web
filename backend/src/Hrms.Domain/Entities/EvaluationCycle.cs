using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class EvaluationCycle : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty; // quarterly, semiannual, annual
    public int Year { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = "draft"; // draft, active, closed

    public ICollection<EvaluationAssignment> Assignments { get; set; } = [];
}

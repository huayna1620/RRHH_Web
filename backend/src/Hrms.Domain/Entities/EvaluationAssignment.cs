using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class EvaluationAssignment : AuditableEntity
{
    public Guid CycleId { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid? EvaluatorEmployeeId { get; set; }

    // Self-evaluation
    public int? SelfScore { get; set; }
    public string? SelfComments { get; set; }
    public DateTime? SelfCompletedAtUtc { get; set; }

    // Evaluator evaluation
    public int? EvaluatorScore { get; set; }
    public string? EvaluatorComments { get; set; }
    public DateTime? EvaluatorCompletedAtUtc { get; set; }

    // Final
    public int? FinalScore { get; set; }
    public string? FinalComments { get; set; }
    public string Status { get; set; } = "pending"; // pending, self_completed, evaluator_completed, finalized

    public EvaluationCycle Cycle { get; set; } = default!;
    public Employee Employee { get; set; } = default!;
    public Employee? Evaluator { get; set; }
}

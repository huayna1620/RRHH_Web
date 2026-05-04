using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class OnboardingProcess : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public Guid TemplateId { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }

    public Employee Employee { get; set; } = default!;
    public OnboardingTemplate Template { get; set; } = default!;
    public ICollection<OnboardingTask> Tasks { get; set; } = [];
}

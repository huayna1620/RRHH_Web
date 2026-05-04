using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class OnboardingTemplate : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<OnboardingTemplateTask> Tasks { get; set; } = [];
}

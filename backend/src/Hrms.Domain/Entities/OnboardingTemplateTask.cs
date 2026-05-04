using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class OnboardingTemplateTask : BaseEntity
{
    public Guid TemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    public OnboardingTemplate Template { get; set; } = default!;
}

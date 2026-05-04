using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class OnboardingTask : BaseEntity
{
    public Guid ProcessId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public string? CompletedByUserName { get; set; }

    public OnboardingProcess Process { get; set; } = default!;
}

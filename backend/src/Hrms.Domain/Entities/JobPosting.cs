using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class JobPosting : AuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AreaName { get; set; }
    public string? PositionName { get; set; }
    public string Status { get; set; } = "open";
    public DateOnly OpenedDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? ClosedDate { get; set; }
    public int RequiredCount { get; set; } = 1;
    public string? Notes { get; set; }

    public ICollection<RecruitmentCandidate> Candidates { get; set; } = new List<RecruitmentCandidate>();
}

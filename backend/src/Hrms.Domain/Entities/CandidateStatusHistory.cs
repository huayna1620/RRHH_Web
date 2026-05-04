using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class CandidateStatusHistory : BaseEntity
{
    public Guid CandidateId { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
    public string ChangedBy { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? RejectionReason { get; set; }

    public RecruitmentCandidate Candidate { get; set; } = default!;
}

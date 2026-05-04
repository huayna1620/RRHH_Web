using Hrms.Domain.Common;
using Hrms.Domain.Constants;

namespace Hrms.Domain.Entities;

public sealed class RecruitmentCandidate : AuditableEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PositionApplied { get; set; } = string.Empty;
    public decimal? ExpectedSalary { get; set; }
    public string? Source { get; set; }
    public string CurrentStatus { get; set; } = RecruitmentCandidateStatuses.New;
    public bool IsPotentialHire { get; set; }
    public DateOnly ApplicationDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? NextStepDate { get; set; }
    public string? Notes { get; set; }
    public DateTime? LastStatusChangeAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public Guid? JobPostingId { get; set; }
    public bool ConvertedToEmployee { get; set; }
    public Guid? ConvertedEmployeeId { get; set; }

    public JobPosting? JobPosting { get; set; }
}

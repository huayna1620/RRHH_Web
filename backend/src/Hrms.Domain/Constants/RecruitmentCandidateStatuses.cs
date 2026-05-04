namespace Hrms.Domain.Constants;

public static class RecruitmentCandidateStatuses
{
    public const string New = "new";
    public const string Screening = "screening";
    public const string Interview = "interview";
    public const string Offered = "offered";
    public const string Hired = "hired";
    public const string Rejected = "rejected";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        New,
        Screening,
        Interview,
        Offered,
        Hired,
        Rejected
    };
}

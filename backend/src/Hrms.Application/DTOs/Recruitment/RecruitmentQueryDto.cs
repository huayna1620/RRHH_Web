namespace Hrms.Application.DTOs.Recruitment;

public sealed class RecruitmentQueryDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public bool? IsPotentialHire { get; set; }
    public bool? IsActive { get; set; }
    public Guid? JobPostingId { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

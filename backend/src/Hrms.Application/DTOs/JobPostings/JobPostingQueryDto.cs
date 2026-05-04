namespace Hrms.Application.DTOs.JobPostings;

public sealed record JobPostingQueryDto(
    string? Search,
    string? Status,
    int PageNumber,
    int PageSize);

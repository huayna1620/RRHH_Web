namespace Hrms.Application.DTOs.JobPostings;

public sealed record CreateJobPostingRequestDto(
    string Title,
    string? Description,
    string? AreaName,
    string? PositionName,
    DateOnly OpenedDate,
    int RequiredCount,
    string? Notes);

namespace Hrms.Application.DTOs.JobPostings;

public sealed record JobPostingDto(
    Guid Id,
    string Title,
    string? Description,
    string? AreaName,
    string? PositionName,
    string Status,
    DateOnly OpenedDate,
    DateOnly? ClosedDate,
    int RequiredCount,
    string? Notes,
    int CandidateCount,
    bool IsActive);

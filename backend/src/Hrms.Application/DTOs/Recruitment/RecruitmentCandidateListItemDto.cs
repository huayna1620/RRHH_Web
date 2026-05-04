namespace Hrms.Application.DTOs.Recruitment;

public sealed record RecruitmentCandidateListItemDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string PositionApplied,
    decimal? ExpectedSalary,
    string? Source,
    string CurrentStatus,
    bool IsPotentialHire,
    DateOnly ApplicationDate,
    DateOnly? NextStepDate,
    bool IsActive,
    Guid? JobPostingId,
    string? JobPostingTitle,
    bool ConvertedToEmployee);

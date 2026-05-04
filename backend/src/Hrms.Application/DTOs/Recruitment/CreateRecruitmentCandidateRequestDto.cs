namespace Hrms.Application.DTOs.Recruitment;

public sealed record CreateRecruitmentCandidateRequestDto(
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
    string? Notes,
    Guid? JobPostingId);

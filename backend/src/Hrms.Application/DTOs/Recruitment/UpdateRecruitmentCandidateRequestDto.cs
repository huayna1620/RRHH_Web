namespace Hrms.Application.DTOs.Recruitment;

public sealed record UpdateRecruitmentCandidateRequestDto(
    string FullName,
    string Email,
    string PhoneNumber,
    string PositionApplied,
    decimal? ExpectedSalary,
    string? Source,
    bool IsPotentialHire,
    DateOnly ApplicationDate,
    DateOnly? NextStepDate,
    string? Notes,
    Guid? JobPostingId);

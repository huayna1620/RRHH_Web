namespace Hrms.Application.DTOs.Recruitment;

public sealed record RecruitmentCandidateDetailDto(
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
    string? Notes,
    DateTime? LastStatusChangeAtUtc,
    bool IsActive,
    Guid? JobPostingId,
    string? JobPostingTitle,
    string? RejectionReason,
    bool ConvertedToEmployee,
    Guid? ConvertedEmployeeId);

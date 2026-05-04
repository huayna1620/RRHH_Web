namespace Hrms.Application.DTOs.Recruitment;

public sealed record UpdateRecruitmentStatusRequestDto(
    string Status,
    DateOnly? NextStepDate,
    bool? IsPotentialHire,
    string? Notes,
    string? RejectionReason);

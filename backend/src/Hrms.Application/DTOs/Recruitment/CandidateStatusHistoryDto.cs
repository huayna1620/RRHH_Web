namespace Hrms.Application.DTOs.Recruitment;

public sealed record CandidateStatusHistoryDto(
    Guid Id,
    string FromStatus,
    string ToStatus,
    DateTime ChangedAtUtc,
    string ChangedBy,
    string? Notes,
    string? RejectionReason);

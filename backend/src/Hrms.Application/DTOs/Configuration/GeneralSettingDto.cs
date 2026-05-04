namespace Hrms.Application.DTOs.Configuration;

public sealed record GeneralSettingDto(
    Guid Id,
    string Key,
    string Value,
    string? Description,
    bool IsSensitive,
    DateTime? UpdatedAtUtc);

namespace Hrms.Application.DTOs.Configuration;

public sealed record UpsertGeneralSettingRequestDto(
    string Value,
    string? Description,
    bool IsSensitive);

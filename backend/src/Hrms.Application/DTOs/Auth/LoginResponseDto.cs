namespace Hrms.Application.DTOs.Auth;

public sealed record LoginResponseDto(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    Guid UserId,
    string UserName,
    string FullName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

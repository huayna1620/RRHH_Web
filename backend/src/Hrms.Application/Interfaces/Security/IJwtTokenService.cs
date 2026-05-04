using Hrms.Domain.Entities;

namespace Hrms.Application.Interfaces.Security;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(User user, IReadOnlyList<string> roles, IReadOnlyList<string> permissions);
    (string RawToken, string HashedToken, DateTime ExpiresAtUtc) GenerateRefreshToken();
    string HashToken(string token);
}

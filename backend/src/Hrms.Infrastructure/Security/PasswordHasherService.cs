using Hrms.Application.Interfaces.Security;
using Hrms.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Hrms.Infrastructure.Security;

public sealed class PasswordHasherService : IPasswordHasherService
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    public string HashPassword(User user, string password) => _passwordHasher.HashPassword(user, password);

    public bool VerifyPassword(User user, string providedPassword, string passwordHash)
    {
        var result = _passwordHasher.VerifyHashedPassword(user, passwordHash, providedPassword);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}

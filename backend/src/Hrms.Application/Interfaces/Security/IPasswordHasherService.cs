using Hrms.Domain.Entities;

namespace Hrms.Application.Interfaces.Security;

public interface IPasswordHasherService
{
    string HashPassword(User user, string password);
    bool VerifyPassword(User user, string providedPassword, string passwordHash);
}

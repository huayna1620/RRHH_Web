using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class User : AuditableEntity
{
    public string UserName { get; set; } = string.Empty;
    public string NormalizedUserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string NormalizedEmail { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime? LastLoginAtUtc { get; set; }
    public string? ResetPasswordTokenHash { get; set; }
    public DateTime? ResetPasswordTokenExpiresAtUtc { get; set; }
    public Guid? EmployeeId { get; set; }

    public Employee? Employee { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

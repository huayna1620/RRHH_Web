using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class RefreshToken : AuditableEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;
    public bool IsRevoked => RevokedAtUtc.HasValue;

    public User User { get; set; } = default!;
}

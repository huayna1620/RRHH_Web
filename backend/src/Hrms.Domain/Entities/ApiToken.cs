using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class ApiToken : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty; // SHA-256 of the actual token
    public string TokenPrefix { get; set; } = string.Empty; // First 8 chars shown in UI
    public string[] Scopes { get; set; } = []; // e.g. employees:read, payroll:read
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? LastUsedAtUtc { get; set; }
    public string? Description { get; set; }
}

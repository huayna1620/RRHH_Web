using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class GeneralSetting : AuditableEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSensitive { get; set; }
}

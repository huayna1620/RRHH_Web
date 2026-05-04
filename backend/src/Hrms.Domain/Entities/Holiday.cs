using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class Holiday : AuditableEntity
{
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
}

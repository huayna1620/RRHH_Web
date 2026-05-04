using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class EmployeeChangeLog : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public string FieldName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Reason { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public string? ChangedByUserName { get; set; }
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

    public Employee Employee { get; set; } = default!;
}

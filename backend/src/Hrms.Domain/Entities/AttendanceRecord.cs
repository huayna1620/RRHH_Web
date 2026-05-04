using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class AttendanceRecord : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime? CheckInAtUtc { get; set; }
    public DateTime? CheckOutAtUtc { get; set; }
    public int LateMinutes { get; set; }
    public bool IsAbsent { get; set; }
    public string? Justification { get; set; }
    public DateTime? JustifiedAtUtc { get; set; }

    public Employee Employee { get; set; } = default!;
}

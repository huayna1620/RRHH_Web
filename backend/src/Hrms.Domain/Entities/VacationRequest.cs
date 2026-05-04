using Hrms.Domain.Common;
using Hrms.Domain.Constants;

namespace Hrms.Domain.Entities;

public sealed class VacationRequest : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int RequestedDays { get; set; }
    public string Status { get; set; } = VacationRequestStatuses.Pending;
    public string? Reason { get; set; }
    public string? ReviewerComment { get; set; }
    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAtUtc { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByUserName { get; set; }

    public Employee Employee { get; set; } = default!;
}

using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class Branch : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string BranchType { get; set; } = "Administrativa";
    public string? Description { get; set; }
    public string Country { get; set; } = "Perú";
    public string Region { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? ResponsibleName { get; set; }
    public string? ResponsibleTitle { get; set; }
    public int? Capacity { get; set; }
    public string? BusinessHours { get; set; }
    public string? CostCenter { get; set; }
    public DateTime? OpenedAtUtc { get; set; }
    public bool VisibleForAssignments { get; set; } = true;
    public bool RequiresApprovalForChanges { get; set; }

    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

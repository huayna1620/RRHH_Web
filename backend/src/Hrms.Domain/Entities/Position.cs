using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class Position : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Level { get; set; }
    public Guid? AreaId { get; set; }
    public Guid? ReportsToEmployeeId { get; set; }

    public Area? Area { get; set; }
    public Employee? ReportsToEmployee { get; set; }
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

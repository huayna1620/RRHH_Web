using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class Area : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;

    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

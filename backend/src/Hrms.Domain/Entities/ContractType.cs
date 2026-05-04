using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class ContractType : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;

    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}

namespace Hrms.Application.DTOs.Employees;

public sealed class EmployeeQueryDto
{
    public string? Search { get; set; }
    public Guid? AreaId { get; set; }
    public Guid? BranchId { get; set; }
    public Guid? PositionId { get; set; }
    public Guid? ContractTypeId { get; set; }
    public bool? IsActive { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "fullName";
    public string SortDirection { get; set; } = "asc";
}

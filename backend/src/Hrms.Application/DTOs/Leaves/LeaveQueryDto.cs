namespace Hrms.Application.DTOs.Leaves;

public sealed class LeaveQueryDto
{
    public string? Search { get; set; }
    public Guid? EmployeeId { get; set; }
    public string? Status { get; set; }
    public string? LeaveType { get; set; }
    public DateOnly? StartDateFrom { get; set; }
    public DateOnly? StartDateTo { get; set; }
    public int? Year { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

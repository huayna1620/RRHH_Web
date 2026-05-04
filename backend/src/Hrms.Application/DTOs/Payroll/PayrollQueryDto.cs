namespace Hrms.Application.DTOs.Payroll;

public sealed class PayrollQueryDto
{
    public string? Search { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? AreaId { get; set; }
    public int? Year { get; set; }
    public int? Month { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

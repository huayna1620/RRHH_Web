namespace Hrms.Application.DTOs.Vacations;

public sealed class VacationQueryDto
{
    public string? Search { get; set; }
    public Guid? EmployeeId { get; set; }
    public string? Status { get; set; }
    public DateOnly? StartDateFrom { get; set; }
    public DateOnly? StartDateTo { get; set; }
    public int? Year { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}

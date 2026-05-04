namespace Hrms.Application.DTOs.Reports;

public sealed class ReportsPeriodQueryDto
{
    public int? Year { get; set; }
    public int? Month { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}

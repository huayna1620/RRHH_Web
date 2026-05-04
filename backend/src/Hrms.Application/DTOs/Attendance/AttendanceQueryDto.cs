namespace Hrms.Application.DTOs.Attendance;

public sealed class AttendanceQueryDto
{
    public string ViewMode { get; set; } = "daily";
    public DateOnly? ReferenceDate { get; set; }
    public DateOnly? StartDateFrom { get; set; }
    public DateOnly? StartDateTo { get; set; }
    public string? Search { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? AreaId { get; set; }
    public bool? IsLate { get; set; }
    public bool? IsAbsent { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

namespace Hrms.Application.DTOs.Attendance;

public sealed class MarkAbsentRequestDto
{
    public Guid EmployeeId { get; set; }
    public DateOnly? AttendanceDate { get; set; }
    public string? Reason { get; set; }
}

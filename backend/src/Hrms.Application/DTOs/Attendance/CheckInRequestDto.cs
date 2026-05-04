namespace Hrms.Application.DTOs.Attendance;

public sealed class CheckInRequestDto
{
    public Guid EmployeeId { get; set; }
    public DateOnly? AttendanceDate { get; set; }
    public DateTime? CheckInAtUtc { get; set; }
}

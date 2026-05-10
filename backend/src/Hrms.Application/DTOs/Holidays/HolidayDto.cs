namespace Hrms.Application.DTOs.Holidays;

public sealed record HolidayDto(
    Guid Id,
    DateOnly Date,
    string Name,
    bool IsRecurring,
    bool IsActive);

public sealed class CreateHolidayRequestDto
{
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
}

public sealed class UpdateHolidayRequestDto
{
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsRecurring { get; set; }
    public bool IsActive { get; set; } = true;
}

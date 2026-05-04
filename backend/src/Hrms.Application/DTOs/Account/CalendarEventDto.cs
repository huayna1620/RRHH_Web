namespace Hrms.Application.DTOs.Account;

public sealed record CalendarEventDto(
    string Type,
    string Title,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Status,
    string? EmployeeName);

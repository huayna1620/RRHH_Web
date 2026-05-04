namespace Hrms.Application.DTOs.Vacations;

public sealed record CreateVacationRequestDto(
    Guid EmployeeId,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason);

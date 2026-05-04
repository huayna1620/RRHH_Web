namespace Hrms.Application.DTOs.Vacations;

public sealed record VacationEmployeeBalanceDto(
    Guid Id,
    string Label,
    int AnnualEntitlementDays,
    int UsedDays,
    int PendingDays,
    int AvailableDays);

using Hrms.Application.DTOs.Account;

namespace Hrms.Application.Interfaces.Services;

public interface IAccountService
{
    Task<AccountProfileDto?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<AccountProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, CancellationToken cancellationToken = default);
    Task<EmployeeDashboardDto?> GetEmployeeDashboardAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CalendarEventDto>> GetCalendarEventsAsync(Guid userId, int year, int month, CancellationToken cancellationToken = default);
}

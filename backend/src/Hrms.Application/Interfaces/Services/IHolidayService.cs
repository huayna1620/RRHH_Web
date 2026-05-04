using Hrms.Application.DTOs.Holidays;

namespace Hrms.Application.Interfaces.Services;

public interface IHolidayService
{
    Task<IReadOnlyList<HolidayDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<HolidayDto> CreateAsync(CreateHolidayRequestDto request, CancellationToken cancellationToken = default);
    Task<HolidayDto?> UpdateAsync(Guid id, UpdateHolidayRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<DateOnly>> GetHolidayDatesForYearAsync(int year, CancellationToken cancellationToken = default);
}

using Hrms.Application.DTOs.Holidays;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class HolidayService(HrmsDbContext dbContext) : IHolidayService
{
    public async Task<IReadOnlyList<HolidayDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Set<Holiday>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Date)
            .Select(x => new HolidayDto(x.Id, x.Date, x.Name, x.IsRecurring, x.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<HolidayDto> CreateAsync(CreateHolidayRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("El nombre del feriado es obligatorio.");
        }

        var exists = await dbContext.Set<Holiday>().AnyAsync(
            x => !x.IsDeleted && x.Date == request.Date && x.Name == request.Name.Trim(),
            cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException("Ya existe un feriado con la misma fecha y nombre.");
        }

        var holiday = new Holiday
        {
            Date = request.Date,
            Name = request.Name.Trim(),
            IsRecurring = request.IsRecurring,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Set<Holiday>().AddAsync(holiday, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new HolidayDto(holiday.Id, holiday.Date, holiday.Name, holiday.IsRecurring, holiday.IsActive);
    }

    public async Task<HolidayDto?> UpdateAsync(Guid id, UpdateHolidayRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("El nombre del feriado es obligatorio.");
        }

        var holiday = await dbContext.Set<Holiday>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (holiday is null)
        {
            return null;
        }

        holiday.Date = request.Date;
        holiday.Name = request.Name.Trim();
        holiday.IsRecurring = request.IsRecurring;
        holiday.IsActive = request.IsActive;
        holiday.UpdatedAtUtc = DateTime.UtcNow;
        holiday.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        return new HolidayDto(holiday.Id, holiday.Date, holiday.Name, holiday.IsRecurring, holiday.IsActive);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var holiday = await dbContext.Set<Holiday>()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (holiday is null)
        {
            return false;
        }

        holiday.IsDeleted = true;
        holiday.IsActive = false;
        holiday.UpdatedAtUtc = DateTime.UtcNow;
        holiday.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlySet<DateOnly>> GetHolidayDatesForYearAsync(int year, CancellationToken cancellationToken = default)
    {
        var holidays = await dbContext.Set<Holiday>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .ToListAsync(cancellationToken);

        var dates = new HashSet<DateOnly>();

        foreach (var h in holidays)
        {
            if (h.IsRecurring)
            {
                // Use same month/day but for the target year
                try
                {
                    dates.Add(new DateOnly(year, h.Date.Month, h.Date.Day));
                }
                catch (ArgumentOutOfRangeException)
                {
                    // e.g. Feb 29 in non-leap year — skip
                }
            }
            else if (h.Date.Year == year)
            {
                dates.Add(h.Date);
            }
        }

        return dates;
    }
}

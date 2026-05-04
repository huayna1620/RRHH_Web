using Hrms.Application.DTOs.Attendance;
using Hrms.Application.DTOs.Common;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AttendanceService(HrmsDbContext dbContext) : IAttendanceService
{
    public async Task<PagedResultDto<AttendanceListItemDto>> GetPagedAsync(AttendanceQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var referenceDate = query.ReferenceDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var (startDate, endDate) = ResolveRange(query.ViewMode, referenceDate);
        if (query.StartDateFrom.HasValue) startDate = query.StartDateFrom.Value;
        if (query.StartDateTo.HasValue) endDate = query.StartDateTo.Value;

        var attendanceQuery = dbContext.AttendanceRecords
            .AsNoTracking()
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area!)
            .Where(x => !x.IsDeleted && x.AttendanceDate >= startDate && x.AttendanceDate <= endDate);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            attendanceQuery = attendanceQuery.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search) ||
                x.Employee.DocumentNumber.ToLower().Contains(search) ||
                x.Employee.Area.Name.ToLower().Contains(search));
        }

        if (query.EmployeeId.HasValue)
        {
            attendanceQuery = attendanceQuery.Where(x => x.EmployeeId == query.EmployeeId.Value);
        }
        
        if (query.AreaId.HasValue)
        {
            attendanceQuery = attendanceQuery.Where(x => x.Employee.AreaId == query.AreaId.Value);
        }

        if (query.IsLate.HasValue)
        {
            attendanceQuery = query.IsLate.Value
                ? attendanceQuery.Where(x => x.LateMinutes > 0)
                : attendanceQuery.Where(x => x.LateMinutes == 0);
        }

        if (query.IsAbsent.HasValue)
        {
            attendanceQuery = attendanceQuery.Where(x => x.IsAbsent == query.IsAbsent.Value);
        }

        var totalCount = await attendanceQuery.CountAsync(cancellationToken);

        var items = await attendanceQuery
            .OrderByDescending(x => x.AttendanceDate)
            .ThenBy(x => x.Employee.LastName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AttendanceListItemDto(
                x.Id,
                x.EmployeeId,
                x.Employee.EmployeeCode,
                x.Employee.FirstName + " " + x.Employee.LastName,
                x.Employee.Area.Name,
                x.AttendanceDate,
                NormalizeAsUtcNullable(x.CheckInAtUtc),
                NormalizeAsUtcNullable(x.CheckOutAtUtc),
                x.LateMinutes,
                x.IsAbsent,
                x.Justification,
                !string.IsNullOrWhiteSpace(x.Justification)))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AttendanceListItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<AttendanceSummaryDto> GetSummaryAsync(AttendanceQueryDto query, CancellationToken cancellationToken = default)
    {
        var referenceDate = query.ReferenceDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var (startDate, endDate) = ResolveRange(query.ViewMode, referenceDate);
        if (query.StartDateFrom.HasValue) startDate = query.StartDateFrom.Value;
        if (query.StartDateTo.HasValue) endDate = query.StartDateTo.Value;

        var baseEmployees = dbContext.Employees
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive);

        if (query.AreaId.HasValue)
        {
            baseEmployees = baseEmployees.Where(x => x.AreaId == query.AreaId.Value);
        }

        var attendance = dbContext.AttendanceRecords
            .AsNoTracking()
            .Include(x => x.Employee)
            .Where(x => !x.IsDeleted && x.AttendanceDate >= startDate && x.AttendanceDate <= endDate);

        if (query.AreaId.HasValue)
        {
            attendance = attendance.Where(x => x.Employee.AreaId == query.AreaId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            attendance = attendance.Where(x =>
                x.Employee.EmployeeCode.ToLower().Contains(search) ||
                x.Employee.FirstName.ToLower().Contains(search) ||
                x.Employee.LastName.ToLower().Contains(search) ||
                x.Employee.DocumentNumber.ToLower().Contains(search) ||
                x.Employee.Area.Name.ToLower().Contains(search));
        }

        var records = await attendance.ToListAsync(cancellationToken);
        var totalEmployees = await baseEmployees.CountAsync(cancellationToken);
        var withRecordEmployees = records.Select(x => x.EmployeeId).Distinct().Count();

        var absent = records.Count(x => x.IsAbsent);
        var late = records.Count(x => !x.IsAbsent && x.LateMinutes > 0);
        var onTime = records.Count(x => !x.IsAbsent && x.LateMinutes == 0 && x.CheckInAtUtc.HasValue);
        var pendingCheckOut = records.Count(x => !x.IsAbsent && x.CheckInAtUtc.HasValue && !x.CheckOutAtUtc.HasValue);
        var justified = records.Count(x => !string.IsNullOrWhiteSpace(x.Justification));
        var present = records.Count(x => !x.IsAbsent && x.CheckInAtUtc.HasValue);
        var noRecord = Math.Max(0, totalEmployees - withRecordEmployees);

        return new AttendanceSummaryDto(onTime, late, absent, justified, pendingCheckOut, present, noRecord);
    }

    public async Task<AttendanceListItemDto> CheckInAsync(CheckInRequestDto request, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees
            .Include(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El empleado no existe.");

        if (!employee.IsActive)
        {
            throw new InvalidOperationException("No se puede registrar asistencia para un empleado inactivo.");
        }

        var (expectedStart, toleranceMinutes, justificationDays, timeZoneId) = await GetScheduleSettingsAsync(cancellationToken);
        var attendanceDate = request.AttendanceDate ?? GetBusinessDate(timeZoneId);
        var checkInAtUtc = NormalizeAsUtc(request.CheckInAtUtc ?? DateTime.UtcNow);

        var existing = await dbContext.AttendanceRecords
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(
                x => x.EmployeeId == request.EmployeeId && x.AttendanceDate == attendanceDate && !x.IsDeleted,
                cancellationToken);

        if (existing is not null && existing.CheckInAtUtc.HasValue)
        {
            throw new InvalidOperationException("La asistencia de ingreso ya fue registrada para esta fecha.");
        }

        var checkInLocalTime = ConvertUtcToLocalTimeOfDay(checkInAtUtc, timeZoneId);
        var lateMinutes = Math.Max(0, (int)(checkInLocalTime.ToTimeSpan() - expectedStart.ToTimeSpan()).TotalMinutes);

        AttendanceRecord record;

        if (existing is null)
        {
            record = new AttendanceRecord
            {
                EmployeeId = employee.Id,
                AttendanceDate = attendanceDate,
                CheckInAtUtc = checkInAtUtc,
                LateMinutes = lateMinutes,
                IsAbsent = false,
                CreatedBy = "system",
                UpdatedBy = "system"
            };

            await dbContext.AttendanceRecords.AddAsync(record, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            existing.CheckInAtUtc = checkInAtUtc;
            existing.IsAbsent = false;
            existing.LateMinutes = lateMinutes;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            existing.UpdatedBy = "system";

            await dbContext.SaveChangesAsync(cancellationToken);
            record = existing;
        }

        // Auto-generate tardanza incident when lateMinutes exceeds tolerance
        if (lateMinutes > toleranceMinutes)
        {
            await EnsureIncidentAsync(
                record,
                AttendanceIncidentTypes.Tardanza,
                lateMinutes,
                justificationDays,
                cancellationToken);
        }

        return new AttendanceListItemDto(
            record.Id,
            employee.Id,
            employee.EmployeeCode,
            employee.FirstName + " " + employee.LastName,
            employee.Area.Name,
            record.AttendanceDate,
            NormalizeAsUtcNullable(record.CheckInAtUtc),
            NormalizeAsUtcNullable(record.CheckOutAtUtc),
            record.LateMinutes,
            record.IsAbsent,
            record.Justification,
            !string.IsNullOrWhiteSpace(record.Justification));
    }

    public async Task<AttendanceListItemDto> CheckOutAsync(Guid attendanceId, CheckOutRequestDto request, CancellationToken cancellationToken = default)
    {
        var record = await dbContext.AttendanceRecords
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == attendanceId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe el registro de asistencia.");

        if (record.IsAbsent)
        {
            throw new InvalidOperationException("No se puede registrar salida en una falta.");
        }

        if (!record.CheckInAtUtc.HasValue)
        {
            throw new InvalidOperationException("No se puede registrar salida sin hora de ingreso.");
        }

        if (record.CheckOutAtUtc.HasValue)
        {
            throw new InvalidOperationException("La salida ya fue registrada.");
        }

        var checkOutAtUtc = NormalizeAsUtc(request.CheckOutAtUtc ?? DateTime.UtcNow);
        if (checkOutAtUtc <= record.CheckInAtUtc.Value)
        {
            throw new InvalidOperationException("La hora de salida debe ser mayor a la hora de ingreso.");
        }

        var (_, _, justificationDays, timeZoneId) = await GetScheduleSettingsAsync(cancellationToken);
        var earlyLeaveThreshold = await GetEarlyLeaveThresholdAsync(cancellationToken);
        var expectedEndSetting = await GetSettingValueAsync("work.schedule.end", "18:00", cancellationToken);
        var expectedEnd = TimeOnly.TryParse(expectedEndSetting, out var parsedEnd) ? parsedEnd : new TimeOnly(18, 0);

        var checkOutLocalTime = ConvertUtcToLocalTimeOfDay(checkOutAtUtc, timeZoneId);
        var earlyMinutes = Math.Max(0, (int)(expectedEnd.ToTimeSpan() - checkOutLocalTime.ToTimeSpan()).TotalMinutes);

        record.CheckOutAtUtc = checkOutAtUtc;
        record.UpdatedAtUtc = DateTime.UtcNow;
        record.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        // Auto-generate salida_anticipada incident when leaving significantly early
        if (earlyMinutes > earlyLeaveThreshold)
        {
            await EnsureIncidentAsync(
                record,
                AttendanceIncidentTypes.SalidaAnticipada,
                earlyMinutes,
                justificationDays,
                cancellationToken);
        }

        return ToDto(record);
    }

    public async Task<AttendanceListItemDto> MarkAbsentAsync(MarkAbsentRequestDto request, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees
            .Include(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El empleado no existe.");

        var timeZoneId = await GetSettingValueAsync("company.timezone", "America/Lima", cancellationToken);
        var attendanceDate = request.AttendanceDate ?? GetBusinessDate(timeZoneId);

        var record = await dbContext.AttendanceRecords
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(
                x => x.EmployeeId == request.EmployeeId && x.AttendanceDate == attendanceDate && !x.IsDeleted,
                cancellationToken);

        var (_, _, justificationDays, _) = await GetScheduleSettingsAsync(cancellationToken);

        if (record is null)
        {
            record = new AttendanceRecord
            {
                EmployeeId = employee.Id,
                AttendanceDate = attendanceDate,
                IsAbsent = true,
                LateMinutes = 0,
                Justification = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
                JustifiedAtUtc = string.IsNullOrWhiteSpace(request.Reason) ? null : DateTime.UtcNow,
                CreatedBy = "system",
                UpdatedBy = "system"
            };

            await dbContext.AttendanceRecords.AddAsync(record, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            if (record.CheckInAtUtc.HasValue || record.CheckOutAtUtc.HasValue)
            {
                throw new InvalidOperationException("No se puede marcar falta cuando ya existe ingreso o salida.");
            }

            record.IsAbsent = true;
            record.LateMinutes = 0;
            if (!string.IsNullOrWhiteSpace(request.Reason))
            {
                record.Justification = request.Reason.Trim();
                record.JustifiedAtUtc = DateTime.UtcNow;
            }

            record.UpdatedAtUtc = DateTime.UtcNow;
            record.UpdatedBy = "system";

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Auto-generate falta incident
        await EnsureIncidentAsync(record, AttendanceIncidentTypes.Falta, 0, justificationDays, cancellationToken);

        return new AttendanceListItemDto(
            record.Id,
            employee.Id,
            employee.EmployeeCode,
            employee.FirstName + " " + employee.LastName,
            employee.Area.Name,
            record.AttendanceDate,
            NormalizeAsUtcNullable(record.CheckInAtUtc),
            NormalizeAsUtcNullable(record.CheckOutAtUtc),
            record.LateMinutes,
            record.IsAbsent,
            record.Justification,
            !string.IsNullOrWhiteSpace(record.Justification));
    }

    public async Task<AttendanceListItemDto> JustifyAsync(Guid attendanceId, JustifyAttendanceRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Justification))
        {
            throw new InvalidOperationException("La justificacion es obligatoria.");
        }

        var record = await dbContext.AttendanceRecords
            .Include(x => x.Employee)
                .ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == attendanceId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe el registro de asistencia.");

        record.Justification = request.Justification.Trim();
        record.JustifiedAtUtc = DateTime.UtcNow;
        record.UpdatedAtUtc = DateTime.UtcNow;
        record.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(record);
    }

    public async Task<AttendanceCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default)
    {
        var scheduleStartSetting = await GetSettingValueAsync("work.schedule.start", "08:00", cancellationToken);
        var scheduleEndSetting = await GetSettingValueAsync("work.schedule.end", "18:00", cancellationToken);
        var timeZoneId = await GetSettingValueAsync("company.timezone", "America/Lima", cancellationToken);

        var expectedStart = TimeOnly.TryParse(scheduleStartSetting, out var start) ? start : new TimeOnly(8, 0);
        var expectedEnd = TimeOnly.TryParse(scheduleEndSetting, out var end) ? end : new TimeOnly(18, 0);
        var shiftName = ResolveShiftLabel(expectedStart, expectedEnd, timeZoneId);
        var expectedSchedule = $"{expectedStart:HH\\:mm} - {expectedEnd:HH\\:mm}";

        var employees = await dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.Position)
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .Select(x => new AttendanceEmployeeOptionDto(
                x.Id,
                x.EmployeeCode + " - " + x.FirstName + " " + x.LastName,
                x.EmployeeCode,
                x.DocumentNumber,
                x.FirstName + " " + x.LastName,
                x.AreaId,
                x.Area.Name,
                x.Position.Name,
                shiftName,
                expectedSchedule))
            .ToListAsync(cancellationToken);

        var areas = await dbContext.Areas
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new AttendanceAreaOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        return new AttendanceCatalogsDto(
            employees,
            areas,
            new AttendanceScheduleDto(timeZoneId, shiftName, $"{expectedStart:HH\\:mm}", $"{expectedEnd:HH\\:mm}"));
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private async Task EnsureIncidentAsync(
        AttendanceRecord record,
        string incidentType,
        int minutesImpacted,
        int justificationDays,
        CancellationToken cancellationToken)
    {
        // Avoid duplicate incidents for the same record + type
        var alreadyExists = await dbContext.AttendanceIncidents
            .AnyAsync(x => x.AttendanceRecordId == record.Id
                && x.IncidentType == incidentType
                && !x.IsDeleted,
                cancellationToken);

        if (alreadyExists)
            return;

        var deadline = DateTime.UtcNow.AddDays(justificationDays);

        var incident = new AttendanceIncident
        {
            EmployeeId = record.EmployeeId,
            AttendanceRecordId = record.Id,
            IncidentType = incidentType,
            IncidentDate = record.AttendanceDate,
            MinutesImpacted = minutesImpacted,
            Status = AttendanceIncidentStatuses.Open,
            JustificationDeadlineUtc = deadline,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.AttendanceIncidents.AddAsync(incident, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<(TimeOnly expectedStart, int toleranceMinutes, int justificationDays, string timeZoneId)> GetScheduleSettingsAsync(
        CancellationToken cancellationToken)
    {
        var keys = new[]
        {
            "work.schedule.start",
            "attendance.late_tolerance_minutes",
            "attendance.justification_days",
            "company.timezone"
        };

        var settings = await dbContext.GeneralSettings
            .AsNoTracking()
            .Where(x => keys.Contains(x.Key) && !x.IsDeleted)
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

        var startStr = settings.GetValueOrDefault("work.schedule.start", "08:00");
        var expectedStart = TimeOnly.TryParse(startStr, out var parsed) ? parsed : new TimeOnly(8, 0);

        var toleranceStr = settings.GetValueOrDefault("attendance.late_tolerance_minutes", "5");
        var toleranceMinutes = int.TryParse(toleranceStr, out var t) ? t : 5;

        var justDaysStr = settings.GetValueOrDefault("attendance.justification_days", "3");
        var justificationDays = int.TryParse(justDaysStr, out var j) ? j : 3;

        var timeZoneId = settings.GetValueOrDefault("company.timezone", "America/Lima");

        return (expectedStart, toleranceMinutes, justificationDays, timeZoneId);
    }

    /// <summary>
    /// Converts a UTC DateTime to the time-of-day in the configured company timezone.
    /// Supports both IANA (e.g. "America/Lima") and Windows IDs (e.g. "SA Pacific Standard Time").
    /// Falls back to UTC if the timezone id is invalid.
    /// </summary>
    private static TimeOnly ConvertUtcToLocalTimeOfDay(DateTime utc, string timeZoneId)
    {
        if (utc.Kind == DateTimeKind.Unspecified)
        {
            utc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        }
        else if (utc.Kind == DateTimeKind.Local)
        {
            utc = utc.ToUniversalTime();
        }

        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
            return TimeOnly.FromDateTime(local);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeOnly.FromDateTime(utc);
        }
        catch (InvalidTimeZoneException)
        {
            return TimeOnly.FromDateTime(utc);
        }
    }

    private static string ResolveShiftLabel(TimeOnly start, TimeOnly end, string timeZoneId)
    {
        var nowLocal = ConvertUtcToLocalTimeOfDay(DateTime.UtcNow, timeZoneId);
        if (nowLocal >= start && nowLocal < end)
        {
            return "Turno en curso";
        }

        if (nowLocal < start)
        {
            return "Próximo turno";
        }

        return "Fuera de turno";
    }

    private async Task<int> GetEarlyLeaveThresholdAsync(CancellationToken cancellationToken)
    {
        var value = await GetSettingValueAsync("attendance.early_leave_minutes", "10", cancellationToken);
        return int.TryParse(value, out var v) ? v : 10;
    }

    private async Task<string> GetSettingValueAsync(string key, string defaultValue, CancellationToken cancellationToken)
    {
        var setting = await dbContext.GeneralSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key && !x.IsDeleted, cancellationToken);

        return setting?.Value ?? defaultValue;
    }

    private static AttendanceListItemDto ToDto(AttendanceRecord record)
    {
        return new AttendanceListItemDto(
            record.Id,
            record.EmployeeId,
            record.Employee.EmployeeCode,
            record.Employee.FirstName + " " + record.Employee.LastName,
            record.Employee.Area.Name,
            record.AttendanceDate,
            NormalizeAsUtcNullable(record.CheckInAtUtc),
            NormalizeAsUtcNullable(record.CheckOutAtUtc),
            record.LateMinutes,
            record.IsAbsent,
            record.Justification,
            !string.IsNullOrWhiteSpace(record.Justification));
    }

    private static DateTime NormalizeAsUtc(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc) return value;
        if (value.Kind == DateTimeKind.Local) return value.ToUniversalTime();
        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static DateTime? NormalizeAsUtcNullable(DateTime? value)
    {
        return value.HasValue ? NormalizeAsUtc(value.Value) : null;
    }

    private static DateOnly GetBusinessDate(string timeZoneId)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            return DateOnly.FromDateTime(local);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
        catch (InvalidTimeZoneException)
        {
            return DateOnly.FromDateTime(DateTime.UtcNow);
        }
    }

    private static (DateOnly Start, DateOnly End) ResolveRange(string? viewMode, DateOnly referenceDate)
    {
        var mode = viewMode?.Trim().ToLowerInvariant() ?? "daily";

        if (mode == "monthly")
        {
            var start = new DateOnly(referenceDate.Year, referenceDate.Month, 1);
            var end = start.AddMonths(1).AddDays(-1);
            return (start, end);
        }

        if (mode == "weekly")
        {
            var dayOfWeek = (int)referenceDate.DayOfWeek;
            var normalized = dayOfWeek == 0 ? 7 : dayOfWeek;
            var start = referenceDate.AddDays(-(normalized - 1));
            var end = start.AddDays(6);
            return (start, end);
        }

        return (referenceDate, referenceDate);
    }
}

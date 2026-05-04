using System.Security.Cryptography;
using System.Text;
using Hrms.Application.DTOs.Integrations;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services.Calendar;

public sealed class CalendarFeedService(
    HrmsDbContext db,
    ILogger<CalendarFeedService> logger) : ICalendarFeedService
{
    // Catálogo expuesto a la UI. "RequiresAdminRole" es un hint informativo — la
    // autorización real la hace el endpoint que crea el feed (permiso IntegrationsManage
    // para crearlos con scopes de tenant).
    private static readonly IReadOnlyList<CalendarFeedScopeDto> _scopes =
    [
        new(CalendarFeedScopes.MyVacations,      "Mis vacaciones",           "Vacaciones aprobadas del empleado asociado a tu cuenta.", false),
        new(CalendarFeedScopes.MyLeaves,         "Mis permisos",             "Permisos y licencias aprobados del empleado asociado a tu cuenta.", false),
        new(CalendarFeedScopes.TeamVacations,    "Vacaciones del equipo",    "Todas las vacaciones aprobadas de la organización.", true),
        new(CalendarFeedScopes.TeamLeaves,       "Permisos del equipo",      "Todos los permisos aprobados de la organización.", true),
        new(CalendarFeedScopes.Holidays,         "Feriados",                 "Calendario laboral con feriados configurados.", true),
        new(CalendarFeedScopes.EvaluationCycles, "Ciclos de evaluación",     "Periodos de evaluación de desempeño activos.", true),
    ];

    public IReadOnlyList<CalendarFeedScopeDto> GetAvailableScopes() => _scopes;

    // ── CRUD ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<CalendarFeedDto>> GetUserFeedsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await db.Set<CalendarFeedToken>()
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new CalendarFeedDto(
                x.Id, x.Name, x.TokenPrefix, x.Scopes,
                x.LastAccessedAtUtc, x.AccessCount,
                x.RevokedAtUtc.HasValue,
                x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<CalendarFeedCreatedDto> CreateFeedAsync(
        Guid userId,
        string userName,
        CreateCalendarFeedRequestDto request,
        string feedBaseUrl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("El nombre del feed es obligatorio.", nameof(request));

        if (request.Scopes.Length == 0)
            throw new ArgumentException("Debes seleccionar al menos un scope para el feed.", nameof(request));

        var invalid = request.Scopes.Where(s => !CalendarFeedScopes.All.Contains(s)).ToArray();
        if (invalid.Length > 0)
            throw new ArgumentException($"Scopes inválidos: {string.Join(", ", invalid)}.", nameof(request));

        // Token URL-safe de 40 bytes ≈ 54 chars — suficiente para descartar brute-force.
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(40))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");
        var tokenHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        var prefix = rawToken[..8];

        var now = DateTime.UtcNow;
        var entity = new CalendarFeedToken
        {
            UserId = userId,
            Name = request.Name.Trim(),
            TokenHash = tokenHash,
            TokenPrefix = prefix,
            Scopes = request.Scopes,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.Set<CalendarFeedToken>().Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        // feedBaseUrl típicamente es "https://hrms.miempresa.com/api/v1/integrations/calendar/feed".
        var feedUrl = $"{feedBaseUrl.TrimEnd('/')}/{rawToken}.ics";

        logger.LogInformation(
            "Calendar feed {FeedId} creado por {User} (scopes: {Scopes})",
            entity.Id, userName, string.Join(",", request.Scopes));

        return new CalendarFeedCreatedDto(entity.Id, entity.Name, feedUrl, entity.Scopes, entity.CreatedAtUtc);
    }

    public async Task<bool> RevokeFeedAsync(Guid userId, Guid feedId, CancellationToken cancellationToken = default)
    {
        var entity = await db.Set<CalendarFeedToken>()
            .FirstOrDefaultAsync(x => x.Id == feedId && x.UserId == userId && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.RevokedAtUtc = DateTime.UtcNow;
        entity.IsDeleted = true;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Calendar feed {FeedId} revocado.", feedId);
        return true;
    }

    // ── Generación ICS ───────────────────────────────────────────────────

    public async Task<string?> GenerateIcsAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken)) return null;

        var tokenHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        var feed = await db.Set<CalendarFeedToken>()
            .Include(x => x.User).ThenInclude(u => u.Employee)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && !x.IsDeleted, cancellationToken);

        if (feed is null || feed.RevokedAtUtc.HasValue) return null;

        // Registrar acceso — no bloqueante: si falla SaveChanges, igual devolvemos el ICS.
        feed.LastAccessedAtUtc = DateTime.UtcNow;
        feed.AccessCount++;

        var builder = new IcsBuilder(
            calendarName: $"HRMS — {feed.Name}",
            description: $"Feed generado por HRMS para {feed.User.FullName}. Scopes: {string.Join(", ", feed.Scopes)}");

        var scopes = new HashSet<string>(feed.Scopes, StringComparer.OrdinalIgnoreCase);

        if (scopes.Contains(CalendarFeedScopes.MyVacations) && feed.User.EmployeeId.HasValue)
            await AppendVacationsAsync(builder, employeeId: feed.User.EmployeeId.Value, teamWide: false, cancellationToken);
        if (scopes.Contains(CalendarFeedScopes.TeamVacations))
            await AppendVacationsAsync(builder, employeeId: null, teamWide: true, cancellationToken);

        if (scopes.Contains(CalendarFeedScopes.MyLeaves) && feed.User.EmployeeId.HasValue)
            await AppendLeavesAsync(builder, employeeId: feed.User.EmployeeId.Value, teamWide: false, cancellationToken);
        if (scopes.Contains(CalendarFeedScopes.TeamLeaves))
            await AppendLeavesAsync(builder, employeeId: null, teamWide: true, cancellationToken);

        if (scopes.Contains(CalendarFeedScopes.Holidays))
            await AppendHolidaysAsync(builder, cancellationToken);

        if (scopes.Contains(CalendarFeedScopes.EvaluationCycles))
            await AppendEvaluationCyclesAsync(builder, cancellationToken);

        // Commit del contador de acceso. Si falla (concurrencia), lo logueamos y seguimos.
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (Exception ex) { logger.LogWarning(ex, "No se pudo actualizar acceso del feed {FeedId}.", feed.Id); }

        return builder.Build();
    }

    // ── Producción de eventos por scope ─────────────────────────────────

    private async Task AppendVacationsAsync(IcsBuilder builder, Guid? employeeId, bool teamWide, CancellationToken ct)
    {
        var q = db.VacationRequests
            .AsNoTracking()
            .Include(v => v.Employee)
            .Where(v => v.Status == VacationRequestStatuses.Approved && !v.IsDeleted);

        if (!teamWide && employeeId.HasValue)
            q = q.Where(v => v.EmployeeId == employeeId.Value);

        // Límite de recencia: desde 1 año atrás hasta futuro. Evita descargar historial masivo.
        var floor = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1));
        q = q.Where(v => v.EndDate >= floor);

        foreach (var v in await q.ToListAsync(ct))
        {
            var who = $"{v.Employee.FirstName} {v.Employee.LastName}".Trim();
            var summary = teamWide ? $"Vacaciones — {who}" : "Vacaciones";
            var description = $"Días: {v.RequestedDays}{(string.IsNullOrWhiteSpace(v.Reason) ? "" : $"\\nMotivo: {v.Reason}")}";
            builder.AddAllDayEvent(
                uid: $"vacation-{v.Id}@hrms",
                startDate: v.StartDate,
                endDateInclusive: v.EndDate,
                summary: summary,
                description: description,
                createdUtc: v.CreatedAtUtc,
                modifiedUtc: v.UpdatedAtUtc,
                category: "Vacaciones");
        }
    }

    private async Task AppendLeavesAsync(IcsBuilder builder, Guid? employeeId, bool teamWide, CancellationToken ct)
    {
        var q = db.LeaveRequests
            .AsNoTracking()
            .Include(l => l.Employee)
            .Where(l => l.Status == LeaveRequestStatuses.Approved && !l.IsDeleted);

        if (!teamWide && employeeId.HasValue)
            q = q.Where(l => l.EmployeeId == employeeId.Value);

        var floor = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1));
        q = q.Where(l => l.EndDate >= floor);

        foreach (var l in await q.ToListAsync(ct))
        {
            var who = $"{l.Employee.FirstName} {l.Employee.LastName}".Trim();
            var label = l.IsPaid ? "Permiso con goce" : "Permiso sin goce";
            var summary = teamWide ? $"{label} — {who}" : label;
            var description = $"Tipo: {l.LeaveType}\\nDías: {l.RequestedDays}{(string.IsNullOrWhiteSpace(l.Reason) ? "" : $"\\nMotivo: {l.Reason}")}";
            builder.AddAllDayEvent(
                uid: $"leave-{l.Id}@hrms",
                startDate: l.StartDate,
                endDateInclusive: l.EndDate,
                summary: summary,
                description: description,
                createdUtc: l.CreatedAtUtc,
                modifiedUtc: l.UpdatedAtUtc,
                category: "Permisos");
        }
    }

    private async Task AppendHolidaysAsync(IcsBuilder builder, CancellationToken ct)
    {
        var holidays = await db.Holidays
            .AsNoTracking()
            .Where(h => !h.IsDeleted)
            .ToListAsync(ct);

        foreach (var h in holidays)
        {
            builder.AddAllDayEvent(
                uid: $"holiday-{h.Id}@hrms",
                startDate: h.Date,
                endDateInclusive: h.Date,
                summary: h.Name,
                description: h.IsRecurring ? "Feriado recurrente" : "Feriado",
                createdUtc: h.CreatedAtUtc,
                modifiedUtc: h.UpdatedAtUtc,
                category: "Feriados");
        }
    }

    private async Task AppendEvaluationCyclesAsync(IcsBuilder builder, CancellationToken ct)
    {
        var cycles = await db.EvaluationCycles
            .AsNoTracking()
            .Where(c => !c.IsDeleted)
            .ToListAsync(ct);

        foreach (var c in cycles)
        {
            builder.AddAllDayEvent(
                uid: $"evalcycle-{c.Id}@hrms",
                startDate: c.StartDate,
                endDateInclusive: c.EndDate,
                summary: $"Ciclo de evaluación: {c.Name}",
                description: $"Estado: {c.Status}",
                createdUtc: c.CreatedAtUtc,
                modifiedUtc: c.UpdatedAtUtc,
                category: "Evaluaciones");
        }
    }
}

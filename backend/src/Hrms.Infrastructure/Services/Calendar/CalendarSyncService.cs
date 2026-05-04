using System.Text.Json;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services.Calendar;

/// <summary>
/// Subscriber del bus de eventos que empuja vacaciones/permisos aprobados al
/// calendario externo del empleado dueño del evento.
///
/// Se ejecuta best-effort en background (Task.Run con scope propio) para no
/// penalizar la latencia de la request principal.
/// </summary>
public sealed class CalendarSyncService(
    HrmsDbContext db,
    IServiceScopeFactory scopeFactory,
    GoogleCalendarProvider googleProvider,
    MicrosoftCalendarProvider microsoftProvider,
    ILogger<CalendarSyncService> logger) : ICalendarSyncService
{
    // Eventos que sabemos transformar a un evento de calendario.
    private static readonly HashSet<string> _supportedEvents = new(StringComparer.OrdinalIgnoreCase)
    {
        "vacation.approved",
        "leave.approved"
    };

    public Task DispatchAsync(string eventType, object payload, CancellationToken cancellationToken = default)
    {
        if (!_supportedEvents.Contains(eventType)) return Task.CompletedTask;

        // Serializamos el payload a JSON aquí (en el contexto de la request) para no depender
        // del objeto vivo en el background; después lo deserializamos en el scope propio.
        var payloadJson = JsonSerializer.Serialize(payload);

        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
            var scopedGoogle = scope.ServiceProvider.GetRequiredService<GoogleCalendarProvider>();
            var scopedMs = scope.ServiceProvider.GetRequiredService<MicrosoftCalendarProvider>();
            var scopedLogger = scope.ServiceProvider.GetRequiredService<ILogger<CalendarSyncService>>();
            try
            {
                await SyncAsync(eventType, payloadJson, scopedDb, scopedGoogle, scopedMs, scopedLogger, CancellationToken.None);
            }
            catch (Exception ex)
            {
                scopedLogger.LogError(ex, "CalendarSync fallo para evento {EventType}", eventType);
            }
        }, CancellationToken.None);

        return Task.CompletedTask;
    }

    private static async Task SyncAsync(
        string eventType,
        string payloadJson,
        HrmsDbContext scopedDb,
        GoogleCalendarProvider googleProvider,
        MicrosoftCalendarProvider microsoftProvider,
        ILogger logger,
        CancellationToken ct)
    {
        var root = JsonDocument.Parse(payloadJson).RootElement;

        // Los eventos de vacation/leave tienen esta forma:
        // { "employeeId": "...", "employeeName": "...", "startDate": "...", "endDate": "...", ... }
        if (!root.TryGetProperty("employeeId", out var empIdEl)) return;
        var employeeId = empIdEl.GetGuid();

        // Buscamos usuario asociado al empleado.
        var userId = await scopedDb.Users
            .Where(u => u.EmployeeId == employeeId && !u.IsDeleted)
            .Select(u => (Guid?)u.Id)
            .FirstOrDefaultAsync(ct);
        if (userId is null) return;

        // Tomamos TODAS las conexiones del usuario (google + microsoft) — un usuario podría
        // tener ambos proveedores conectados y querer duplicar el evento en ambos calendarios.
        var connections = await scopedDb.Set<CalendarConnection>()
            .Where(c => c.UserId == userId.Value && !c.IsDeleted && c.Status != CalendarConnectionStatuses.Unauthorized)
            .ToListAsync(ct);
        if (connections.Count == 0) return;

        var startDate = DateOnly.Parse(root.GetProperty("startDate").GetString()!);
        var endDate = DateOnly.Parse(root.GetProperty("endDate").GetString()!);
        var (hrmsEntityType, hrmsEntityId, summary, description) = ExtractEventData(eventType, root);

        foreach (var connection in connections)
        {
            var syncEvent = await scopedDb.Set<CalendarSyncEvent>()
                .FirstOrDefaultAsync(s =>
                    s.ConnectionId == connection.Id &&
                    s.HrmsEntityType == hrmsEntityType &&
                    s.HrmsEntityId == hrmsEntityId &&
                    !s.IsDeleted, ct);

            try
            {
                string eventId = connection.Provider switch
                {
                    CalendarProviders.Google => await PushToGoogleAsync(googleProvider, connection, syncEvent?.ProviderEventId, summary, description, startDate, endDate, ct),
                    CalendarProviders.Microsoft => await PushToMicrosoftAsync(microsoftProvider, connection, syncEvent?.ProviderEventId, summary, description, startDate, endDate, ct),
                    _ => throw new NotSupportedException($"Proveedor no soportado: {connection.Provider}")
                };

                var now = DateTime.UtcNow;
                if (syncEvent is null)
                {
                    scopedDb.Set<CalendarSyncEvent>().Add(new CalendarSyncEvent
                    {
                        ConnectionId = connection.Id,
                        HrmsEntityType = hrmsEntityType,
                        HrmsEntityId = hrmsEntityId,
                        ProviderEventId = eventId,
                        SyncedAtUtc = now,
                        CreatedAtUtc = now,
                        UpdatedAtUtc = now,
                        CreatedBy = "system:calendar-sync",
                        UpdatedBy = "system:calendar-sync"
                    });
                }
                else
                {
                    syncEvent.ProviderEventId = eventId;
                    syncEvent.SyncedAtUtc = now;
                    syncEvent.UpdatedAtUtc = now;
                }

                connection.LastSyncAtUtc = now;
                connection.LastSyncError = null;
                connection.Status = CalendarConnectionStatuses.Active;
                await scopedDb.SaveChangesAsync(ct);

                logger.LogInformation(
                    "Calendar sync OK ({Provider}): {EventType} {HrmsId} → eventId={ProviderEventId}",
                    connection.Provider, eventType, hrmsEntityId, eventId);
            }
            catch (Exception ex)
            {
                connection.LastSyncAtUtc = DateTime.UtcNow;
                connection.LastSyncError = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                if (connection.Status != CalendarConnectionStatuses.Unauthorized)
                    connection.Status = CalendarConnectionStatuses.Error;
                await scopedDb.SaveChangesAsync(ct);
                logger.LogError(ex, "Calendar sync fallo ({Provider}) para evento {EventType} entidad {HrmsId}.",
                    connection.Provider, eventType, hrmsEntityId);
                // No rompemos el loop — seguimos con el siguiente proveedor.
            }
        }
    }

    private static async Task<string> PushToGoogleAsync(
        GoogleCalendarProvider provider, CalendarConnection connection, string? existingId,
        string summary, string description, DateOnly startDate, DateOnly endDate, CancellationToken ct)
    {
        var service = await provider.BuildServiceAsync(connection, ct);
        return await provider.UpsertEventAsync(service, connection.CalendarId, existingId, summary, description, startDate, endDate, ct);
    }

    private static async Task<string> PushToMicrosoftAsync(
        MicrosoftCalendarProvider provider, CalendarConnection connection, string? existingId,
        string summary, string description, DateOnly startDate, DateOnly endDate, CancellationToken ct)
    {
        var accessToken = await provider.EnsureAccessTokenAsync(connection, ct);
        return await provider.UpsertEventAsync(accessToken, existingId, summary, description, startDate, endDate, ct);
    }

    private static (string entityType, Guid entityId, string summary, string description) ExtractEventData(
        string eventType, JsonElement payload)
    {
        var empName = payload.TryGetProperty("employeeName", out var nEl) ? nEl.GetString() ?? "Empleado" : "Empleado";
        var start = payload.GetProperty("startDate").GetString();
        var end = payload.GetProperty("endDate").GetString();

        var requestId = payload.TryGetProperty("requestId", out var ridEl) ? ridEl.GetGuid() : Guid.Empty;

        return eventType switch
        {
            "vacation.approved" => (
                "vacation",
                requestId,
                $"Vacaciones — {empName}",
                $"Vacaciones aprobadas en HRMS.\nPeriodo: {start} → {end}"),
            "leave.approved" => (
                "leave",
                requestId,
                $"Permiso — {empName}",
                $"Permiso aprobado en HRMS.\nPeriodo: {start} → {end}"),
            _ => throw new NotSupportedException($"Evento no soportado: {eventType}")
        };
    }
}

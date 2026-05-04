using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Hrms.Application.DTOs.Integrations;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Hrms.Infrastructure.Services.Webhooks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

public sealed class IntegrationService(
    HrmsDbContext db,
    IHttpClientFactory httpClientFactory,
    IServiceScopeFactory scopeFactory,
    ICalendarSyncService calendarSyncService,
    ILogger<IntegrationService> logger) : IIntegrationService
{
    // Política de reintentos para entregas en background (producción).
    // Tests síncronos no reintentan — el usuario ve el resultado inmediato.
    private const int BackgroundMaxAttempts = 3;
    private static readonly TimeSpan[] BackgroundBackoff =
    [
        TimeSpan.FromSeconds(2),
        TimeSpan.FromSeconds(15)
    ];

    // Tras este número de fallos consecutivos del endpoint, se auto-desactiva.
    private const int AutoDisableThreshold = 10;

    private static readonly IReadOnlyList<WebhookEventDto> _events =
    [
        new("employee.created",    "Empleado creado",                         """{"event":"employee.created","data":{"id":"...","employeeCode":"EMP-0001","fullName":"Ana Garcia","hireDate":"2026-01-15"}}"""),
        new("employee.updated",    "Empleado actualizado",                     """{"event":"employee.updated","data":{"id":"...","employeeCode":"EMP-0001","fullName":"Ana Garcia"}}"""),
        new("employee.terminated", "Empleado dado de baja",                    """{"event":"employee.terminated","data":{"id":"...","employeeCode":"EMP-0001","fullName":"Ana Garcia"}}"""),
        new("payroll.approved",    "Planilla aprobada",                        """{"event":"payroll.approved","data":{"year":2026,"month":1,"totalEmployees":45,"totalNetPay":180500.00}}"""),
        new("vacation.approved",   "Vacacion aprobada",                        """{"event":"vacation.approved","data":{"employeeId":"...","employeeName":"Ana Garcia","startDate":"2026-02-01","endDate":"2026-02-14"}}"""),
        new("leave.approved",      "Permiso/licencia aprobado",                """{"event":"leave.approved","data":{"employeeId":"...","employeeName":"Ana Garcia","type":"medical","days":3}}"""),
        new("document.signed",     "Documento firmado electronicamente",       """{"event":"document.signed","data":{"documentId":"...","title":"Contrato Indefinido","signedBy":"ana.garcia","signatureHash":"abc123..."}}"""),
        new("onboarding.completed","Proceso de onboarding completado",         """{"event":"onboarding.completed","data":{"processId":"...","employeeName":"Ana Garcia","templateName":"Onboarding General"}}"""),
        new("evaluation.finalized","Evaluacion de desempeno finalizada",       """{"event":"evaluation.finalized","data":{"assignmentId":"...","employeeName":"Ana Garcia","finalScore":4.2}}"""),
    ];

    // ── API Tokens ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ApiTokenDto>> GetTokensAsync(CancellationToken cancellationToken = default)
    {
        return await db.ApiTokens
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new ApiTokenDto(x.Id, x.Name, x.TokenPrefix, x.Scopes, x.ExpiresAtUtc, x.LastUsedAtUtc, x.Description, x.IsActive, x.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<ApiTokenCreatedDto> CreateTokenAsync(CreateApiTokenRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        // Generate cryptographically secure token
        var rawToken = $"hrms_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace("+", "-").Replace("/", "_").Replace("=", "")}";
        var tokenHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        var prefix = rawToken[..12];

        var now = DateTime.UtcNow;
        var entity = new ApiToken
        {
            Name = request.Name,
            TokenHash = tokenHash,
            TokenPrefix = prefix,
            Scopes = request.Scopes,
            ExpiresAtUtc = request.ExpirationDays.HasValue ? now.AddDays(request.ExpirationDays.Value) : null,
            Description = request.Description,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.ApiTokens.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("API token {TokenId} created by {User}", entity.Id, userName);
        return new ApiTokenCreatedDto(entity.Id, entity.Name, rawToken, prefix, entity.Scopes, entity.ExpiresAtUtc, entity.Description);
    }

    public async Task<bool> RevokeTokenAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await db.ApiTokens.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsActive = false;
        entity.IsDeleted = true;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("API token {TokenId} revoked", id);
        return true;
    }

    public async Task<ApiTokenCreatedDto?> RotateTokenAsync(Guid id, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.ApiTokens.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted && x.IsActive, cancellationToken);
        if (entity is null) return null;

        // Generar un nuevo token manteniendo el mismo Id, scopes, expiración y descripción.
        // Esto permite al cliente rotar credenciales sin coordinar el cambio de ID.
        var rawToken = $"hrms_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace("+", "-").Replace("/", "_").Replace("=", "")}";
        var tokenHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
        var prefix = rawToken[..12];

        entity.TokenHash = tokenHash;
        entity.TokenPrefix = prefix;
        entity.LastUsedAtUtc = null;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("API token {TokenId} rotado por {User}", id, userName);
        return new ApiTokenCreatedDto(entity.Id, entity.Name, rawToken, prefix, entity.Scopes, entity.ExpiresAtUtc, entity.Description);
    }

    // ── Webhooks ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<WebhookEndpointDto>> GetEndpointsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await db.WebhookEndpoints
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return rows.Select(x => new WebhookEndpointDto(
            x.Id, x.Name, x.Url, x.Events,
            x.Secret.Length >= 4 ? x.Secret[..4] + "****" : "****",
            x.IsActive, x.FailureCount,
            x.LastDeliveryAtUtc,
            // null cuando nunca se entregó nada → la UI muestra "sin entregas" en vez de un ❌
            x.LastDeliveryAtUtc.HasValue ? x.LastDeliverySuccess : null,
            x.Description, x.CreatedAtUtc, x.Format)).ToList();
    }

    public async Task<WebhookEndpointDto> CreateEndpointAsync(CreateWebhookRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        // SSRF: bloquear URLs internas, loopback, metadata endpoints, esquemas no-HTTP.
        WebhookUrlValidator.Validate(request.Url);

        // Normalizar y validar formato del payload (raw/slack/teams).
        var format = (request.Format ?? WebhookPayloadFormats.Raw).Trim().ToLowerInvariant();
        if (!WebhookPayloadFormats.All.Contains(format))
        {
            throw new ArgumentException(
                $"Formato '{format}' no es válido. Formatos permitidos: {string.Join(", ", WebhookPayloadFormats.All)}.",
                nameof(request));
        }

        // Generate signing secret
        var secret = $"whsec_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(24)).Replace("+", "-").Replace("/", "_").Replace("=", "")}";

        var now = DateTime.UtcNow;
        var entity = new WebhookEndpoint
        {
            Name = request.Name,
            Url = request.Url,
            Events = request.Events,
            Secret = secret,
            Format = format,
            Description = request.Description,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.WebhookEndpoints.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Webhook endpoint {EndpointId} created by {User} (format={Format})", entity.Id, userName, format);
        // null en LastDeliverySuccess indica "sin entregas aún" (no es un fallo).
        return new WebhookEndpointDto(entity.Id, entity.Name, entity.Url, entity.Events, secret, entity.IsActive, 0, null, null, entity.Description, entity.CreatedAtUtc, entity.Format);
    }

    public async Task<bool> DeleteEndpointAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await db.WebhookEndpoints.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ToggleEndpointAsync(Guid id, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.WebhookEndpoints.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsActive = !entity.IsActive;
        entity.UpdatedBy = userName;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<WebhookDeliveryDto>> GetDeliveriesAsync(Guid endpointId, DeliveryQueryDto query, CancellationToken cancellationToken = default)
    {
        var limit = Math.Clamp(query.Limit, 5, 200);

        var q = db.WebhookDeliveries
            .AsNoTracking()
            .Where(x => x.EndpointId == endpointId);

        if (query.Success.HasValue)
            q = q.Where(x => x.Success == query.Success.Value);

        if (query.FromDate.HasValue)
            q = q.Where(x => x.DeliveredAtUtc >= query.FromDate.Value);

        if (query.ToDate.HasValue)
            q = q.Where(x => x.DeliveredAtUtc <= query.ToDate.Value);

        if (!string.IsNullOrWhiteSpace(query.EventType))
            q = q.Where(x => x.EventType == query.EventType);

        return await q
            .OrderByDescending(x => x.DeliveredAtUtc)
            .Take(limit)
            .Select(x => new WebhookDeliveryDto(x.Id, x.EndpointId, x.EventType, x.Payload, x.ResponseStatusCode, x.ResponseBody, x.Success, x.AttemptNumber, x.DeliveredAtUtc, x.ErrorMessage))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> TestEndpointAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var endpoint = await db.WebhookEndpoints.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (endpoint is null) return false;

        var testPayload = new
        {
            @event = "webhook.test",
            timestamp = DateTime.UtcNow,
            data = new { message = "Este es un evento de prueba del sistema HRMS." }
        };

        await DeliverInternalAsync(endpoint, "webhook.test", testPayload, attemptNumber: 1, db, logger, cancellationToken);
        return true;
    }

    public IReadOnlyList<WebhookEventDto> GetAvailableEvents() => _events;

    public async Task DispatchEventAsync(string eventType, object payload, CancellationToken cancellationToken = default)
    {
        // Push paralelo al sync de calendario externo (Google) — corre en background,
        // no bloquea la request principal y no falla el webhook dispatch si falla.
        try
        {
            await calendarSyncService.DispatchAsync(eventType, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CalendarSyncService falló al disparar evento {EventType}.", eventType);
        }

        // EF Core no traduce bien Contains sobre colecciones serializadas (Events),
        // por eso se filtra en memoria tras traer únicamente endpoints activos.
        var activeEndpoints = await db.WebhookEndpoints
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .Select(x => new { x.Id, x.Events })
            .ToListAsync(cancellationToken);

        var endpointIds = activeEndpoints
            .Where(x => x.Events.Contains(eventType, StringComparer.OrdinalIgnoreCase))
            .Select(x => x.Id)
            .ToList();

        if (endpointIds.Count == 0) return;

        foreach (var id in endpointIds)
        {
            // Cada entrega corre en su propio scope: el DbContext original será dispuesto
            // cuando la request termine; aquí creamos uno nuevo para evitar ObjectDisposedException.
            _ = Task.Run(async () =>
            {
                using var scope = scopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
                var scopedLogger = scope.ServiceProvider.GetRequiredService<ILogger<IntegrationService>>();

                try
                {
                    await DeliverWithRetriesAsync(id, eventType, payload, scopedDb, scopedLogger);
                }
                catch (Exception ex)
                {
                    scopedLogger.LogError(ex, "Entrega de webhook en background falló para endpoint {EndpointId}.", id);
                }
            }, CancellationToken.None);
        }
    }

    /// <summary>
    /// Reintentos con backoff exponencial. Tras <see cref="BackgroundMaxAttempts"/> intentos
    /// fallidos consecutivos, cada intento se persiste como un registro independiente en
    /// <c>WebhookDeliveries</c> para trazabilidad. Si el endpoint acumula más de
    /// <see cref="AutoDisableThreshold"/> fallos totales, se auto-desactiva.
    /// </summary>
    private async Task DeliverWithRetriesAsync(
        Guid endpointId,
        string eventType,
        object payload,
        HrmsDbContext scopedDb,
        ILogger scopedLogger)
    {
        for (var attempt = 1; attempt <= BackgroundMaxAttempts; attempt++)
        {
            // Releer el endpoint en cada intento: puede haber sido desactivado o eliminado.
            var endpoint = await scopedDb.WebhookEndpoints
                .FirstOrDefaultAsync(x => x.Id == endpointId && !x.IsDeleted && x.IsActive);
            if (endpoint is null)
            {
                scopedLogger.LogInformation(
                    "Endpoint {EndpointId} ya no está activo. Se cancela el reintento.", endpointId);
                return;
            }

            var success = await DeliverInternalAsync(endpoint, eventType, payload, attempt, scopedDb, scopedLogger, CancellationToken.None);

            // Auto-disable si supera el umbral de fallos consecutivos.
            if (!success && endpoint.FailureCount >= AutoDisableThreshold)
            {
                endpoint.IsActive = false;
                endpoint.UpdatedAtUtc = DateTime.UtcNow;
                endpoint.UpdatedBy = "system:auto-disable";
                await scopedDb.SaveChangesAsync();
                scopedLogger.LogWarning(
                    "Endpoint {EndpointId} auto-desactivado tras {FailureCount} fallos consecutivos.",
                    endpoint.Id, endpoint.FailureCount);
                return;
            }

            if (success) return;

            if (attempt < BackgroundMaxAttempts)
            {
                var delay = BackgroundBackoff[attempt - 1];
                scopedLogger.LogInformation(
                    "Reintento {Next}/{Max} para endpoint {EndpointId} en {Delay}.",
                    attempt + 1, BackgroundMaxAttempts, endpoint.Id, delay);
                await Task.Delay(delay);
            }
        }
    }

    // ── Internal delivery ────────────────────────────────────────────────

    /// <summary>
    /// Entrega interna parametrizada: recibe el DbContext y logger desde fuera para soportar
    /// tanto llamadas síncronas (test) como background (scope propio). Retorna true si la
    /// entrega fue exitosa (2xx), false en otro caso. Cada intento se persiste como un
    /// registro independiente en <c>WebhookDeliveries</c>.
    /// </summary>
    private async Task<bool> DeliverInternalAsync(
        WebhookEndpoint endpoint,
        string eventType,
        object payloadObj,
        int attemptNumber,
        HrmsDbContext scopedDb,
        ILogger scopedLogger,
        CancellationToken cancellationToken)
    {
        var rawJson = JsonSerializer.Serialize(new { @event = eventType, timestamp = DateTime.UtcNow, data = payloadObj });

        // Transformar al formato destino (Slack Block Kit / Teams MessageCard / raw).
        var payloadJson = WebhookPayloadFormatter.Format(rawJson, eventType, endpoint.Format);

        // HMAC-SHA256 signature del body tal cual se envía.
        var hmac = HMACSHA256.HashData(Encoding.UTF8.GetBytes(endpoint.Secret), Encoding.UTF8.GetBytes(payloadJson));
        var signature = $"sha256={Convert.ToHexString(hmac).ToLowerInvariant()}";

        var delivery = new WebhookDelivery
        {
            EndpointId = endpoint.Id,
            EventType = eventType,
            Payload = payloadJson,
            AttemptNumber = attemptNumber,
            DeliveredAtUtc = DateTime.UtcNow
        };

        try
        {
            var client = httpClientFactory.CreateClient("webhooks");
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint.Url);
            request.Content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
            request.Headers.Add("X-HRMS-Signature", signature);
            request.Headers.Add("X-HRMS-Event", eventType);
            request.Headers.Add("X-HRMS-Attempt", attemptNumber.ToString());

            using var response = await client.SendAsync(request, cancellationToken);
            delivery.ResponseStatusCode = (int)response.StatusCode;

            // Leer el body una sola vez y truncar para no inflar la tabla.
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            delivery.ResponseBody = responseBody.Length > 2000 ? responseBody[..2000] : responseBody;
            delivery.Success = response.IsSuccessStatusCode;

            endpoint.LastDeliveryAtUtc = DateTime.UtcNow;
            endpoint.LastDeliverySuccess = delivery.Success;
            if (delivery.Success) endpoint.FailureCount = 0;
            else endpoint.FailureCount++;

            scopedLogger.LogInformation(
                "Webhook {EndpointId} evento {EventType} intento {Attempt}: HTTP {StatusCode}",
                endpoint.Id, eventType, attemptNumber, delivery.ResponseStatusCode);
        }
        catch (Exception ex)
        {
            delivery.Success = false;
            delivery.ErrorMessage = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
            endpoint.FailureCount++;
            endpoint.LastDeliveryAtUtc = DateTime.UtcNow;
            endpoint.LastDeliverySuccess = false;

            scopedLogger.LogWarning(ex,
                "Entrega de webhook falló para {EndpointId} intento {Attempt}.",
                endpoint.Id, attemptNumber);
        }

        scopedDb.WebhookDeliveries.Add(delivery);
        await scopedDb.SaveChangesAsync(cancellationToken);
        return delivery.Success;
    }
}

using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Options;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services.Calendar;

/// <summary>
/// Wrapper alrededor del SDK <c>Google.Apis.Calendar.v3</c> que:
/// - Descifra los tokens al vuelo.
/// - Refresca el access token cuando está vencido (usando el refresh token).
/// - Convierte las fechas del HRMS (DateOnly rangos inclusivos) al formato Google (fechas exclusivas).
///
/// El caller (CalendarSyncService) es responsable de persistir los tokens refrescados
/// actualizando la entidad CalendarConnection.
/// </summary>
public sealed class GoogleCalendarProvider(
    IOptions<GoogleCalendarOptions> options,
    IDataProtectionProvider dataProtection,
    ILogger<GoogleCalendarProvider> logger)
{
    private readonly GoogleCalendarOptions _opts = options.Value;
    private readonly IDataProtector _protector = dataProtection.CreateProtector("Hrms.CalendarConnection.v1");

    /// <summary>
    /// Construye un <see cref="CalendarService"/> listo para usar. Si el access token está
    /// vencido, lo refresca y actualiza los campos cifrados de la conexión (mutación in-place).
    /// </summary>
    public async Task<CalendarService> BuildServiceAsync(CalendarConnection connection, CancellationToken ct)
    {
        var accessToken = _protector.Unprotect(connection.AccessTokenCipher);
        var refreshToken = connection.RefreshTokenCipher is null ? null : _protector.Unprotect(connection.RefreshTokenCipher);

        // Refresh si está vencido (o a < 60s de vencer).
        if (DateTime.UtcNow >= connection.AccessTokenExpiresAtUtc && refreshToken is not null)
        {
            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets { ClientId = _opts.ClientId, ClientSecret = _opts.ClientSecret }
            });
            try
            {
                var refreshed = await flow.RefreshTokenAsync(connection.UserId.ToString(), refreshToken, ct);
                accessToken = refreshed.AccessToken;
                connection.AccessTokenCipher = _protector.Protect(accessToken);
                connection.AccessTokenExpiresAtUtc = DateTime.UtcNow.AddSeconds((refreshed.ExpiresInSeconds ?? 3600) - 60);
                logger.LogInformation("Access token de Google refrescado para usuario {UserId}.", connection.UserId);
            }
            catch (TokenResponseException ex)
            {
                // Si el refresh token fue revocado, marcamos unauthorized y relanzamos.
                connection.Status = CalendarConnectionStatuses.Unauthorized;
                connection.LastSyncError = "Refresh token inválido — reconectar con Google.";
                logger.LogWarning(ex, "Refresh token inválido para usuario {UserId}.", connection.UserId);
                throw;
            }
        }

        var credential = GoogleCredential.FromAccessToken(accessToken);
        return new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "HRMS"
        });
    }

    public async Task<string> UpsertEventAsync(
        CalendarService service,
        string calendarId,
        string? existingEventId,
        string summary,
        string description,
        DateOnly startDate,
        DateOnly endDateInclusive,
        CancellationToken ct)
    {
        var gEvent = new Event
        {
            Summary = summary,
            Description = description,
            // Google usa fechas exclusivas en el EndDate para eventos all-day (igual que ICS).
            Start = new EventDateTime { Date = startDate.ToString("yyyy-MM-dd") },
            End = new EventDateTime { Date = endDateInclusive.AddDays(1).ToString("yyyy-MM-dd") },
            Source = new Event.SourceData { Title = "HRMS", Url = "about:hrms" }
        };

        if (string.IsNullOrEmpty(existingEventId))
        {
            var created = await service.Events.Insert(gEvent, calendarId).ExecuteAsync(ct);
            return created.Id;
        }

        // Idempotente: si ya existe, lo actualizamos en su sitio — no se crean duplicados.
        try
        {
            var updated = await service.Events.Update(gEvent, calendarId, existingEventId).ExecuteAsync(ct);
            return updated.Id;
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Si el usuario borró el evento manualmente en Google, lo recreamos.
            logger.LogInformation("Evento {EventId} no existe en Google — se recrea.", existingEventId);
            var created = await service.Events.Insert(gEvent, calendarId).ExecuteAsync(ct);
            return created.Id;
        }
    }
}

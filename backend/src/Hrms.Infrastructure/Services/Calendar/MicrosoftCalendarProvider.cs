using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Options;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services.Calendar;

/// <summary>
/// Wrapper REST para Microsoft Graph Calendar. No usa el SDK de Graph (<c>Microsoft.Graph</c>)
/// a propósito — el SDK arrastra muchas dependencias y para el pequeño set de operaciones
/// que necesitamos (insert/update all-day event) HttpClient directo es más liviano.
///
/// Endpoints usados:
/// - POST   /me/events                       → crear evento
/// - PATCH  /me/events/{id}                  → actualizar evento
/// - GET    /me/events/{id}                  → verificar existencia
/// </summary>
public sealed class MicrosoftCalendarProvider(
    IOptions<MicrosoftCalendarOptions> options,
    IHttpClientFactory httpClientFactory,
    IDataProtectionProvider dataProtection,
    ILogger<MicrosoftCalendarProvider> logger)
{
    private readonly MicrosoftCalendarOptions _opts = options.Value;
    private readonly IDataProtector _protector = dataProtection.CreateProtector("Hrms.CalendarConnection.v1");

    private string Tenant => string.IsNullOrWhiteSpace(_opts.TenantId) ? "common" : _opts.TenantId;
    private string TokenUrl => $"https://login.microsoftonline.com/{Tenant}/oauth2/v2.0/token";
    private const string GraphBase = "https://graph.microsoft.com/v1.0";
    private const string Scopes = "offline_access User.Read Calendars.ReadWrite";

    /// <summary>
    /// Devuelve un access token válido para la conexión. Si el actual expiró, lo refresca
    /// usando el refresh token y actualiza la entidad (mutación in-place; caller persiste).
    /// </summary>
    public async Task<string> EnsureAccessTokenAsync(CalendarConnection connection, CancellationToken ct)
    {
        var accessToken = _protector.Unprotect(connection.AccessTokenCipher);
        var refreshToken = connection.RefreshTokenCipher is null ? null : _protector.Unprotect(connection.RefreshTokenCipher);

        if (DateTime.UtcNow < connection.AccessTokenExpiresAtUtc) return accessToken;
        if (refreshToken is null) return accessToken; // No hay forma de refrescar; devolvemos el viejo y dejamos que el caller falle.

        var client = httpClientFactory.CreateClient("microsoft-oauth");
        using var req = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = _opts.ClientId,
                ["client_secret"] = _opts.ClientSecret,
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken,
                ["scope"] = Scopes
            })
        };
        using var res = await client.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            connection.Status = CalendarConnectionStatuses.Unauthorized;
            connection.LastSyncError = "Refresh token inválido — reconectar con Microsoft.";
            logger.LogWarning("Refresh token Microsoft inválido para usuario {UserId}: {Body}", connection.UserId, body);
            throw new InvalidOperationException("Refresh token de Microsoft inválido.");
        }

        var json = JsonDocument.Parse(body).RootElement;
        var newAccess = json.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("Microsoft no devolvió access_token en refresh.");
        var expiresIn = json.TryGetProperty("expires_in", out var ei) ? ei.GetInt32() : 3600;

        // Microsoft a veces rota el refresh token en cada refresh — si viene, lo guardamos.
        if (json.TryGetProperty("refresh_token", out var newRt) && !string.IsNullOrEmpty(newRt.GetString()))
            connection.RefreshTokenCipher = _protector.Protect(newRt.GetString()!);

        connection.AccessTokenCipher = _protector.Protect(newAccess);
        connection.AccessTokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(expiresIn - 60);
        logger.LogInformation("Access token Microsoft refrescado para usuario {UserId}.", connection.UserId);
        return newAccess;
    }

    public async Task<string> UpsertEventAsync(
        string accessToken,
        string? existingEventId,
        string summary,
        string description,
        DateOnly startDate,
        DateOnly endDateInclusive,
        CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("microsoft-graph");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        // Graph usa EndDate exclusivo para eventos all-day (igual que ICS y Google).
        var body = new
        {
            subject = summary,
            body = new { contentType = "text", content = description },
            start = new { dateTime = startDate.ToString("yyyy-MM-dd") + "T00:00:00", timeZone = "UTC" },
            end = new { dateTime = endDateInclusive.AddDays(1).ToString("yyyy-MM-dd") + "T00:00:00", timeZone = "UTC" },
            isAllDay = true,
            showAs = "oof"
        };

        if (string.IsNullOrEmpty(existingEventId))
        {
            using var res = await client.PostAsJsonAsync($"{GraphBase}/me/events", body, ct);
            return await ExtractIdAsync(res, ct);
        }

        // Update existente. Si 404, recreamos.
        using var patchReq = new HttpRequestMessage(new HttpMethod("PATCH"), $"{GraphBase}/me/events/{existingEventId}")
        {
            Content = JsonContent.Create(body)
        };
        using var patchRes = await client.SendAsync(patchReq, ct);
        if (patchRes.StatusCode == HttpStatusCode.NotFound)
        {
            logger.LogInformation("Evento Microsoft {EventId} no existe — se recrea.", existingEventId);
            using var insertRes = await client.PostAsJsonAsync($"{GraphBase}/me/events", body, ct);
            return await ExtractIdAsync(insertRes, ct);
        }
        return await ExtractIdAsync(patchRes, ct);
    }

    private static async Task<string> ExtractIdAsync(HttpResponseMessage res, CancellationToken ct)
    {
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Graph respondió {(int)res.StatusCode}: {body}");
        var json = JsonDocument.Parse(body).RootElement;
        return json.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Graph no devolvió id del evento.");
    }
}

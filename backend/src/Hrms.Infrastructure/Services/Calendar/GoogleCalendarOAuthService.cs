using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;
using Hrms.Application.DTOs.Integrations;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Options;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Infrastructure.Services.Calendar;

public sealed class GoogleCalendarOAuthService(
    HrmsDbContext db,
    IOptions<GoogleCalendarOptions> options,
    IHttpClientFactory httpClientFactory,
    IDataProtectionProvider dataProtection,
    ILogger<GoogleCalendarOAuthService> logger) : IGoogleCalendarOAuthService
{
    private const string AuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenUrl = "https://oauth2.googleapis.com/token";
    private const string RevokeUrl = "https://oauth2.googleapis.com/revoke";
    private const string UserInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";

    // Scope mínimo — acceso de lectura/escritura al calendario del usuario.
    private const string CalendarScope = "https://www.googleapis.com/auth/calendar.events";
    private const string EmailScope = "https://www.googleapis.com/auth/userinfo.email";

    private readonly GoogleCalendarOptions _opts = options.Value;
    private readonly IDataProtector _protector = dataProtection.CreateProtector("Hrms.CalendarConnection.v1");

    public string PostCallbackRedirectUrl => _opts.PostCallbackRedirectUrl;

    public bool IsConfigured =>
        _opts.Enabled &&
        !string.IsNullOrWhiteSpace(_opts.ClientId) &&
        !string.IsNullOrWhiteSpace(_opts.ClientSecret) &&
        !string.IsNullOrWhiteSpace(_opts.RedirectUri);

    // ── Authorize URL ─────────────────────────────────────────────────────

    public (string AuthorizationUrl, string State) BuildAuthorizationUrl(Guid userId)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Google Calendar no está configurado en el servidor.");

        // State = nonce aleatorio. El caller debe meterlo en una cookie HttpOnly
        // junto con el userId para validar en el callback (anti-CSRF).
        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var query = new Dictionary<string, string>
        {
            ["client_id"] = _opts.ClientId,
            ["redirect_uri"] = _opts.RedirectUri,
            ["response_type"] = "code",
            ["scope"] = $"{CalendarScope} {EmailScope}",
            // offline + consent → Google emite refresh token incluso si el usuario ya había autorizado antes.
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["state"] = state
        };

        var url = $"{AuthUrl}?{string.Join("&", query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"))}";
        logger.LogInformation("Authorize URL construida para usuario {UserId}.", userId);
        return (url, state);
    }

    // ── Code exchange ─────────────────────────────────────────────────────

    public async Task<CalendarConnectionDto> ExchangeCodeAsync(Guid userId, string userName, string code, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Google Calendar no está configurado en el servidor.");

        var client = httpClientFactory.CreateClient("google-oauth");

        // Intercambio code → tokens.
        using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = _opts.ClientId,
                ["client_secret"] = _opts.ClientSecret,
                ["redirect_uri"] = _opts.RedirectUri,
                ["grant_type"] = "authorization_code"
            })
        };

        using var tokenResponse = await client.SendAsync(tokenRequest, cancellationToken);
        var tokenBody = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            logger.LogError("Falla al intercambiar code con Google: {Status} {Body}", tokenResponse.StatusCode, tokenBody);
            throw new InvalidOperationException("Google rechazó el código de autorización. Reintenta el flujo.");
        }

        var tokenJson = JsonDocument.Parse(tokenBody).RootElement;
        var accessToken = tokenJson.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("Google no devolvió access_token.");
        var refreshToken = tokenJson.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
        var expiresIn = tokenJson.TryGetProperty("expires_in", out var ei) ? ei.GetInt32() : 3600;

        // Userinfo — para mostrar "conectado como X" en la UI.
        using var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, UserInfoUrl);
        userInfoRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var userInfoResponse = await client.SendAsync(userInfoRequest, cancellationToken);
        var userInfoBody = await userInfoResponse.Content.ReadAsStringAsync(cancellationToken);
        var accountEmail = "unknown@google";
        if (userInfoResponse.IsSuccessStatusCode)
        {
            var userInfoJson = JsonDocument.Parse(userInfoBody).RootElement;
            if (userInfoJson.TryGetProperty("email", out var em)) accountEmail = em.GetString() ?? accountEmail;
        }

        // Si ya había conexión previa, la reemplazamos (soft-delete anterior + insert nueva).
        var now = DateTime.UtcNow;
        var existing = await db.Set<CalendarConnection>()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == CalendarProviders.Google && !x.IsDeleted, cancellationToken);
        if (existing is not null)
        {
            existing.IsDeleted = true;
            existing.UpdatedAtUtc = now;
            existing.UpdatedBy = userName;
        }

        var entity = new CalendarConnection
        {
            UserId = userId,
            Provider = CalendarProviders.Google,
            AccessTokenCipher = _protector.Protect(accessToken),
            RefreshTokenCipher = refreshToken is null ? null : _protector.Protect(refreshToken),
            AccessTokenExpiresAtUtc = now.AddSeconds(expiresIn - 60), // margen de 60s
            CalendarId = "primary",
            ProviderAccountEmail = accountEmail,
            Status = CalendarConnectionStatuses.Active,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };
        db.Set<CalendarConnection>().Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Conexión Google creada para usuario {UserId} ({Email}).", userId, accountEmail);
        return ToDto(entity);
    }

    // ── Read ──────────────────────────────────────────────────────────────

    public async Task<CalendarConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var conn = await db.Set<CalendarConnection>()
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.Provider == CalendarProviders.Google && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        return conn is null ? null : ToDto(conn);
    }

    // ── Disconnect ────────────────────────────────────────────────────────

    public async Task<bool> DisconnectAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var conn = await db.Set<CalendarConnection>()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == CalendarProviders.Google && !x.IsDeleted, cancellationToken);
        if (conn is null) return false;

        // Best-effort revoke en Google — no falla la desconexión local si esto falla.
        try
        {
            var refreshToken = conn.RefreshTokenCipher is null ? null : _protector.Unprotect(conn.RefreshTokenCipher);
            if (!string.IsNullOrEmpty(refreshToken))
            {
                var client = httpClientFactory.CreateClient("google-oauth");
                using var revokeReq = new HttpRequestMessage(HttpMethod.Post, $"{RevokeUrl}?token={HttpUtility.UrlEncode(refreshToken)}");
                await client.SendAsync(revokeReq, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo revocar token de Google para usuario {UserId}. Se elimina localmente igual.", userId);
        }

        conn.IsDeleted = true;
        conn.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Conexión Google eliminada para usuario {UserId}.", userId);
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static CalendarConnectionDto ToDto(CalendarConnection c) => new(
        c.Id, c.Provider, c.ProviderAccountEmail, c.CalendarId, c.Status,
        c.LastSyncAtUtc, c.LastSyncError, c.CreatedAtUtc);
}

using System.Security.Cryptography;
using System.Text.Json;
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

public sealed class MicrosoftCalendarOAuthService(
    HrmsDbContext db,
    IOptions<MicrosoftCalendarOptions> options,
    IHttpClientFactory httpClientFactory,
    IDataProtectionProvider dataProtection,
    ILogger<MicrosoftCalendarOAuthService> logger) : IMicrosoftCalendarOAuthService
{
    // Scopes delegados — el usuario debe consentir explícitamente cada uno.
    // offline_access → refresh token; User.Read → email; Calendars.ReadWrite → crear/editar eventos.
    private const string Scopes = "offline_access User.Read Calendars.ReadWrite";
    private const string UserInfoUrl = "https://graph.microsoft.com/v1.0/me";

    private readonly MicrosoftCalendarOptions _opts = options.Value;
    // Mismo propósito de cifrado que Google — los tokens no se pueden descifrar entre providers,
    // pero ambas entidades CalendarConnection comparten el mismo protector (no es un problema de seguridad).
    private readonly IDataProtector _protector = dataProtection.CreateProtector("Hrms.CalendarConnection.v1");

    public bool IsConfigured =>
        _opts.Enabled &&
        !string.IsNullOrWhiteSpace(_opts.ClientId) &&
        !string.IsNullOrWhiteSpace(_opts.ClientSecret) &&
        !string.IsNullOrWhiteSpace(_opts.RedirectUri);

    public string PostCallbackRedirectUrl => _opts.PostCallbackRedirectUrl;

    private string Tenant => string.IsNullOrWhiteSpace(_opts.TenantId) ? "common" : _opts.TenantId;
    private string AuthUrl => $"https://login.microsoftonline.com/{Tenant}/oauth2/v2.0/authorize";
    private string TokenUrl => $"https://login.microsoftonline.com/{Tenant}/oauth2/v2.0/token";

    public (string AuthorizationUrl, string State) BuildAuthorizationUrl(Guid userId)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Microsoft Calendar no está configurado en el servidor.");

        var state = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var query = new Dictionary<string, string>
        {
            ["client_id"] = _opts.ClientId,
            ["response_type"] = "code",
            ["redirect_uri"] = _opts.RedirectUri,
            ["response_mode"] = "query",
            ["scope"] = Scopes,
            // prompt=consent fuerza que Microsoft reemita el refresh token aun si ya consintió.
            ["prompt"] = "consent",
            ["state"] = state
        };

        var url = $"{AuthUrl}?{string.Join("&", query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"))}";
        logger.LogInformation("Authorize URL Microsoft construida para usuario {UserId}.", userId);
        return (url, state);
    }

    public async Task<CalendarConnectionDto> ExchangeCodeAsync(Guid userId, string userName, string code, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Microsoft Calendar no está configurado en el servidor.");

        var client = httpClientFactory.CreateClient("microsoft-oauth");

        using var tokenRequest = new HttpRequestMessage(HttpMethod.Post, TokenUrl)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = _opts.ClientId,
                ["client_secret"] = _opts.ClientSecret,
                ["code"] = code,
                ["redirect_uri"] = _opts.RedirectUri,
                ["grant_type"] = "authorization_code",
                ["scope"] = Scopes
            })
        };

        using var tokenResponse = await client.SendAsync(tokenRequest, cancellationToken);
        var tokenBody = await tokenResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            logger.LogError("Falla al intercambiar code con Microsoft: {Status} {Body}", tokenResponse.StatusCode, tokenBody);
            throw new InvalidOperationException("Microsoft rechazó el código de autorización. Reintenta el flujo.");
        }

        var tokenJson = JsonDocument.Parse(tokenBody).RootElement;
        var accessToken = tokenJson.GetProperty("access_token").GetString()
            ?? throw new InvalidOperationException("Microsoft no devolvió access_token.");
        var refreshToken = tokenJson.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
        var expiresIn = tokenJson.TryGetProperty("expires_in", out var ei) ? ei.GetInt32() : 3600;

        // /me → email del usuario.
        using var meReq = new HttpRequestMessage(HttpMethod.Get, UserInfoUrl);
        meReq.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var meRes = await client.SendAsync(meReq, cancellationToken);
        var meBody = await meRes.Content.ReadAsStringAsync(cancellationToken);
        var accountEmail = "unknown@microsoft";
        if (meRes.IsSuccessStatusCode)
        {
            var meJson = JsonDocument.Parse(meBody).RootElement;
            // Prefer mail; cuentas personales usan userPrincipalName.
            if (meJson.TryGetProperty("mail", out var m) && !string.IsNullOrWhiteSpace(m.GetString()))
                accountEmail = m.GetString()!;
            else if (meJson.TryGetProperty("userPrincipalName", out var upn))
                accountEmail = upn.GetString() ?? accountEmail;
        }

        var now = DateTime.UtcNow;
        var existing = await db.Set<CalendarConnection>()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == CalendarProviders.Microsoft && !x.IsDeleted, cancellationToken);
        if (existing is not null)
        {
            existing.IsDeleted = true;
            existing.UpdatedAtUtc = now;
            existing.UpdatedBy = userName;
        }

        var entity = new CalendarConnection
        {
            UserId = userId,
            Provider = CalendarProviders.Microsoft,
            AccessTokenCipher = _protector.Protect(accessToken),
            RefreshTokenCipher = refreshToken is null ? null : _protector.Protect(refreshToken),
            AccessTokenExpiresAtUtc = now.AddSeconds(expiresIn - 60),
            // Microsoft Graph acepta "calendar" como alias del default — más portable que un GUID.
            CalendarId = "calendar",
            ProviderAccountEmail = accountEmail,
            Status = CalendarConnectionStatuses.Active,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };
        db.Set<CalendarConnection>().Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Conexión Microsoft creada para usuario {UserId} ({Email}).", userId, accountEmail);
        return ToDto(entity);
    }

    public async Task<CalendarConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var conn = await db.Set<CalendarConnection>()
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.Provider == CalendarProviders.Microsoft && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        return conn is null ? null : ToDto(conn);
    }

    public async Task<bool> DisconnectAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var conn = await db.Set<CalendarConnection>()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Provider == CalendarProviders.Microsoft && !x.IsDeleted, cancellationToken);
        if (conn is null) return false;

        // Microsoft no expone un endpoint público de revoke del refresh token per-app
        // (revokeSignInSessions revocaría TODAS las sesiones del usuario). Eliminamos
        // solo localmente; el usuario puede revocar manualmente desde https://myapps.microsoft.com.
        conn.IsDeleted = true;
        conn.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Conexión Microsoft eliminada para usuario {UserId}.", userId);
        return true;
    }

    private static CalendarConnectionDto ToDto(CalendarConnection c) => new(
        c.Id, c.Provider, c.ProviderAccountEmail, c.CalendarId, c.Status,
        c.LastSyncAtUtc, c.LastSyncError, c.CreatedAtUtc);
}

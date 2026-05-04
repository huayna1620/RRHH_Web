using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Hrms.Application.Common.Authorization;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Hrms.Api.Authentication;

/// <summary>
/// Autenticación basada en API tokens con prefijo <c>hrms_</c>.
/// Se espera el header <c>Authorization: Bearer hrms_xxx</c>. El handler hashea con SHA-256,
/// busca en <see cref="HrmsDbContext.ApiTokens"/>, valida expiración y actualiza
/// <c>LastUsedAtUtc</c>. Los scopes del token se mapean a permisos del sistema.
/// </summary>
public sealed class ApiTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "ApiToken";
    public const string TokenTypeClaim = "token_type";
    public const string ScopeClaim = "scope";
    public const string ApiTokenType = "api";
    private const string BearerPrefix = "Bearer ";
    private const string TokenPrefix = "hrms_";

    private readonly HrmsDbContext _db;

    // Mapeo scope → permisos del sistema. Mantener sincronizado con AppPermissions.
    private static readonly IReadOnlyDictionary<string, string[]> ScopeToPermissions =
        new Dictionary<string, string[]>
        {
            ["employees:read"]   = [AppPermissions.EmployeesView],
            ["employees:write"]  = [AppPermissions.EmployeesView, AppPermissions.EmployeesCreate, AppPermissions.EmployeesEdit],
            ["payroll:read"]     = [AppPermissions.PayrollView],
            ["attendance:read"]  = [AppPermissions.AttendanceView],
            ["vacations:read"]   = [AppPermissions.VacationsView],
            ["leaves:read"]      = [AppPermissions.LeavesView],
            ["reports:read"]     = [AppPermissions.ReportsView],
            ["documents:read"]   = [AppPermissions.DocumentsView],
            ["analytics:read"]   = [AppPermissions.AnalyticsView],
            ["recruitment:read"] = [AppPermissions.RecruitmentView]
        };

    public ApiTokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        HrmsDbContext db)
        : base(options, logger, encoder)
    {
        _db = db;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.NoResult();

        var header = authHeader.ToString();
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var rawToken = header[BearerPrefix.Length..].Trim();
        if (!rawToken.StartsWith(TokenPrefix, StringComparison.Ordinal))
            return AuthenticateResult.NoResult();

        var hash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        var token = await _db.ApiTokens
            .FirstOrDefaultAsync(x => x.TokenHash == hash && !x.IsDeleted && x.IsActive);

        if (token is null)
        {
            Logger.LogWarning("API token no válido o inactivo (prefix={Prefix}).",
                rawToken.Length >= 12 ? rawToken[..12] : "short");
            return AuthenticateResult.Fail("API token inválido o revocado.");
        }

        if (token.ExpiresAtUtc.HasValue && token.ExpiresAtUtc.Value < DateTime.UtcNow)
        {
            Logger.LogWarning("API token {TokenId} expirado el {ExpiresAt}.", token.Id, token.ExpiresAtUtc);
            return AuthenticateResult.Fail("API token expirado.");
        }

        // Best-effort: actualizar LastUsedAtUtc. No queremos que un fallo aquí bloquee la auth.
        try
        {
            token.LastUsedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Logger.LogDebug(ex, "No se pudo actualizar LastUsedAtUtc para token {TokenId}.", token.Id);
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, token.Id.ToString()),
            new(ClaimTypes.Name, $"api:{token.Name}"),
            new(TokenTypeClaim, ApiTokenType)
        };

        foreach (var scope in token.Scopes)
        {
            claims.Add(new Claim(ScopeClaim, scope));
            if (ScopeToPermissions.TryGetValue(scope, out var perms))
            {
                foreach (var perm in perms)
                    claims.Add(new Claim(AppClaimTypes.Permission, perm));
            }
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return AuthenticateResult.Success(ticket);
    }
}

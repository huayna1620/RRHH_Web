namespace Hrms.Infrastructure.Options;

/// <summary>
/// Credenciales OAuth 2.0 para Microsoft Graph (Outlook / Microsoft 365 Calendar).
///
/// **Cómo obtenerlas:**
/// 1. Ir a https://portal.azure.com → Azure Active Directory → App registrations → New registration.
/// 2. Tipo multi-tenant (o el que aplique): "Accounts in any organizational directory and personal Microsoft accounts".
/// 3. Agregar Redirect URI tipo "Web" exactamente igual al del HRMS.
/// 4. En Certificates &amp; secrets → New client secret → copiar el VALUE (no el ID).
/// 5. En API permissions → Add → Microsoft Graph → Delegated:
///    - <c>offline_access</c>
///    - <c>User.Read</c>
///    - <c>Calendars.ReadWrite</c>
/// 6. Copiar Application (client) ID y el secret aquí.
///
/// <see cref="TenantId"/> por defecto <c>common</c> → acepta cuentas personales y de trabajo.
/// </summary>
public sealed class MicrosoftCalendarOptions
{
    public const string SectionName = "MicrosoftCalendar";

    public bool Enabled { get; set; }

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Tenant ID. Valores típicos:
    /// - <c>common</c>: cualquier cuenta (personal o de trabajo).
    /// - <c>organizations</c>: solo cuentas de Azure AD.
    /// - <c>consumers</c>: solo cuentas personales.
    /// - <c>&lt;GUID&gt;</c>: un tenant específico.
    /// </summary>
    public string TenantId { get; set; } = "common";

    /// <summary>
    /// URL absoluta a la que Microsoft redirige tras aprobar. Debe coincidir exactamente
    /// con la registrada en el portal de Azure.
    /// Típicamente: <c>https://hrms.miempresa.com/api/v1/integrations/calendar/microsoft/callback</c>.
    /// </summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>URL del frontend a la que redirigimos al final del flujo.</summary>
    public string PostCallbackRedirectUrl { get; set; } = string.Empty;
}

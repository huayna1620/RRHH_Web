using Hrms.Application.DTOs.Integrations;

namespace Hrms.Application.Interfaces.Services;

/// <summary>Maneja el flujo OAuth 2.0 de Google Calendar: authorize → callback → refresh.</summary>
public interface IGoogleCalendarOAuthService
{
    /// <summary>Si las credenciales de Google están configuradas (Enabled + ClientId + ClientSecret).</summary>
    bool IsConfigured { get; }

    /// <summary>URL del frontend a la que redirigir tras completar el callback OAuth.</summary>
    string PostCallbackRedirectUrl { get; }

    /// <summary>
    /// Construye la URL de consentimiento de Google y devuelve el state asociado.
    /// El caller debe guardar el state en un cookie HttpOnly short-lived y validarlo en el callback.
    /// </summary>
    (string AuthorizationUrl, string State) BuildAuthorizationUrl(Guid userId);

    /// <summary>
    /// Intercambia el <paramref name="code"/> devuelto por Google por tokens y persiste la conexión
    /// para <paramref name="userId"/>. Si ya existía una conexión, la reemplaza.
    /// </summary>
    Task<CalendarConnectionDto> ExchangeCodeAsync(Guid userId, string userName, string code, CancellationToken cancellationToken = default);

    /// <summary>Consulta la conexión activa del usuario (o null si no tiene).</summary>
    Task<CalendarConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Revoca el refresh token en Google y elimina la conexión local.</summary>
    Task<bool> DisconnectAsync(Guid userId, CancellationToken cancellationToken = default);
}

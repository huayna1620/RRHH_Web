namespace Hrms.Infrastructure.Options;

/// <summary>
/// Credenciales OAuth 2.0 para la integración con Google Calendar.
/// Se configuran en appsettings.json (o mejor, User Secrets / variables de entorno).
///
/// **Cómo obtenerlas:**
/// 1. Ir a https://console.cloud.google.com/apis/credentials
/// 2. Crear un "OAuth 2.0 Client ID" de tipo "Web application"
/// 3. Agregar el RedirectUri autorizado exactamente igual a como va a llamar el HRMS
/// 4. Copiar ClientId y ClientSecret aquí
/// 5. Habilitar la "Google Calendar API" en la misma consola
/// </summary>
public sealed class GoogleCalendarOptions
{
    public const string SectionName = "GoogleCalendar";

    /// <summary>Si está deshabilitado, los endpoints devuelven 503 y la UI oculta el botón.</summary>
    public bool Enabled { get; set; }

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// URL absoluta a la que Google redirige al usuario tras aprobar. Debe coincidir
    /// exactamente con lo que se registró en Google Cloud Console.
    /// Típicamente: <c>https://hrms.miempresa.com/api/v1/integrations/calendar/google/callback</c>.
    /// </summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>
    /// URL del frontend a la que redirigimos al usuario al final del flujo.
    /// Ej.: <c>https://hrms.miempresa.com/integrations?google=connected</c>.
    /// </summary>
    public string PostCallbackRedirectUrl { get; set; } = string.Empty;
}

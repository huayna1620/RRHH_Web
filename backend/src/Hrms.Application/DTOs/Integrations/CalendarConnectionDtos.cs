namespace Hrms.Application.DTOs.Integrations;

/// <summary>Estado de una conexión OAuth con un calendario externo.</summary>
public sealed record CalendarConnectionDto(
    Guid Id,
    string Provider,
    string ProviderAccountEmail,
    string CalendarId,
    string Status,
    DateTime? LastSyncAtUtc,
    string? LastSyncError,
    DateTime CreatedAtUtc);

/// <summary>Respuesta del endpoint que inicia el flujo OAuth — contiene la URL a la que redirigir al navegador.</summary>
public sealed record OAuthAuthorizeDto(string AuthorizationUrl);

/// <summary>Configuración global del proveedor (para la UI).</summary>
public sealed record CalendarProviderInfoDto(
    string Provider,
    string DisplayName,
    bool Enabled);

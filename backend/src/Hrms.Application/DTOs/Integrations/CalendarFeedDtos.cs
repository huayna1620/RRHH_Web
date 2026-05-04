namespace Hrms.Application.DTOs.Integrations;

/// <summary>Feed iCal configurado por un usuario. No expone el token completo (solo el prefijo).</summary>
public sealed record CalendarFeedDto(
    Guid Id,
    string Name,
    string TokenPrefix,
    string[] Scopes,
    DateTime? LastAccessedAtUtc,
    int AccessCount,
    bool IsRevoked,
    DateTime CreatedAtUtc);

/// <summary>Respuesta al crear un feed — incluye la URL completa con el token (solo se muestra una vez).</summary>
public sealed record CalendarFeedCreatedDto(
    Guid Id,
    string Name,
    string FeedUrl,
    string[] Scopes,
    DateTime CreatedAtUtc);

/// <summary>Solicitud para crear un feed iCal.</summary>
public sealed record CreateCalendarFeedRequestDto(
    string Name,
    string[] Scopes);

/// <summary>Metadatos de un scope disponible — se usa en la UI para pintar checkboxes.</summary>
public sealed record CalendarFeedScopeDto(
    string Code,
    string Label,
    string Description,
    bool RequiresAdminRole);

using Hrms.Application.DTOs.Integrations;

namespace Hrms.Application.Interfaces.Services;

/// <summary>
/// Genera y administra feeds iCal (RFC 5545) para suscripciones de calendario.
/// Los feeds se descargan desde una URL pública firmada con un token por-usuario.
/// </summary>
public interface ICalendarFeedService
{
    /// <summary>Lista los feeds del usuario (sin exponer el token).</summary>
    Task<IReadOnlyList<CalendarFeedDto>> GetUserFeedsAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea un feed y devuelve la URL pública con el token embebido.
    /// El token original solo se devuelve aquí — luego se guarda nada más el hash.
    /// </summary>
    Task<CalendarFeedCreatedDto> CreateFeedAsync(
        Guid userId,
        string userName,
        CreateCalendarFeedRequestDto request,
        string feedBaseUrl,
        CancellationToken cancellationToken = default);

    /// <summary>Revoca el feed (soft) — el endpoint público deja de responder.</summary>
    Task<bool> RevokeFeedAsync(Guid userId, Guid feedId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera el contenido ICS para el token dado. Retorna null si el token no existe,
    /// está revocado o pertenece a un usuario inactivo. Además registra el acceso.
    /// </summary>
    Task<string?> GenerateIcsAsync(string rawToken, CancellationToken cancellationToken = default);

    /// <summary>Catálogo de scopes disponibles para pintar en la UI.</summary>
    IReadOnlyList<CalendarFeedScopeDto> GetAvailableScopes();
}

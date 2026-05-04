using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// Token de suscripción a un feed iCal (RFC 5545). El token va en la URL pública
/// (ej. <c>/api/v1/integrations/calendar/feed/{token}.ics</c>) y funciona como
/// credencial: quien tenga la URL puede leer el calendario. Por eso guardamos
/// solo el hash SHA-256 del token y mostramos nada más el prefijo en la UI.
/// </summary>
public sealed class CalendarFeedToken : AuditableEntity
{
    /// <summary>Usuario dueño del feed. Determina qué datos ve (p.ej. sus propias vacaciones).</summary>
    public Guid UserId { get; set; }

    /// <summary>Nombre descriptivo (ej. "Mi calendario de vacaciones").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>SHA-256 del token completo. El valor original solo se muestra una vez al crearlo.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Primeros caracteres del token (para que el usuario lo reconozca en la lista).</summary>
    public string TokenPrefix { get; set; } = string.Empty;

    /// <summary>
    /// Qué contenido incluye el feed. Ver <see cref="Constants.CalendarFeedScopes"/>.
    /// Se guarda como CSV en BD.
    /// </summary>
    public string[] Scopes { get; set; } = [];

    /// <summary>Última vez que un cliente de calendario descargó el feed. Null si nunca.</summary>
    public DateTime? LastAccessedAtUtc { get; set; }

    /// <summary>Cuenta de descargas — útil para detectar feeds abandonados o abusados.</summary>
    public int AccessCount { get; set; }

    /// <summary>Si está revocado, el endpoint devuelve 404 y no se puede reactivar.</summary>
    public DateTime? RevokedAtUtc { get; set; }

    public User User { get; set; } = default!;
}

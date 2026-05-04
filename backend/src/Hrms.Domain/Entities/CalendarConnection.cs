using Hrms.Domain.Common;
using Hrms.Domain.Constants;

namespace Hrms.Domain.Entities;

/// <summary>
/// Conexión OAuth 2.0 entre un usuario del HRMS y un calendario externo (Google / Microsoft).
/// Los tokens de acceso y refresh se guardan **cifrados** con IDataProtector — nunca en claro.
/// Un usuario puede tener solo una conexión activa por proveedor.
/// </summary>
public sealed class CalendarConnection : AuditableEntity
{
    public Guid UserId { get; set; }

    /// <summary>"google" | "microsoft" — ver <see cref="CalendarProviders"/>.</summary>
    public string Provider { get; set; } = CalendarProviders.Google;

    /// <summary>Access token cifrado (ciphertext base64). No se expone a la API.</summary>
    public string AccessTokenCipher { get; set; } = string.Empty;

    /// <summary>Refresh token cifrado. Puede ser null si el proveedor no lo emite (ej. consentimiento sin offline_access).</summary>
    public string? RefreshTokenCipher { get; set; }

    /// <summary>Cuándo expira el access token actual (UTC). Si está en el pasado, se refresca antes de cada uso.</summary>
    public DateTime AccessTokenExpiresAtUtc { get; set; }

    /// <summary>ID del calendario donde se escriben los eventos (normalmente "primary").</summary>
    public string CalendarId { get; set; } = "primary";

    /// <summary>Email de la cuenta externa — útil para mostrar "conectado como X" en la UI.</summary>
    public string ProviderAccountEmail { get; set; } = string.Empty;

    /// <summary>active | unauthorized | error. Ver <see cref="CalendarConnectionStatuses"/>.</summary>
    public string Status { get; set; } = CalendarConnectionStatuses.Active;

    public DateTime? LastSyncAtUtc { get; set; }
    public string? LastSyncError { get; set; }

    public User User { get; set; } = default!;
}

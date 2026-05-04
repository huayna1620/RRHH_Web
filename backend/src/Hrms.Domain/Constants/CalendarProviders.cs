namespace Hrms.Domain.Constants;

/// <summary>Proveedores externos soportados para sincronización push de calendario.</summary>
public static class CalendarProviders
{
    public const string Google = "google";
    public const string Microsoft = "microsoft";

    public static readonly IReadOnlyList<string> All = [Google, Microsoft];
}

/// <summary>Estado operativo de una conexión OAuth.</summary>
public static class CalendarConnectionStatuses
{
    /// <summary>Conectada y funcionando; último sync OK.</summary>
    public const string Active = "active";

    /// <summary>El refresh token fue revocado o expiró; requiere reconectar.</summary>
    public const string Unauthorized = "unauthorized";

    /// <summary>Último intento de sync falló por error transitorio; se reintentará.</summary>
    public const string Error = "error";
}

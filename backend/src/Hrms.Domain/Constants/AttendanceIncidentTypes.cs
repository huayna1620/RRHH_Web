namespace Hrms.Domain.Constants;

public static class AttendanceIncidentTypes
{
    public const string Tardanza = "tardanza";
    public const string Falta = "falta";
    public const string SalidaAnticipada = "salida_anticipada";
    public const string NoMarcacion = "no_marcacion";

    public static readonly IReadOnlyList<string> All =
    [
        Tardanza,
        Falta,
        SalidaAnticipada,
        NoMarcacion
    ];
}

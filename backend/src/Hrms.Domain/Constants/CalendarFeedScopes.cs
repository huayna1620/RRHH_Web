namespace Hrms.Domain.Constants;

/// <summary>
/// Scopes disponibles para un feed iCal. Cada scope controla qué tipo de eventos
/// se incluyen en el archivo .ics. Un feed puede combinar varios scopes.
///
/// Los scopes "my-*" filtran por <c>User.EmployeeId</c>; los scopes "team-*" y
/// "holidays" exponen datos del tenant entero — por eso solo deberían concederse
/// a roles administrativos.
/// </summary>
public static class CalendarFeedScopes
{
    /// <summary>Vacaciones aprobadas del empleado asociado al usuario.</summary>
    public const string MyVacations = "my-vacations";

    /// <summary>Permisos/licencias aprobados del empleado asociado al usuario.</summary>
    public const string MyLeaves = "my-leaves";

    /// <summary>Todas las vacaciones aprobadas de la organización (scope HR/admin).</summary>
    public const string TeamVacations = "team-vacations";

    /// <summary>Todos los permisos aprobados de la organización (scope HR/admin).</summary>
    public const string TeamLeaves = "team-leaves";

    /// <summary>Feriados del calendario laboral.</summary>
    public const string Holidays = "holidays";

    /// <summary>Ciclos de evaluación activos (rango Start/End).</summary>
    public const string EvaluationCycles = "evaluation-cycles";

    public static readonly IReadOnlyList<string> All =
    [
        MyVacations,
        MyLeaves,
        TeamVacations,
        TeamLeaves,
        Holidays,
        EvaluationCycles
    ];

    /// <summary>Scopes que exponen datos de toda la organización (requieren permiso admin).</summary>
    public static readonly IReadOnlyList<string> TenantWide =
    [
        TeamVacations,
        TeamLeaves,
        Holidays,
        EvaluationCycles
    ];
}

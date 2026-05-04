using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class AttendanceIncident : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public Guid AttendanceRecordId { get; set; }

    /// <summary>tardanza | falta | salida_anticipada | no_marcacion</summary>
    public string IncidentType { get; set; } = string.Empty;

    public DateOnly IncidentDate { get; set; }

    /// <summary>Minutes late (tardanza) or minutes left early (salida_anticipada). 0 for falta/no_marcacion.</summary>
    public int MinutesImpacted { get; set; }

    /// <summary>open | justified | rejected | expired</summary>
    public string Status { get; set; } = string.Empty;

    public string? JustificationText { get; set; }
    public DateTime? JustificationSubmittedAtUtc { get; set; }
    public DateTime? JustificationDeadlineUtc { get; set; }

    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByUserName { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewerComment { get; set; }

    public Employee Employee { get; set; } = default!;
    public AttendanceRecord AttendanceRecord { get; set; } = default!;
}

namespace Hrms.Application.DTOs.Attendance;

/// <summary>Global incident counters used by the incidents page KPI cards.</summary>
public sealed record AttendanceIncidentStatsDto(
    int Total,
    int Open,
    int Justified,
    int Rejected,
    int Expired,
    int OpenPendingReview,
    int OpenAwaitingJustification);

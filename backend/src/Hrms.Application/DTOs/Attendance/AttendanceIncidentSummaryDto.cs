namespace Hrms.Application.DTOs.Attendance;

/// <summary>Per-employee incident summary for a given period — consumed by FASE 3 payroll.</summary>
public sealed record AttendanceIncidentSummaryDto(
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    int OpenCount,
    int JustifiedCount,
    int RejectedCount,
    int ExpiredCount,
    int TotalTardanzaMinutes,
    int TotalSalidaAnticipadaMinutes,
    int TotalFaltas,
    int TotalNoMarcaciones);

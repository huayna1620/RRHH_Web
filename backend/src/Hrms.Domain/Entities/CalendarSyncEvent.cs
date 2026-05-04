using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

/// <summary>
/// Mapeo "entidad HRMS → evento externo del calendario". Cada vez que el HRMS
/// empuja un evento (vacación/permiso) hacia Google Calendar, guardamos el
/// <c>ProviderEventId</c> devuelto para poder **actualizarlo o eliminarlo**
/// más adelante sin crear duplicados.
///
/// La tupla (ConnectionId, HrmsEntityType, HrmsEntityId) es única — evita
/// insertar dos veces el mismo evento aunque se dispare el dispatch varias veces.
/// </summary>
public sealed class CalendarSyncEvent : AuditableEntity
{
    public Guid ConnectionId { get; set; }

    /// <summary>"vacation" | "leave" — categoría del evento de origen.</summary>
    public string HrmsEntityType { get; set; } = string.Empty;

    /// <summary>ID de la entidad HRMS (VacationRequest.Id, LeaveRequest.Id, etc.).</summary>
    public Guid HrmsEntityId { get; set; }

    /// <summary>ID que el proveedor externo le asignó al evento (Google event ID).</summary>
    public string ProviderEventId { get; set; } = string.Empty;

    public DateTime SyncedAtUtc { get; set; }

    public CalendarConnection Connection { get; set; } = default!;
}

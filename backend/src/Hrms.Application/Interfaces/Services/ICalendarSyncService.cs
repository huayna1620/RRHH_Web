namespace Hrms.Application.Interfaces.Services;

/// <summary>
/// Recibe eventos de negocio (vacation.approved, leave.approved, etc.) y los
/// empuja al calendario externo conectado del empleado correspondiente.
///
/// Se invoca desde <see cref="IIntegrationService.DispatchEventAsync"/> para
/// compartir el pipeline con los webhooks — los dos son subscribers del mismo evento.
/// </summary>
public interface ICalendarSyncService
{
    /// <summary>
    /// Procesa un evento del bus y sincroniza si aplica. Si el empleado no tiene
    /// conexión o el evento no es sincronizable, es no-op.
    ///
    /// Este método NO lanza excepciones — errores se loguean y se marcan en la
    /// conexión (Status=error, LastSyncError).
    /// </summary>
    Task DispatchAsync(string eventType, object payload, CancellationToken cancellationToken = default);
}

using System.Text;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// Endpoint público de suscripción a feeds iCal (RFC 5545). El token embebido
/// en la URL actúa como credencial — quien tenga la URL puede leer el feed.
///
/// **No requiere autenticación JWT**: los clientes de calendario (Google, Outlook,
/// Apple) no pueden enviar headers custom al suscribirse, así que toda la seguridad
/// recae en el token opaco de 40 bytes dentro de la URL. Por eso el token se guarda
/// hasheado y se puede revocar en cualquier momento.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/v1/integrations/calendar")]
public sealed class CalendarFeedPublicController(ICalendarFeedService calendarFeedService) : ControllerBase
{
    /// <summary>Descarga el archivo .ics correspondiente al token.</summary>
    /// <remarks>
    /// **URL de suscripción:** pégala en tu cliente de calendario favorito.
    /// La respuesta es <c>text/calendar</c> con Content-Disposition inline para que
    /// los navegadores la rendericen en vez de descargarla.
    ///
    /// El token se invalida desde el panel de Integraciones del HRMS.
    /// </remarks>
    [HttpGet("feed/{token}.ics")]
    [Produces("text/calendar")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFeed(string token, CancellationToken cancellationToken)
    {
        // Validación defensiva: el token siempre es base64-url safe (~54 chars).
        // Si viene vacío o desproporcionadamente largo, 404 sin consultar BD.
        if (string.IsNullOrWhiteSpace(token) || token.Length is < 20 or > 128)
            return NotFound();

        var ics = await calendarFeedService.GenerateIcsAsync(token, cancellationToken);
        if (ics is null) return NotFound();

        // UTF-8 sin BOM (algunos parsers de ICS fallan con BOM).
        var bytes = Encoding.UTF8.GetBytes(ics);
        return File(bytes, "text/calendar; charset=utf-8", "hrms-calendar.ics");
    }
}

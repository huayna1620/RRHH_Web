using System.Globalization;
using System.Text;

namespace Hrms.Infrastructure.Services.Calendar;

/// <summary>
/// Genera archivos iCalendar (RFC 5545) compatibles con Google Calendar, Outlook,
/// Apple Calendar y cualquier cliente que soporte suscripción a URL ICS.
///
/// Conservadoramente:
/// - Usa CRLF (línea RFC 5545).
/// - Hace line folding a 75 octetos (RFC 5545 §3.1).
/// - Escapa caracteres especiales en SUMMARY/DESCRIPTION/LOCATION.
/// - Usa DTSTART;VALUE=DATE para eventos de día completo y DTEND como fecha EXCLUSIVA
///   (así un evento de "lunes a miércoles" se guarda como DTSTART=lunes / DTEND=jueves).
/// - UID estable por entidad → actualizar un evento en HRMS actualiza el mismo evento en el cliente.
/// </summary>
public sealed class IcsBuilder
{
    private readonly StringBuilder _sb = new();
    private const string Crlf = "\r\n";

    // PRODID debe ser estable — muchos clientes lo usan como hint de confianza.
    private const string ProdId = "-//HRMS//Calendar Feed 1.0//EN";

    public IcsBuilder(string calendarName, string? description = null)
    {
        AppendLine("BEGIN:VCALENDAR");
        AppendLine("VERSION:2.0");
        AppendLine($"PRODID:{ProdId}");
        AppendLine("CALSCALE:GREGORIAN");
        AppendLine("METHOD:PUBLISH");
        // X-WR-* son extensiones no estándar pero las honran Google/Apple para el nombre del calendario.
        AppendLine($"X-WR-CALNAME:{Escape(calendarName)}");
        if (!string.IsNullOrWhiteSpace(description))
            AppendLine($"X-WR-CALDESC:{Escape(description)}");
        // Refresh hint: la mayoría de clientes no lo respeta; Google Calendar refresca cada ~24h.
        AppendLine("X-PUBLISHED-TTL:PT12H");
        AppendLine("REFRESH-INTERVAL;VALUE=DURATION:PT12H");
    }

    /// <summary>Evento de día completo (uno o varios días). <paramref name="endDateInclusive"/> es el último día que cubre el evento.</summary>
    public IcsBuilder AddAllDayEvent(
        string uid,
        DateOnly startDate,
        DateOnly endDateInclusive,
        string summary,
        string? description = null,
        DateTime? createdUtc = null,
        DateTime? modifiedUtc = null,
        string? category = null)
    {
        // RFC 5545: DTEND es EXCLUSIVO para VALUE=DATE → sumar 1 día al último día cubierto.
        var dtEndExclusive = endDateInclusive.AddDays(1);

        AppendLine("BEGIN:VEVENT");
        AppendLine($"UID:{uid}");
        AppendLine($"DTSTAMP:{FormatUtc(DateTime.UtcNow)}");
        AppendLine($"DTSTART;VALUE=DATE:{FormatDate(startDate)}");
        AppendLine($"DTEND;VALUE=DATE:{FormatDate(dtEndExclusive)}");
        AppendLine($"SUMMARY:{Escape(summary)}");
        if (!string.IsNullOrWhiteSpace(description))
            AppendLine($"DESCRIPTION:{Escape(description)}");
        if (!string.IsNullOrWhiteSpace(category))
            AppendLine($"CATEGORIES:{Escape(category)}");
        if (createdUtc.HasValue)
            AppendLine($"CREATED:{FormatUtc(createdUtc.Value)}");
        if (modifiedUtc.HasValue)
            AppendLine($"LAST-MODIFIED:{FormatUtc(modifiedUtc.Value)}");
        // TRANSP:TRANSPARENT → no marca al dueño como "ocupado" en su calendario.
        // Usamos OPAQUE para vacaciones/permisos (sí ocupa); el caller decide con category.
        AppendLine("TRANSP:OPAQUE");
        AppendLine("END:VEVENT");
        return this;
    }

    public string Build()
    {
        AppendLine("END:VCALENDAR");
        return _sb.ToString();
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private void AppendLine(string line)
    {
        // RFC 5545 §3.1: toda línea > 75 octetos se pliega (fold) insertando CRLF + espacio.
        // Contamos en UTF-8 bytes, no en chars, para ser estrictos con multibyte.
        var bytes = Encoding.UTF8.GetByteCount(line);
        if (bytes <= 75)
        {
            _sb.Append(line).Append(Crlf);
            return;
        }

        // Fold: partir a 75 bytes, continuar con " " (SPACE) al inicio de la siguiente línea.
        var remaining = line;
        var first = true;
        while (remaining.Length > 0)
        {
            var maxBytes = first ? 75 : 74; // restar el espacio inicial de continuación
            var chunk = TakeUtf8Chunk(remaining, maxBytes, out var consumed);
            if (!first) _sb.Append(' ');
            _sb.Append(chunk).Append(Crlf);
            remaining = remaining[consumed..];
            first = false;
        }
    }

    private static string TakeUtf8Chunk(string input, int maxBytes, out int consumedChars)
    {
        // Consumir chars hasta que agregar uno más supere maxBytes (respetando multibyte).
        var bytes = 0;
        var chars = 0;
        while (chars < input.Length)
        {
            var cp = char.IsHighSurrogate(input[chars]) && chars + 1 < input.Length
                ? char.ConvertToUtf32(input[chars], input[chars + 1])
                : input[chars];
            var cpBytes = cp switch
            {
                < 0x80      => 1,
                < 0x800     => 2,
                < 0x10000   => 3,
                _           => 4
            };
            if (bytes + cpBytes > maxBytes) break;
            bytes += cpBytes;
            chars += cpBytes == 4 ? 2 : 1; // surrogate pair consume 2 chars
        }
        consumedChars = chars;
        return input[..chars];
    }

    private static string Escape(string value)
    {
        // RFC 5545 §3.3.11: escapar \  ;  ,  y convertir \n a \\n.
        return value
            .Replace("\\", "\\\\")
            .Replace(";", "\\;")
            .Replace(",", "\\,")
            .Replace("\r\n", "\\n")
            .Replace("\n", "\\n")
            .Replace("\r", "\\n");
    }

    private static string FormatDate(DateOnly d) =>
        d.ToString("yyyyMMdd", CultureInfo.InvariantCulture);

    private static string FormatUtc(DateTime dt) =>
        dt.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
}

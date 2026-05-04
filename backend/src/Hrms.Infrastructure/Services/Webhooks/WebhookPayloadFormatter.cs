using System.Text.Json;
using Hrms.Domain.Constants;

namespace Hrms.Infrastructure.Services.Webhooks;

/// <summary>
/// Transforma el payload JSON estandar del HRMS al formato que espera el destino
/// (Slack Block Kit o Microsoft Teams MessageCard). Si el formato es "raw", devuelve
/// el JSON original sin cambios.
///
/// **Slack Block Kit:** https://api.slack.com/reference/block-kit
/// **Teams MessageCard:** https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
/// </summary>
public static class WebhookPayloadFormatter
{
    // Mapeo de eventType -> emoji para mensajes formateados
    private static readonly Dictionary<string, string> _eventEmoji = new()
    {
        ["employee.created"]    = "\ud83d\udc64",   // bust
        ["employee.updated"]    = "\u270f\ufe0f",    // pencil
        ["employee.terminated"] = "\ud83d\udeab",   // prohibited
        ["payroll.approved"]    = "\ud83d\udcb0",   // money bag
        ["vacation.approved"]   = "\ud83c\udfd6\ufe0f", // beach
        ["leave.approved"]      = "\ud83d\udccb",   // clipboard
        ["document.signed"]     = "\u2705",          // check
        ["onboarding.completed"]= "\ud83c\udf89",   // party
        ["evaluation.finalized"]= "\ud83c\udfaf",   // target
    };

    // Mapeo de eventType -> titulo legible
    private static readonly Dictionary<string, string> _eventTitle = new()
    {
        ["employee.created"]    = "Nuevo empleado registrado",
        ["employee.updated"]    = "Empleado actualizado",
        ["employee.terminated"] = "Empleado dado de baja",
        ["payroll.approved"]    = "Planilla aprobada",
        ["vacation.approved"]   = "Vacacion aprobada",
        ["leave.approved"]      = "Permiso/licencia aprobado",
        ["document.signed"]     = "Documento firmado",
        ["onboarding.completed"]= "Onboarding completado",
        ["evaluation.finalized"]= "Evaluacion finalizada",
    };

    /// <summary>
    /// Dado el payload JSON original y el formato destino, devuelve el JSON transformado.
    /// </summary>
    public static string Format(string rawJson, string eventType, string format)
    {
        return format switch
        {
            WebhookPayloadFormats.Slack => ToSlackBlockKit(rawJson, eventType),
            WebhookPayloadFormats.Teams => ToTeamsMessageCard(rawJson, eventType),
            _ => rawJson // raw: sin transformacion
        };
    }

    // ── Slack Block Kit ──────────────────────────────────────────────────

    /// <summary>
    /// Transforma a Slack Block Kit con:
    /// - Header con emoji + titulo
    /// - Section con campos key/value del data
    /// - Context con timestamp
    /// </summary>
    private static string ToSlackBlockKit(string rawJson, string eventType)
    {
        var emoji = _eventEmoji.GetValueOrDefault(eventType, "\ud83d\udd14"); // bell fallback
        var title = _eventTitle.GetValueOrDefault(eventType, eventType);

        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var fields = new List<object>();
        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in data.EnumerateObject())
            {
                fields.Add(new
                {
                    type = "mrkdwn",
                    text = $"*{FormatFieldName(prop.Name)}:*\n{FormatValue(prop.Value)}"
                });
            }
        }

        var timestamp = root.TryGetProperty("timestamp", out var ts) ? ts.GetString() : DateTime.UtcNow.ToString("o");

        var blocks = new List<object>
        {
            new { type = "header", text = new { type = "plain_text", text = $"{emoji} {title}", emoji = true } }
        };

        if (fields.Count > 0)
        {
            // Slack allows max 10 fields per section, split if needed
            for (int i = 0; i < fields.Count; i += 10)
            {
                blocks.Add(new { type = "section", fields = fields.Skip(i).Take(10).ToArray() });
            }
        }

        blocks.Add(new { type = "context", elements = new object[] { new { type = "mrkdwn", text = $"\ud83d\udcc5 {timestamp} | HRMS Webhook" } } });

        var payload = new { blocks };
        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = false });
    }

    // ── Microsoft Teams MessageCard ──────────────────────────────────────

    /// <summary>
    /// Transforma a Teams MessageCard (legacy format — compatible con todos los Teams channels).
    /// </summary>
    private static string ToTeamsMessageCard(string rawJson, string eventType)
    {
        var emoji = _eventEmoji.GetValueOrDefault(eventType, "\ud83d\udd14");
        var title = _eventTitle.GetValueOrDefault(eventType, eventType);

        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var facts = new List<object>();
        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in data.EnumerateObject())
            {
                facts.Add(new { name = FormatFieldName(prop.Name), value = FormatValue(prop.Value) });
            }
        }

        var timestamp = root.TryGetProperty("timestamp", out var ts) ? ts.GetString() : DateTime.UtcNow.ToString("o");

        var card = new
        {
            @type = "MessageCard",
            context = "https://schema.org/extensions",
            summary = $"{emoji} {title}",
            themeColor = "0076D7",
            title = $"{emoji} {title}",
            sections = new object[]
            {
                new
                {
                    activityTitle = "HRMS — Notificacion automatica",
                    activitySubtitle = timestamp,
                    facts,
                    markdown = true
                }
            }
        };

        return JsonSerializer.Serialize(card, new JsonSerializerOptions { WriteIndented = false });
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /// <summary>"employeeName" -> "Empleado" (human-readable)</summary>
    private static string FormatFieldName(string name)
    {
        return name switch
        {
            "id" => "ID",
            "employeeId" => "Empleado ID",
            "employeeCode" => "Codigo",
            "employeeName" or "fullName" => "Empleado",
            "hireDate" => "Fecha ingreso",
            "startDate" => "Inicio",
            "endDate" => "Fin",
            "type" or "leaveType" => "Tipo",
            "days" => "Dias",
            "year" => "Anio",
            "month" => "Mes",
            "totalEmployees" => "Total empleados",
            "totalNetPay" => "Total neto",
            "workEmail" => "Email",
            "signedBy" => "Firmado por",
            "signatureHash" => "Hash firma",
            "documentId" => "Documento ID",
            "title" => "Titulo",
            "templateName" => "Plantilla",
            "processId" => "Proceso ID",
            "assignmentId" => "Asignacion ID",
            "finalScore" => "Puntaje final",
            _ => ToPascalSpaced(name)
        };
    }

    private static string ToPascalSpaced(string camelCase)
    {
        var chars = new List<char>();
        foreach (var ch in camelCase)
        {
            if (char.IsUpper(ch) && chars.Count > 0) chars.Add(' ');
            chars.Add(chars.Count == 0 ? char.ToUpperInvariant(ch) : ch);
        }
        return new string(chars.ToArray());
    }

    private static string FormatValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? "",
            JsonValueKind.Number => element.TryGetDecimal(out var d) ? d.ToString("N2") : element.GetRawText(),
            JsonValueKind.True => "Si",
            JsonValueKind.False => "No",
            _ => element.GetRawText()
        };
    }
}

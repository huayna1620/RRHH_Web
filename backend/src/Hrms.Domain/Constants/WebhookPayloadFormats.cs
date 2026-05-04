namespace Hrms.Domain.Constants;

/// <summary>
/// Formatos de payload para webhooks. "raw" envia el JSON estandar del HRMS;
/// "slack" y "teams" transforman el payload a Block Kit y MessageCard respectivamente.
/// </summary>
public static class WebhookPayloadFormats
{
    public const string Raw   = "raw";
    public const string Slack = "slack";
    public const string Teams = "teams";

    public static readonly IReadOnlyList<string> All = [Raw, Slack, Teams];
}

using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class WebhookEndpoint : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string[] Events { get; set; } = []; // e.g. employee.created, payroll.approved
    public string Secret { get; set; } = string.Empty; // HMAC signing secret
    public string Format { get; set; } = "raw";        // raw | slack | teams (ver WebhookPayloadFormats)
    public int FailureCount { get; set; }
    public DateTime? LastDeliveryAtUtc { get; set; }
    public bool LastDeliverySuccess { get; set; }
    public string? Description { get; set; }
}

using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class WebhookDelivery : BaseEntity
{
    public Guid EndpointId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public int? ResponseStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public bool Success { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime DeliveredAtUtc { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }

    public WebhookEndpoint Endpoint { get; set; } = null!;
}

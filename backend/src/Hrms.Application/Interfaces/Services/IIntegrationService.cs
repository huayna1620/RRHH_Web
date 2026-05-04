using Hrms.Application.DTOs.Integrations;

namespace Hrms.Application.Interfaces.Services;

public interface IIntegrationService
{
    // ── API Tokens ───────────────────────────────────────────────────────
    Task<IReadOnlyList<ApiTokenDto>> GetTokensAsync(CancellationToken cancellationToken = default);
    Task<ApiTokenCreatedDto> CreateTokenAsync(CreateApiTokenRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> RevokeTokenAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiTokenCreatedDto?> RotateTokenAsync(Guid id, string userName, CancellationToken cancellationToken = default);

    // ── Webhooks ─────────────────────────────────────────────────────────
    Task<IReadOnlyList<WebhookEndpointDto>> GetEndpointsAsync(CancellationToken cancellationToken = default);
    Task<WebhookEndpointDto> CreateEndpointAsync(CreateWebhookRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> DeleteEndpointAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ToggleEndpointAsync(Guid id, string userName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WebhookDeliveryDto>> GetDeliveriesAsync(Guid endpointId, DeliveryQueryDto query, CancellationToken cancellationToken = default);
    Task<bool> TestEndpointAsync(Guid id, CancellationToken cancellationToken = default);

    // ── Available events catalog ─────────────────────────────────────────
    IReadOnlyList<WebhookEventDto> GetAvailableEvents();

    // ── Used internally to dispatch events ───────────────────────────────
    Task DispatchEventAsync(string eventType, object payload, CancellationToken cancellationToken = default);
}

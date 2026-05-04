namespace Hrms.Application.DTOs.Integrations;

// ── API Tokens ───────────────────────────────────────────────────────

/// <summary>Información de un token de API</summary>
public sealed record ApiTokenDto(
    Guid Id,
    string Name,
    string TokenPrefix,
    string[] Scopes,
    DateTime? ExpiresAtUtc,
    DateTime? LastUsedAtUtc,
    string? Description,
    bool IsActive,
    DateTime CreatedAtUtc);

/// <summary>Respuesta al crear un token — incluye el valor completo (solo se muestra una vez)</summary>
public sealed record ApiTokenCreatedDto(
    Guid Id,
    string Name,
    string Token,
    string TokenPrefix,
    string[] Scopes,
    DateTime? ExpiresAtUtc,
    string? Description);

/// <summary>Solicitud para crear un token de API</summary>
public sealed record CreateApiTokenRequestDto(
    string Name,
    string[] Scopes,
    int? ExpirationDays,
    string? Description);

// ── Webhooks ─────────────────────────────────────────────────────────

/// <summary>Configuración de un webhook endpoint</summary>
public sealed record WebhookEndpointDto(
    Guid Id,
    string Name,
    string Url,
    string[] Events,
    string SecretMasked,
    bool IsActive,
    int FailureCount,
    DateTime? LastDeliveryAtUtc,
    bool? LastDeliverySuccess,
    string? Description,
    DateTime CreatedAtUtc,
    string Format);

/// <summary>Filtros para consultar el historial de entregas de un webhook</summary>
public sealed record DeliveryQueryDto(
    bool? Success = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string? EventType = null,
    int Limit = 50);

/// <summary>Solicitud para crear un webhook endpoint</summary>
public sealed record CreateWebhookRequestDto(
    string Name,
    string Url,
    string[] Events,
    string? Description,
    string? Format = null);

/// <summary>Historial de entrega de un webhook</summary>
public sealed record WebhookDeliveryDto(
    Guid Id,
    Guid EndpointId,
    string EventType,
    string Payload,
    int? ResponseStatusCode,
    string? ResponseBody,
    bool Success,
    int AttemptNumber,
    DateTime DeliveredAtUtc,
    string? ErrorMessage);

/// <summary>Eventos disponibles para webhooks</summary>
public sealed record WebhookEventDto(
    string EventType,
    string Description,
    string PayloadExample);

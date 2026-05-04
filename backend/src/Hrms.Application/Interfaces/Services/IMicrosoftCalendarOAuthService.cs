using Hrms.Application.DTOs.Integrations;

namespace Hrms.Application.Interfaces.Services;

/// <summary>Flujo OAuth 2.0 para Microsoft Graph (Outlook Calendar).</summary>
public interface IMicrosoftCalendarOAuthService
{
    bool IsConfigured { get; }
    string PostCallbackRedirectUrl { get; }

    (string AuthorizationUrl, string State) BuildAuthorizationUrl(Guid userId);
    Task<CalendarConnectionDto> ExchangeCodeAsync(Guid userId, string userName, string code, CancellationToken cancellationToken = default);
    Task<CalendarConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DisconnectAsync(Guid userId, CancellationToken cancellationToken = default);
}

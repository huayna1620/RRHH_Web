using Microsoft.AspNetCore.Authorization;

namespace Hrms.Api.Authentication;

/// <summary>
/// Requisito de autorización por scope. Aplica cuando el principal fue autenticado
/// como API token: exige que el token tenga al menos uno de los scopes declarados.
/// Los usuarios autenticados con JWT (token_type != "api") pasan sin restricción
/// adicional — sus permisos ya se validan con las policies de permissions.
/// </summary>
public sealed class ScopeRequirement : IAuthorizationRequirement
{
    public ScopeRequirement(params string[] scopes)
    {
        if (scopes is null || scopes.Length == 0)
            throw new ArgumentException("Debe declarar al menos un scope.", nameof(scopes));
        RequiredScopes = scopes;
    }

    public IReadOnlyList<string> RequiredScopes { get; }
}

public sealed class ScopeAuthorizationHandler : AuthorizationHandler<ScopeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ScopeRequirement requirement)
    {
        var tokenType = context.User.FindFirst(ApiTokenAuthenticationHandler.TokenTypeClaim)?.Value;

        // Usuarios JWT (no api tokens) no están sujetos a validación de scope.
        if (tokenType != ApiTokenAuthenticationHandler.ApiTokenType)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var tokenScopes = context.User
            .FindAll(ApiTokenAuthenticationHandler.ScopeClaim)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (requirement.RequiredScopes.Any(s => tokenScopes.Contains(s)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

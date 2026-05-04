using Hrms.Application.DTOs.Auth;
using Hrms.Application.Interfaces.Persistence;
using Hrms.Application.Interfaces.Security;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

public sealed class AuthService(
    IUserRepository userRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IPasswordHasherService passwordHasherService,
    IJwtTokenService jwtTokenService,
    IEmailService emailService,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByUserNameOrEmailAsync(request.UserNameOrEmail, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        if (!passwordHasherService.VerifyPassword(user, request.Password, user.PasswordHash))
        {
            return null;
        }

        user.LastLoginAtUtc = DateTime.UtcNow;

        var response = await GenerateTokensAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        return response;
    }

    public async Task<LoginResponseDto?> RefreshAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken = default)
    {
        var hashed = jwtTokenService.HashToken(request.RefreshToken);
        var existingToken = await refreshTokenRepository.GetByHashedTokenAsync(hashed, cancellationToken);

        if (existingToken is null || existingToken.IsExpired || existingToken.IsRevoked || !existingToken.User.IsActive)
        {
            return null;
        }

        existingToken.RevokedAtUtc = DateTime.UtcNow;
        var response = await GenerateTokensAsync(existingToken.User, cancellationToken);

        await refreshTokenRepository.SaveChangesAsync(cancellationToken);
        return response;
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var hashed = jwtTokenService.HashToken(refreshToken);
        var existingToken = await refreshTokenRepository.GetByHashedTokenAsync(hashed, cancellationToken);

        if (existingToken is null || existingToken.IsRevoked)
        {
            return;
        }

        existingToken.RevokedAtUtc = DateTime.UtcNow;
        await refreshTokenRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null)
        {
            return;
        }

        var rawToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        user.ResetPasswordTokenHash = jwtTokenService.HashToken(rawToken);
        user.ResetPasswordTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(30);

        await userRepository.SaveChangesAsync(cancellationToken);

        try
        {
            var resetLink = $"#/reset-password?token={Uri.EscapeDataString(rawToken)}";
            var html = $"""
                <h2>Recuperación de contraseña</h2>
                <p>Hola {user.FullName},</p>
                <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                <p><a href="{resetLink}">{resetLink}</a></p>
                <p>Este enlace expira en 30 minutos.</p>
                <p>Si no solicitaste este cambio, ignora este correo.</p>
                """;
            await emailService.SendAsync(user.Email, "Recuperación de contraseña — HRMS", html, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "No se pudo enviar email de recuperación a {Email}", user.Email);
        }
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        var tokenHash = jwtTokenService.HashToken(request.Token);
        var user = await userRepository.GetByResetPasswordTokenHashAsync(tokenHash, cancellationToken);

        if (user is null || user.ResetPasswordTokenExpiresAtUtc is null || user.ResetPasswordTokenExpiresAtUtc < DateTime.UtcNow)
        {
            return false;
        }

        user.PasswordHash = passwordHasherService.HashPassword(user, request.NewPassword);
        user.ResetPasswordTokenHash = null;
        user.ResetPasswordTokenExpiresAtUtc = null;

        await userRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, Application.DTOs.Auth.ChangePasswordRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        if (!passwordHasherService.VerifyPassword(user, request.CurrentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("La contraseña actual es incorrecta.");
        }

        user.PasswordHash = passwordHasherService.HashPassword(user, request.NewPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;
        user.UpdatedBy = user.UserName;

        await userRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<LoginResponseDto> GenerateTokensAsync(User user, CancellationToken cancellationToken)
    {
        var roles = user.UserRoles.Select(x => x.Role.Name).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var permissions = user.UserRoles
            .SelectMany(x => x.Role.RolePermissions)
            .Select(x => x.Permission.Code)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var (accessToken, accessTokenExpiresAtUtc) = jwtTokenService.GenerateAccessToken(user, roles, permissions);
        var (rawRefreshToken, hashedRefreshToken, refreshExpiresAtUtc) = jwtTokenService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hashedRefreshToken,
            ExpiresAtUtc = refreshExpiresAtUtc,
            CreatedBy = user.UserName,
            UpdatedBy = user.UserName
        };

        await refreshTokenRepository.AddAsync(refreshTokenEntity, cancellationToken);

        return new LoginResponseDto(
            accessToken,
            accessTokenExpiresAtUtc,
            rawRefreshToken,
            refreshExpiresAtUtc,
            user.Id,
            user.UserName,
            user.FullName,
            roles,
            permissions);
    }
}

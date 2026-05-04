namespace Hrms.Application.DTOs.Auth;

public sealed record LoginRequestDto(string UserNameOrEmail, string Password);

namespace Hrms.Application.DTOs.Auth;

public sealed record ResetPasswordRequestDto(string Token, string NewPassword);

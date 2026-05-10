namespace Hrms.Application.DTOs.Onboarding;

public sealed record OnboardingTemplateDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    DateTime CreatedAtUtc,
    IReadOnlyList<OnboardingTemplateTaskDto> Tasks);

public sealed record OnboardingTemplateTaskDto(
    Guid Id,
    string Title,
    string? Description,
    int SortOrder);

public sealed record CreateOnboardingTemplateRequestDto(
    string Name,
    string? Description,
    IReadOnlyList<CreateTemplateTaskItemDto> Tasks);

public sealed record UpdateOnboardingTemplateRequestDto(
    string Name,
    string? Description,
    IReadOnlyList<CreateTemplateTaskItemDto> Tasks);

public sealed record UpdateOnboardingTemplateStatusRequestDto(
    bool IsActive);

public sealed record CreateTemplateTaskItemDto(
    string Title,
    string? Description,
    int SortOrder);

public sealed record OnboardingProcessDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    string EmployeeCode,
    string TemplateName,
    DateTime StartedAtUtc,
    DateTime? CompletedAtUtc,
    bool IsActive,
    int TotalTasks,
    int CompletedTasks,
    double ProgressPercent,
    IReadOnlyList<OnboardingTaskDto> Tasks);

public sealed record OnboardingTaskDto(
    Guid Id,
    string Title,
    string? Description,
    int SortOrder,
    bool IsCompleted,
    DateTime? CompletedAtUtc,
    string? CompletedByUserName);

public sealed record StartOnboardingRequestDto(
    Guid EmployeeId,
    Guid TemplateId);

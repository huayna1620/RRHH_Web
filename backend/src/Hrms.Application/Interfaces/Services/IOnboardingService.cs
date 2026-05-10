using Hrms.Application.DTOs.Onboarding;

namespace Hrms.Application.Interfaces.Services;

public interface IOnboardingService
{
    Task<IReadOnlyList<OnboardingTemplateDto>> GetTemplatesAsync(CancellationToken cancellationToken = default);
    Task<OnboardingTemplateDto> CreateTemplateAsync(CreateOnboardingTemplateRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<OnboardingTemplateDto?> UpdateTemplateAsync(Guid templateId, UpdateOnboardingTemplateRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<OnboardingTemplateDto?> DuplicateTemplateAsync(Guid templateId, string userName, CancellationToken cancellationToken = default);
    Task<bool> UpdateTemplateStatusAsync(Guid templateId, bool isActive, string userName, CancellationToken cancellationToken = default);
    Task<bool> DeleteTemplateAsync(Guid templateId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OnboardingProcessDto>> GetProcessesAsync(Guid? employeeId, CancellationToken cancellationToken = default);
    Task<OnboardingProcessDto?> GetProcessAsync(Guid processId, CancellationToken cancellationToken = default);
    Task<OnboardingProcessDto> StartProcessAsync(StartOnboardingRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> CompleteTaskAsync(Guid processId, Guid taskId, string userName, CancellationToken cancellationToken = default);
    Task<bool> CompleteProcessAsync(Guid processId, string userName, CancellationToken cancellationToken = default);
    Task<bool> CancelProcessAsync(Guid processId, string userName, CancellationToken cancellationToken = default);
}

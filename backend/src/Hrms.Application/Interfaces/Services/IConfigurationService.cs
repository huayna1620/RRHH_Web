using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Configuration;

namespace Hrms.Application.Interfaces.Services;

public interface IConfigurationService
{
    Task<PagedResultDto<ConfigurationItemDto>> GetBranchesAsync(ConfigurationQueryDto query, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto?> GetBranchByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto> CreateBranchAsync(CreateConfigurationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto?> UpdateBranchAsync(Guid id, UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateBranchStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteBranchAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PagedResultDto<ConfigurationItemDto>> GetContractTypesAsync(ConfigurationQueryDto query, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto?> GetContractTypeByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto> CreateContractTypeAsync(CreateConfigurationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<ConfigurationItemDto?> UpdateContractTypeAsync(Guid id, UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateContractTypeStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteContractTypeAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GeneralSettingDto>> GetGeneralSettingsAsync(GeneralSettingsQueryDto query, CancellationToken cancellationToken = default);
    Task<GeneralSettingDto> UpsertGeneralSettingAsync(string key, UpsertGeneralSettingRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteGeneralSettingAsync(Guid id, CancellationToken cancellationToken = default);
}

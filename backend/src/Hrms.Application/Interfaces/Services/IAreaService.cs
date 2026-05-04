using Hrms.Application.DTOs.Areas;
using Hrms.Application.DTOs.Common;

namespace Hrms.Application.Interfaces.Services;

public interface IAreaService
{
    Task<PagedResultDto<AreaDto>> GetPagedAsync(AreaQueryDto query, CancellationToken cancellationToken = default);
    Task<AreaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AreaDto> CreateAsync(CreateAreaRequestDto request, CancellationToken cancellationToken = default);
    Task<AreaDto?> UpdateAsync(Guid id, UpdateAreaRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}


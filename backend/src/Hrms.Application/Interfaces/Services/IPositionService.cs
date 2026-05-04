using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Positions;

namespace Hrms.Application.Interfaces.Services;

public interface IPositionService
{
    Task<PagedResultDto<PositionDto>> GetPagedAsync(PositionQueryDto query, CancellationToken cancellationToken = default);
    Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PositionDto> CreateAsync(CreatePositionRequestDto request, CancellationToken cancellationToken = default);
    Task<PositionDto?> UpdateAsync(Guid id, UpdatePositionRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}


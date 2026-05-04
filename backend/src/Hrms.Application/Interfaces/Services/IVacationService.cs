using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Vacations;

namespace Hrms.Application.Interfaces.Services;

public interface IVacationService
{
    Task<PagedResultDto<VacationListItemDto>> GetPagedAsync(VacationQueryDto query, CancellationToken cancellationToken = default);
    Task<VacationCatalogsDto> GetCatalogsAsync(int? year = null, CancellationToken cancellationToken = default);
    Task<VacationListItemDto> CreateAsync(CreateVacationRequestDto request, CancellationToken cancellationToken = default);
    Task<VacationListItemDto> ApproveAsync(Guid vacationRequestId, ApproveVacationRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default);
    Task<VacationListItemDto> RejectAsync(Guid vacationRequestId, RejectVacationRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default);
    Task<VacationListItemDto> CancelAsync(Guid vacationRequestId, Guid userId, string userName, CancellationToken cancellationToken = default);
}

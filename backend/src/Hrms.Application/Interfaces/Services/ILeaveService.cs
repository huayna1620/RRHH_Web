using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Leaves;

namespace Hrms.Application.Interfaces.Services;

public interface ILeaveService
{
    Task<PagedResultDto<LeaveListItemDto>> GetPagedAsync(LeaveQueryDto query, CancellationToken cancellationToken = default);
    Task<LeaveCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default);
    Task<LeaveListItemDto> CreateAsync(CreateLeaveRequestDto request, CancellationToken cancellationToken = default);
    Task<LeaveListItemDto> ApproveAsync(Guid leaveRequestId, ApproveLeaveRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default);
    Task<LeaveListItemDto> RejectAsync(Guid leaveRequestId, RejectLeaveRequestDto request, Guid reviewerUserId, string reviewerUserName, CancellationToken cancellationToken = default);
    Task<LeaveListItemDto> CancelAsync(Guid leaveRequestId, Guid userId, string userName, CancellationToken cancellationToken = default);
}

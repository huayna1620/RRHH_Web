using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Recruitment;

namespace Hrms.Application.Interfaces.Services;

public interface IRecruitmentService
{
    Task<PagedResultDto<RecruitmentCandidateListItemDto>> GetPagedAsync(RecruitmentQueryDto query, CancellationToken cancellationToken = default);
    Task<RecruitmentCandidateDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<RecruitmentCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default);
    Task<RecruitmentCandidateDetailDto> CreateAsync(CreateRecruitmentCandidateRequestDto request, string createdBy, CancellationToken cancellationToken = default);
    Task<RecruitmentCandidateDetailDto?> UpdateAsync(Guid id, UpdateRecruitmentCandidateRequestDto request, string updatedBy, CancellationToken cancellationToken = default);
    Task<RecruitmentCandidateDetailDto?> UpdateStatusAsync(Guid id, UpdateRecruitmentStatusRequestDto request, string changedBy, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CandidateStatusHistoryDto>> GetStatusHistoryAsync(Guid candidateId, CancellationToken cancellationToken = default);
    Task<ConvertToEmployeeResultDto> ConvertToEmployeeAsync(Guid candidateId, ConvertToEmployeeRequestDto request, string convertedBy, CancellationToken cancellationToken = default);
}

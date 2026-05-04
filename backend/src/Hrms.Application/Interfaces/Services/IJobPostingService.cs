using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.JobPostings;

namespace Hrms.Application.Interfaces.Services;

public interface IJobPostingService
{
    Task<PagedResultDto<JobPostingDto>> GetPagedAsync(JobPostingQueryDto query, CancellationToken cancellationToken = default);
    Task<JobPostingDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JobPostingDto>> GetOpenAsync(CancellationToken cancellationToken = default);
    Task<JobPostingDto> CreateAsync(CreateJobPostingRequestDto request, string createdBy, CancellationToken cancellationToken = default);
    Task<JobPostingDto?> UpdateAsync(Guid id, UpdateJobPostingRequestDto request, string updatedBy, CancellationToken cancellationToken = default);
    Task<bool> CloseAsync(Guid id, string updatedBy, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default);
}

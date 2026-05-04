using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Employees;

namespace Hrms.Application.Interfaces.Services;

public interface IEmployeeService
{
    Task<PagedResultDto<EmployeeListItemDto>> GetPagedAsync(EmployeeQueryDto query, CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto> CreateAsync(CreateEmployeeRequestDto request, CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto?> UpdateAsync(Guid id, UpdateEmployeeRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmployeeCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EmployeeChangeLogDto>> GetChangeLogAsync(Guid employeeId, CancellationToken cancellationToken = default);
}

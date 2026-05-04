using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Payroll;

namespace Hrms.Application.Interfaces.Services;

public interface IPayrollLoanService
{
    Task<PagedResultDto<PayrollLoanDto>> GetPagedAsync(Guid? employeeId, bool? activeOnly, int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    Task<PayrollLoanDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PayrollLoanDto> CreateAsync(CreatePayrollLoanRequestDto request, string createdBy, CancellationToken cancellationToken = default);
    Task<bool> CancelAsync(Guid id, string cancelledBy, CancellationToken cancellationToken = default);
}

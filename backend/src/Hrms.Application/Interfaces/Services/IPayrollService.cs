using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Payroll;

namespace Hrms.Application.Interfaces.Services;

public interface IPayrollService
{
    Task<PagedResultDto<PayrollListItemDto>> GetPagedAsync(PayrollQueryDto query, CancellationToken cancellationToken = default);
    Task<PayrollCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default);
    Task<GeneratePayrollResultDto> GenerateAsync(GeneratePayrollRequestDto request, string generatedBy, CancellationToken cancellationToken = default);
    Task<PayrollListItemDto> UpdateAdjustmentsAsync(Guid payrollRecordId, UpdatePayrollAdjustmentsRequestDto request, string updatedBy, CancellationToken cancellationToken = default);
    Task<PayrollListItemDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> ApproveAsync(int year, int month, string approvedBy, CancellationToken cancellationToken = default);
    Task<int> UnapproveAsync(int year, int month, string updatedBy, CancellationToken cancellationToken = default);
    Task<int> MarkPaidAsync(int year, int month, string paidBy, CancellationToken cancellationToken = default);
    Task<byte[]> GeneratePayslipPdfAsync(Guid payrollRecordId, CancellationToken cancellationToken = default);
    Task<byte[]> GenerateBulkPayslipZipAsync(int year, int month, CancellationToken cancellationToken = default);
}

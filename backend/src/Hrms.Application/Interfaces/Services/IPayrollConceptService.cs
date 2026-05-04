using Hrms.Application.DTOs.Payroll;

namespace Hrms.Application.Interfaces.Services;

public interface IPayrollConceptService
{
    Task<IReadOnlyList<PayrollConceptDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PayrollConceptDto> CreateAsync(CreatePayrollConceptRequestDto request, string createdBy, CancellationToken cancellationToken = default);
    Task<PayrollConceptDto> UpdateAsync(Guid id, UpdatePayrollConceptRequestDto request, string updatedBy, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default);
}

using Hrms.Application.DTOs.Reports;

namespace Hrms.Application.Interfaces.Services;

public interface IReportsService
{
    Task<EmployeesReportDto> GetEmployeesReportAsync(CancellationToken cancellationToken = default);
    Task<AttendanceReportDto> GetAttendanceReportAsync(int? year, int? month, DateOnly? startDate, DateOnly? endDate, CancellationToken cancellationToken = default);
    Task<VacationsReportDto> GetVacationsReportAsync(int? year, CancellationToken cancellationToken = default);
    Task<LeavesReportDto> GetLeavesReportAsync(int? year, CancellationToken cancellationToken = default);
    Task<PayrollReportDto> GetPayrollReportAsync(int? year, int? month, CancellationToken cancellationToken = default);

    // FASE 6
    Task<RotationReportDto> GetRotationReportAsync(int? year, CancellationToken cancellationToken = default);
    Task<AbsenteeismReportDto> GetAbsenteeismReportAsync(int? year, int? month, CancellationToken cancellationToken = default);
    Task<LaborCostReportDto> GetLaborCostReportAsync(int? year, int? month, CancellationToken cancellationToken = default);
    Task<EmployeeDetailReportDto?> GetEmployeeDetailReportAsync(Guid employeeId, CancellationToken cancellationToken = default);
}

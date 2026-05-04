using Hrms.Application.DTOs.Reports;

namespace Hrms.Application.Interfaces.Services;

public interface IExcelExportService
{
    byte[] ExportEmployeesReport(EmployeesReportDto report);
    byte[] ExportAttendanceReport(AttendanceReportDto report);
    byte[] ExportVacationsReport(VacationsReportDto report);
    byte[] ExportLeavesReport(LeavesReportDto report);
    byte[] ExportPayrollReport(PayrollReportDto report);
    byte[] ExportRotationReport(RotationReportDto report);
    byte[] ExportAbsenteeismReport(AbsenteeismReportDto report);
    byte[] ExportLaborCostReport(LaborCostReportDto report);
}

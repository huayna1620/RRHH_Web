using Hrms.Application.DTOs.Reports;

namespace Hrms.Application.Interfaces.Services;

public interface IEmployeePdfService
{
    byte[] GenerateEmployeeDetailPdf(EmployeeDetailReportDto report);
}

namespace Hrms.Application.DTOs.Reports;

public sealed record PayrollTopNetItemDto(
    Guid EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    decimal NetPay);

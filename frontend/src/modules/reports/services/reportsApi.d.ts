import type { AbsenteeismReport, AttendanceReport, EmployeesReport, LaborCostReport, LeavesReport, PayrollReport, RotationReport, VacationsReport } from "@/modules/reports/types/reports.types";
export declare function getEmployeesReport(): Promise<EmployeesReport>;
export declare function getAttendanceReport(year: number, month: number, options: {
    startDate: string;
    endDate: string;
}): Promise<AttendanceReport>;
export declare function getVacationsReport(year: number): Promise<VacationsReport>;
export declare function getLeavesReport(year: number): Promise<LeavesReport>;
export declare function getPayrollReport(year: number, month: number): Promise<PayrollReport>;
export declare function getRotationReport(year: number): Promise<RotationReport>;
export declare function getAbsenteeismReport(year: number, month: number): Promise<AbsenteeismReport>;
export declare function getLaborCostReport(year: number, month: number): Promise<LaborCostReport>;
export declare function downloadExcel(path: string, filename: string): void;
export declare function downloadEmployeePdf(employeeId: string): void;

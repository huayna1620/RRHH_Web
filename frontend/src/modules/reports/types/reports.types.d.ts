export type EmployeeAreaReportItem = {
    areaId: string;
    areaName: string;
    totalEmployees: number;
    activeEmployees: number;
};
export type EmployeesReport = {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    byArea: EmployeeAreaReportItem[];
};
export type AttendanceDailyReportItem = {
    date: string;
    totalRecords: number;
    presentRecords: number;
    absentRecords: number;
    lateRecords: number;
};
export type AttendanceReport = {
    year: number;
    month: number;
    totalRecords: number;
    presentRecords: number;
    absentRecords: number;
    lateRecords: number;
    averageLateMinutes: number;
    daily: AttendanceDailyReportItem[];
};
export type VacationStatusReportItem = {
    status: string;
    requests: number;
    requestedDays: number;
};
export type VacationsReport = {
    year: number;
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    totalRequestedDays: number;
    approvedDays: number;
    byStatus: VacationStatusReportItem[];
};
export type LeaveTypeReportItem = {
    leaveType: string;
    requests: number;
    requestedDays: number;
};
export type LeavesReport = {
    year: number;
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    paidRequests: number;
    unpaidRequests: number;
    byType: LeaveTypeReportItem[];
};
export type PayrollTopNetItem = {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    netPay: number;
};
export type PayrollReport = {
    year: number;
    month: number;
    recordsCount: number;
    totalBaseSalary: number;
    totalBonuses: number;
    totalDeductions: number;
    totalNetPay: number;
    averageNetPay: number;
    topNetPays: PayrollTopNetItem[];
};
export type RotationAreaItem = {
    areaId: string;
    areaName: string;
    hiredCount: number;
    inactivatedCount: number;
};
export type RotationReport = {
    year: number;
    totalActiveAtStart: number;
    hiredCount: number;
    inactivatedCount: number;
    turnoverRate: number;
    byArea: RotationAreaItem[];
};
export type AbsenteeismAreaItem = {
    areaId: string;
    areaName: string;
    employeeCount: number;
    absenceDays: number;
    absenteeismRate: number;
};
export type AbsenteeismReport = {
    year: number;
    month: number;
    totalEmployees: number;
    totalAbsenceDays: number;
    absenteeismRate: number;
    byArea: AbsenteeismAreaItem[];
};
export type LaborCostAreaItem = {
    areaId: string;
    areaName: string;
    employeeCount: number;
    totalBaseSalary: number;
    totalBonuses: number;
    totalDeductions: number;
    totalNetPay: number;
};
export type LaborCostReport = {
    year: number;
    month: number;
    recordCount: number;
    totalBaseSalary: number;
    totalBonuses: number;
    totalDeductions: number;
    totalGrossIncome: number;
    totalNetPay: number;
    averageNetPay: number;
    byArea: LaborCostAreaItem[];
};

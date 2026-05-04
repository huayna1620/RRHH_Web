export type AccountProfile = {
    id: string;
    userName: string;
    fullName: string;
    email: string;
    roles: string[];
    employeeId: string | null;
    employeeName: string | null;
    employeeCode: string | null;
    lastLoginAtUtc: string | null;
};
export declare function getMyProfile(): Promise<AccountProfile>;
export declare function updateMyProfile(payload: {
    fullName: string;
}): Promise<AccountProfile>;
export type UpcomingEvent = {
    type: string;
    title: string;
    date: string;
};
export type EmployeeDashboard = {
    employeeCode: string;
    fullName: string;
    areaName: string;
    positionName: string;
    hireDate: string;
    attendanceDaysPresent: number;
    attendanceDaysAbsent: number;
    attendanceDaysLate: number;
    vacationDaysAvailable: number;
    vacationDaysUsed: number;
    vacationDaysPending: number;
    leaveRequestsTotal: number;
    leaveRequestsApproved: number;
    leaveRequestsPending: number;
    lastNetPay: number | null;
    lastPayrollYear: number | null;
    lastPayrollMonth: number | null;
    upcomingEvents: UpcomingEvent[];
};
export type CalendarEvent = {
    type: string;
    title: string;
    startDate: string;
    endDate: string;
    status: string | null;
    employeeName: string | null;
};
export declare function getEmployeeDashboard(): Promise<EmployeeDashboard | null>;
export declare function getCalendarEvents(year: number, month: number): Promise<CalendarEvent[]>;

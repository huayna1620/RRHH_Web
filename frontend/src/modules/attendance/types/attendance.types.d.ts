export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type AttendanceItem = {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    area: string;
    attendanceDate: string;
    checkInAtUtc: string | null;
    checkOutAtUtc: string | null;
    lateMinutes: number;
    isAbsent: boolean;
    justification: string | null;
    isJustified: boolean;
};
export type AttendanceQuery = {
    viewMode: "daily" | "weekly" | "monthly";
    referenceDate: string;
    startDateFrom: string;
    startDateTo: string;
    search: string;
    employeeId: string;
    areaId: string;
    isLate: boolean;
    isAbsent: boolean;
    pageNumber: number;
    pageSize: number;
};
export type AttendanceEmployeeOption = {
    id: string;
    label: string;
    employeeCode: string;
    documentNumber: string | null;
    fullName: string;
    areaId: string;
    area: string;
    position: string;
    shiftName: string;
    expectedSchedule: string;
};
export type AttendanceCatalogs = {
    employees: AttendanceEmployeeOption[];
    areas: Array<{
        id: string;
        name: string;
    }>;
    schedule: {
        timeZoneId: string;
        shiftName: string;
        expectedStart: string;
        expectedEnd: string;
    };
};
export type AttendanceSummary = {
    onTime: number;
    late: number;
    absent: number;
    justified: number;
    pendingCheckOut: number;
    present: number;
    noRecord: number;
};

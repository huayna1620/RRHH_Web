export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type AttendanceIncident = {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    area: string;
    attendanceRecordId: string;
    incidentType: "tardanza" | "falta" | "salida_anticipada" | "no_marcacion";
    incidentDate: string;
    minutesImpacted: number;
    status: "open" | "justified" | "rejected" | "expired";
    justificationText: string | null;
    justificationSubmittedAtUtc: string | null;
    justificationDeadlineUtc: string | null;
    reviewedByUserName: string | null;
    reviewedAtUtc: string | null;
    reviewerComment: string | null;
    createdAtUtc: string;
};
export type AttendanceIncidentQuery = {
    employeeId: string;
    incidentType: string;
    status: string;
    fromDate: string;
    toDate: string;
    search: string;
    pageNumber: number;
    pageSize: number;
};
export type AttendanceIncidentStats = {
    total: number;
    open: number;
    justified: number;
    rejected: number;
    expired: number;
    openPendingReview: number;
    openAwaitingJustification: number;
};
export type AttendanceIncidentSummary = {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    openCount: number;
    justifiedCount: number;
    rejectedCount: number;
    expiredCount: number;
    totalTardanzaMinutes: number;
    totalSalidaAnticipadaMinutes: number;
    totalFaltas: number;
    totalNoMarcaciones: number;
};

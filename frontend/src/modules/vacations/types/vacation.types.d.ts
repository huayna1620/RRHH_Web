export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type VacationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type VacationItem = {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    area: string;
    startDate: string;
    endDate: string;
    requestedDays: number;
    status: VacationStatus;
    reason: string | null;
    reviewerComment: string | null;
    requestedAtUtc: string;
    reviewedAtUtc: string | null;
};
export type VacationQuery = {
    search: string;
    employeeId: string;
    status: VacationStatus;
    startDateFrom: string;
    startDateTo: string;
    year: number;
    pageNumber: number;
    pageSize: number;
};
export type VacationEmployeeBalance = {
    id: string;
    label: string;
    annualEntitlementDays: number;
    usedDays: number;
    pendingDays: number;
    availableDays: number;
};
export type VacationCatalogs = {
    employees: VacationEmployeeBalance[];
};

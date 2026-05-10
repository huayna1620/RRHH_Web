export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type OrgItem = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    employeesCount: number;
    description?: string | null;
    responsibleEmployeeId?: string | null;
    responsibleName?: string | null;
    responsiblePosition?: string | null;
    level?: string | null;
    areaId?: string | null;
    areaName?: string | null;
    reportsToEmployeeId?: string | null;
    reportsToName?: string | null;
};
export type OrgQuery = {
    search: string;
    isActive?: boolean;
    pageNumber: number;
    pageSize: number;
    sortBy: string;
    sortDirection: "asc" | "desc";
};
export type OrgPayload = {
    code: string;
    name: string;
    description?: string | null;
    responsibleEmployeeId?: string | null;
    level?: string | null;
    areaId?: string | null;
    reportsToEmployeeId?: string | null;
};
export type OrgModuleType = "areas" | "positions";
export type OrgStructureActivityItem = {
    id: string;
    module: string;
    entityType: string;
    entityName: string;
    action: string;
    userName: string;
    timestamp: string;
};

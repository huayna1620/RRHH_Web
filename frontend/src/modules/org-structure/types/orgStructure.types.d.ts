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
};
export type OrgModuleType = "areas" | "positions";

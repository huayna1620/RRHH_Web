export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type ConfigurationCatalogItem = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    employeesCount: number;
};
export type ConfigurationQuery = {
    search: string;
    isActive: boolean;
    pageNumber: number;
    pageSize: number;
    sortBy: string;
    sortDirection: "asc" | "desc";
};
export type ConfigurationCatalogPayload = {
    code: string;
    name: string;
};
export type GeneralSettingItem = {
    id: string;
    key: string;
    value: string;
    description: string | null;
    isSensitive: boolean;
    updatedAtUtc: string | null;
};
export type GeneralSettingPayload = {
    value: string;
    description: string;
    isSensitive: boolean;
};

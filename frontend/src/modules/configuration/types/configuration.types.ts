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
  branchType?: string | null;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  responsibleName?: string | null;
  responsibleTitle?: string | null;
  capacity?: number | null;
  businessHours?: string | null;
  costCenter?: string | null;
  openedAtUtc?: string | null;
  visibleForAssignments?: boolean;
  requiresApprovalForChanges?: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ConfigurationQuery = {
  search: string;
  isActive: boolean;
  location?: string;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
};

export type ConfigurationCatalogPayload = {
  code: string;
  name: string;
  branchType?: string;
  description?: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  responsibleName?: string;
  responsibleTitle?: string;
  capacity?: number | null;
  businessHours?: string;
  costCenter?: string;
  openedAtUtc?: string | null;
  isActive?: boolean;
  visibleForAssignments?: boolean;
  requiresApprovalForChanges?: boolean;
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

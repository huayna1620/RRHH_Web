export type PagedResult<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type AuditLogItem = {
  id: string;
  userId: string | null;
  userName?: string;
  action: string;
  module: string;
  entityId: string;
  entityType: string;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
};

export type AuditLogQuery = {
  search: string;
  module: string;
  action: string;
  userName?: string;
  userId: string;
  from: string;
  to: string;
  pageNumber: number;
  pageSize: number;
};

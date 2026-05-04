import type { AuditLogItem, AuditLogQuery, PagedResult } from "@/modules/audit/types/audit.types";
export declare function getAuditLogs(query: AuditLogQuery): Promise<PagedResult<AuditLogItem>>;

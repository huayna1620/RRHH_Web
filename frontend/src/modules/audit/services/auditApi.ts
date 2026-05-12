import { httpClient } from "@/services/api/httpClient";
import type { AuditLogItem, AuditLogQuery, PagedResult } from "@/modules/audit/types/audit.types";

function toQueryParams(query: AuditLogQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.module) params.set("module", query.module);
  if (query.action) params.set("action", query.action);
  if (query.userName) params.set("userName", query.userName);
  if (query.userId) params.set("userId", query.userId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);

  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));

  return params;
}

export async function getAuditLogs(query: AuditLogQuery): Promise<PagedResult<AuditLogItem>> {
  const { data } = await httpClient.get<PagedResult<AuditLogItem>>(`/api/v1/audit-logs?${toQueryParams(query).toString()}`);
  return data;
}

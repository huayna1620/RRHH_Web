import { httpClient } from "@/services/api/httpClient";
import type {
  CandidateStatusHistory,
  ConvertToEmployeeRequest,
  ConvertToEmployeeResult,
  PagedResult,
  RecruitmentCandidateDetail,
  RecruitmentCandidateListItem,
  RecruitmentCandidatePayload,
  RecruitmentCatalogs,
  RecruitmentQuery,
  RecruitmentStatus
} from "@/modules/recruitment/types/recruitment.types";

function queryToString(query: RecruitmentQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (typeof query.isPotentialHire === "boolean") params.set("isPotentialHire", String(query.isPotentialHire));
  if (typeof query.isActive === "boolean") params.set("isActive", String(query.isActive));
  if (query.jobPostingId) params.set("jobPostingId", query.jobPostingId);
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  return params.toString();
}

export async function getRecruitmentCandidates(query: RecruitmentQuery): Promise<PagedResult<RecruitmentCandidateListItem>> {
  const { data } = await httpClient.get<PagedResult<RecruitmentCandidateListItem>>(`/api/v1/recruitment?${queryToString(query)}`);
  return data;
}

export async function getRecruitmentCandidateById(id: string): Promise<RecruitmentCandidateDetail> {
  const { data } = await httpClient.get<RecruitmentCandidateDetail>(`/api/v1/recruitment/${id}`);
  return data;
}

export async function getRecruitmentCatalogs(): Promise<RecruitmentCatalogs> {
  const { data } = await httpClient.get<RecruitmentCatalogs>("/api/v1/recruitment/catalogs");
  return data;
}

export async function createRecruitmentCandidate(payload: RecruitmentCandidatePayload): Promise<RecruitmentCandidateDetail> {
  const { data } = await httpClient.post<RecruitmentCandidateDetail>("/api/v1/recruitment", payload);
  return data;
}

export async function updateRecruitmentCandidate(id: string, payload: Omit<RecruitmentCandidatePayload, "currentStatus">): Promise<RecruitmentCandidateDetail> {
  const { data } = await httpClient.put<RecruitmentCandidateDetail>(`/api/v1/recruitment/${id}`, payload);
  return data;
}

export async function updateRecruitmentStatus(
  id: string,
  payload: { status: RecruitmentStatus; nextStepDate: string; isPotentialHire: boolean; notes: string; rejectionReason: string }
): Promise<RecruitmentCandidateDetail> {
  const { data } = await httpClient.patch<RecruitmentCandidateDetail>(`/api/v1/recruitment/${id}/status`, payload);
  return data;
}

export async function getRecruitmentStatusHistory(id: string): Promise<CandidateStatusHistory[]> {
  const { data } = await httpClient.get<CandidateStatusHistory[]>(`/api/v1/recruitment/${id}/history`);
  return data;
}

export async function convertCandidateToEmployee(id: string, payload: ConvertToEmployeeRequest): Promise<ConvertToEmployeeResult> {
  const { data } = await httpClient.post<ConvertToEmployeeResult>(`/api/v1/recruitment/${id}/convert-to-employee`, payload);
  return data;
}

export async function deleteRecruitmentCandidate(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/recruitment/${id}`);
}

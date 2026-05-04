import { httpClient } from "@/services/api/httpClient";
import type {
  JobPosting,
  JobPostingPayload,
  PagedResult,
  UpdateJobPostingPayload
} from "@/modules/recruitment/types/recruitment.types";

export async function getJobPostings(params: { search: string; status: string; pageNumber: number; pageSize: number }): Promise<PagedResult<JobPosting>> {
  const p = new URLSearchParams();
  if (params.search) p.set("search", params.search);
  if (params.status) p.set("status", params.status);
  p.set("pageNumber", String(params.pageNumber));
  p.set("pageSize", String(params.pageSize));
  const { data } = await httpClient.get<PagedResult<JobPosting>>(`/api/v1/job-postings?${p.toString()}`);
  return data;
}

export async function getOpenJobPostings(): Promise<JobPosting[]> {
  const { data } = await httpClient.get<JobPosting[]>("/api/v1/job-postings/open");
  return data;
}

export async function createJobPosting(payload: JobPostingPayload): Promise<JobPosting> {
  const { data } = await httpClient.post<JobPosting>("/api/v1/job-postings", payload);
  return data;
}

export async function updateJobPosting(id: string, payload: UpdateJobPostingPayload): Promise<JobPosting> {
  const { data } = await httpClient.put<JobPosting>(`/api/v1/job-postings/${id}`, payload);
  return data;
}

export async function closeJobPosting(id: string): Promise<void> {
  await httpClient.post(`/api/v1/job-postings/${id}/close`);
}

export async function deleteJobPosting(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/job-postings/${id}`);
}

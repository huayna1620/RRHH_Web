import { httpClient } from "@/services/api/httpClient";
export async function getJobPostings(params) {
    const p = new URLSearchParams();
    if (params.search)
        p.set("search", params.search);
    if (params.status)
        p.set("status", params.status);
    p.set("pageNumber", String(params.pageNumber));
    p.set("pageSize", String(params.pageSize));
    const { data } = await httpClient.get(`/api/v1/job-postings?${p.toString()}`);
    return data;
}
export async function getOpenJobPostings() {
    const { data } = await httpClient.get("/api/v1/job-postings/open");
    return data;
}
export async function createJobPosting(payload) {
    const { data } = await httpClient.post("/api/v1/job-postings", payload);
    return data;
}
export async function updateJobPosting(id, payload) {
    const { data } = await httpClient.put(`/api/v1/job-postings/${id}`, payload);
    return data;
}
export async function closeJobPosting(id) {
    await httpClient.post(`/api/v1/job-postings/${id}/close`);
}
export async function deleteJobPosting(id) {
    await httpClient.delete(`/api/v1/job-postings/${id}`);
}

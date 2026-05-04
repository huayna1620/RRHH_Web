import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.search)
        params.set("search", query.search);
    if (query.status)
        params.set("status", query.status);
    if (typeof query.isPotentialHire === "boolean")
        params.set("isPotentialHire", String(query.isPotentialHire));
    if (typeof query.isActive === "boolean")
        params.set("isActive", String(query.isActive));
    if (query.jobPostingId)
        params.set("jobPostingId", query.jobPostingId);
    params.set("pageNumber", String(query.pageNumber));
    params.set("pageSize", String(query.pageSize));
    return params.toString();
}
export async function getRecruitmentCandidates(query) {
    const { data } = await httpClient.get(`/api/v1/recruitment?${queryToString(query)}`);
    return data;
}
export async function getRecruitmentCandidateById(id) {
    const { data } = await httpClient.get(`/api/v1/recruitment/${id}`);
    return data;
}
export async function getRecruitmentCatalogs() {
    const { data } = await httpClient.get("/api/v1/recruitment/catalogs");
    return data;
}
export async function createRecruitmentCandidate(payload) {
    const { data } = await httpClient.post("/api/v1/recruitment", payload);
    return data;
}
export async function updateRecruitmentCandidate(id, payload) {
    const { data } = await httpClient.put(`/api/v1/recruitment/${id}`, payload);
    return data;
}
export async function updateRecruitmentStatus(id, payload) {
    const { data } = await httpClient.patch(`/api/v1/recruitment/${id}/status`, payload);
    return data;
}
export async function getRecruitmentStatusHistory(id) {
    const { data } = await httpClient.get(`/api/v1/recruitment/${id}/history`);
    return data;
}
export async function convertCandidateToEmployee(id, payload) {
    const { data } = await httpClient.post(`/api/v1/recruitment/${id}/convert-to-employee`, payload);
    return data;
}
export async function deleteRecruitmentCandidate(id) {
    await httpClient.delete(`/api/v1/recruitment/${id}`);
}

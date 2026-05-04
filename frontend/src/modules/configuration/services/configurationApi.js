import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.search)
        params.set("search", query.search);
    if (typeof query.isActive === "boolean")
        params.set("isActive", String(query.isActive));
    params.set("pageNumber", String(query.pageNumber));
    params.set("pageSize", String(query.pageSize));
    if (query.sortBy)
        params.set("sortBy", query.sortBy);
    if (query.sortDirection)
        params.set("sortDirection", query.sortDirection);
    return params.toString();
}
// Branches
export async function getBranches(query) {
    const { data } = await httpClient.get(`/api/v1/configuration/branches?${queryToString(query)}`);
    return data;
}
export async function createBranch(payload) {
    const { data } = await httpClient.post("/api/v1/configuration/branches", payload);
    return data;
}
export async function updateBranch(id, payload) {
    const { data } = await httpClient.put(`/api/v1/configuration/branches/${id}`, payload);
    return data;
}
export async function updateBranchStatus(id, isActive) {
    await httpClient.patch(`/api/v1/configuration/branches/${id}/status`, { isActive });
}
export async function deleteBranch(id) {
    await httpClient.delete(`/api/v1/configuration/branches/${id}`);
}
// Contract Types
export async function getContractTypes(query) {
    const { data } = await httpClient.get(`/api/v1/configuration/contract-types?${queryToString(query)}`);
    return data;
}
export async function createContractType(payload) {
    const { data } = await httpClient.post("/api/v1/configuration/contract-types", payload);
    return data;
}
export async function updateContractType(id, payload) {
    const { data } = await httpClient.put(`/api/v1/configuration/contract-types/${id}`, payload);
    return data;
}
export async function updateContractTypeStatus(id, isActive) {
    await httpClient.patch(`/api/v1/configuration/contract-types/${id}/status`, { isActive });
}
export async function deleteContractType(id) {
    await httpClient.delete(`/api/v1/configuration/contract-types/${id}`);
}
// General Settings
export async function getGeneralSettings() {
    const { data } = await httpClient.get("/api/v1/configuration/general-settings");
    return data;
}
export async function upsertGeneralSetting(key, payload) {
    const { data } = await httpClient.put(`/api/v1/configuration/general-settings/${key}`, payload);
    return data;
}
export async function deleteGeneralSetting(id) {
    await httpClient.delete(`/api/v1/configuration/general-settings/${id}`);
}

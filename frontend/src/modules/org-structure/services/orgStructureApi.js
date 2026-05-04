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
// Areas
export async function getAreas(query) {
    const { data } = await httpClient.get(`/api/v1/areas?${queryToString(query)}`);
    return data;
}
export async function createArea(payload) {
    const { data } = await httpClient.post("/api/v1/areas", payload);
    return data;
}
export async function updateArea(id, payload) {
    const { data } = await httpClient.put(`/api/v1/areas/${id}`, payload);
    return data;
}
export async function updateAreaStatus(id, isActive) {
    await httpClient.patch(`/api/v1/areas/${id}/status`, { isActive });
}
export async function deleteArea(id) {
    await httpClient.delete(`/api/v1/areas/${id}`);
}
// Positions
export async function getPositions(query) {
    const { data } = await httpClient.get(`/api/v1/positions?${queryToString(query)}`);
    return data;
}
export async function createPosition(payload) {
    const { data } = await httpClient.post("/api/v1/positions", payload);
    return data;
}
export async function updatePosition(id, payload) {
    const { data } = await httpClient.put(`/api/v1/positions/${id}`, payload);
    return data;
}
export async function updatePositionStatus(id, isActive) {
    await httpClient.patch(`/api/v1/positions/${id}/status`, { isActive });
}
export async function deletePosition(id) {
    await httpClient.delete(`/api/v1/positions/${id}`);
}

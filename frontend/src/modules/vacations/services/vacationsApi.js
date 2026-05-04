import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.search)
        params.set("search", query.search);
    if (query.employeeId)
        params.set("employeeId", query.employeeId);
    if (query.status)
        params.set("status", query.status);
    if (query.startDateFrom)
        params.set("startDateFrom", query.startDateFrom);
    if (query.startDateTo)
        params.set("startDateTo", query.startDateTo);
    if (typeof query.year === "number")
        params.set("year", String(query.year));
    params.set("pageNumber", String(query.pageNumber));
    params.set("pageSize", String(query.pageSize));
    return params.toString();
}
export async function getVacations(query) {
    const { data } = await httpClient.get(`/api/v1/vacations?${queryToString(query)}`);
    return data;
}
export async function getVacationCatalogs(year) {
    const url = year ? `/api/v1/vacations/catalogs?year=${year}` : "/api/v1/vacations/catalogs";
    const { data } = await httpClient.get(url);
    return data;
}
export async function createVacationRequest(payload) {
    const { data } = await httpClient.post("/api/v1/vacations", payload);
    return data;
}
export async function approveVacationRequest(id, comment) {
    const { data } = await httpClient.post(`/api/v1/vacations/${id}/approve`, { comment });
    return data;
}
export async function rejectVacationRequest(id, comment) {
    const { data } = await httpClient.post(`/api/v1/vacations/${id}/reject`, { comment });
    return data;
}
export async function cancelVacationRequest(id) {
    const { data } = await httpClient.post(`/api/v1/vacations/${id}/cancel`);
    return data;
}

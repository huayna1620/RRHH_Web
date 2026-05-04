import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.employeeId)
        params.set("employeeId", query.employeeId);
    if (query.incidentType)
        params.set("incidentType", query.incidentType);
    if (query.status)
        params.set("status", query.status);
    if (query.fromDate)
        params.set("fromDate", query.fromDate);
    if (query.toDate)
        params.set("toDate", query.toDate);
    if (query.search)
        params.set("search", query.search);
    params.set("pageNumber", String(query.pageNumber));
    params.set("pageSize", String(query.pageSize));
    return params.toString();
}
export async function getIncidents(query) {
    const { data } = await httpClient.get(`/api/v1/attendance-incidents?${queryToString(query)}`);
    return data;
}
export async function getIncidentById(id) {
    const { data } = await httpClient.get(`/api/v1/attendance-incidents/${id}`);
    return data;
}
export async function submitJustification(id, justificationText) {
    const { data } = await httpClient.post(`/api/v1/attendance-incidents/${id}/justify`, { justificationText });
    return data;
}
export async function approveIncident(id, reviewerComment) {
    const { data } = await httpClient.post(`/api/v1/attendance-incidents/${id}/approve`, { reviewerComment });
    return data;
}
export async function rejectIncident(id, reviewerComment) {
    const { data } = await httpClient.post(`/api/v1/attendance-incidents/${id}/reject`, { reviewerComment });
    return data;
}
export async function expireOpenIncidents() {
    const { data } = await httpClient.post("/api/v1/attendance-incidents/expire", {});
    return data;
}
export async function getIncidentStats(query) {
    const params = new URLSearchParams();
    if (query.employeeId)
        params.set("employeeId", query.employeeId);
    if (query.incidentType)
        params.set("incidentType", query.incidentType);
    if (query.status)
        params.set("status", query.status);
    if (query.fromDate)
        params.set("fromDate", query.fromDate);
    if (query.toDate)
        params.set("toDate", query.toDate);
    if (query.search)
        params.set("search", query.search);
    const { data } = await httpClient.get(`/api/v1/attendance-incidents/stats?${params.toString()}`);
    return data;
}
export async function getIncidentSummary(fromDate, toDate) {
    const { data } = await httpClient.get(`/api/v1/attendance-incidents/summary?fromDate=${fromDate}&toDate=${toDate}`);
    return data;
}

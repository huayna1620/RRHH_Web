import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.search)
        params.set("search", query.search);
    if (query.employeeId)
        params.set("employeeId", query.employeeId);
    if (query.status)
        params.set("status", query.status);
    if (query.leaveType)
        params.set("leaveType", query.leaveType);
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
export async function getLeaves(query) {
    const { data } = await httpClient.get(`/api/v1/leaves?${queryToString(query)}`);
    return data;
}
export async function getLeaveCatalogs() {
    const { data } = await httpClient.get("/api/v1/leaves/catalogs");
    return data;
}
export async function createLeaveRequest(payload) {
    const { data } = await httpClient.post("/api/v1/leaves", payload);
    return data;
}
export async function approveLeaveRequest(leaveId, comment) {
    const { data } = await httpClient.post(`/api/v1/leaves/${leaveId}/approve`, { comment });
    return data;
}
export async function rejectLeaveRequest(leaveId, comment) {
    const { data } = await httpClient.post(`/api/v1/leaves/${leaveId}/reject`, { comment });
    return data;
}
export async function cancelLeaveRequest(leaveId) {
    const { data } = await httpClient.post(`/api/v1/leaves/${leaveId}/cancel`);
    return data;
}

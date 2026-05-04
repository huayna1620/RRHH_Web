import { httpClient } from "@/services/api/httpClient";
function queryToString(query) {
    const params = new URLSearchParams();
    if (query.search)
        params.set("search", query.search);
    if (query.employeeId)
        params.set("employeeId", query.employeeId);
    if (query.areaId)
        params.set("areaId", query.areaId);
    if (typeof query.year === "number")
        params.set("year", String(query.year));
    if (typeof query.month === "number")
        params.set("month", String(query.month));
    if (query.startDate)
        params.set("startDate", query.startDate);
    if (query.endDate)
        params.set("endDate", query.endDate);
    params.set("pageNumber", String(query.pageNumber));
    params.set("pageSize", String(query.pageSize));
    return params.toString();
}
export async function getPayroll(query) {
    const { data } = await httpClient.get(`/api/v1/payroll?${queryToString(query)}`);
    return data;
}
export async function getPayrollById(id) {
    const { data } = await httpClient.get(`/api/v1/payroll/${id}`);
    return data;
}
export async function getPayrollCatalogs() {
    const { data } = await httpClient.get("/api/v1/payroll/catalogs");
    return data;
}
export async function generatePayroll(payload) {
    const { data } = await httpClient.post("/api/v1/payroll/generate", payload);
    return data;
}
export async function updatePayrollAdjustments(payrollId, payload) {
    const { data } = await httpClient.put(`/api/v1/payroll/${payrollId}/adjustments`, payload);
    return data;
}
export async function approvePayroll(year, month) {
    const { data } = await httpClient.post("/api/v1/payroll/approve", { year, month });
    return data;
}
export async function unapprovePayroll(year, month) {
    const { data } = await httpClient.post("/api/v1/payroll/unapprove", { year, month });
    return data;
}
export async function markPayrollPaid(year, month) {
    const { data } = await httpClient.post("/api/v1/payroll/mark-paid", { year, month });
    return data;
}
export async function downloadPayslip(payrollId) {
    const response = await httpClient.get(`/api/v1/payroll/${payrollId}/payslip`, { responseType: "blob" });
    return response.data;
}
export async function downloadBulkPayslips(year, month) {
    const response = await httpClient.get(`/api/v1/payroll/bulk-payslips?year=${year}&month=${month}`, { responseType: "blob" });
    return response.data;
}
export async function getBankFormats() {
    const { data } = await httpClient.get("/api/v1/payroll/bank-file/formats");
    return data;
}
export async function downloadBankFile(year, month, format) {
    const response = await httpClient.get(`/api/v1/payroll/bank-file?year=${year}&month=${month}&format=${format}`, { responseType: "blob" });
    return response.data;
}
export async function previewBankFile(year, month, format) {
    const { data } = await httpClient.get(`/api/v1/payroll/bank-file?year=${year}&month=${month}&format=${format}&preview=true`);
    return data;
}

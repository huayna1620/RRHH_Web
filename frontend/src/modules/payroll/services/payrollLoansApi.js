import { httpClient } from "@/services/api/httpClient";
export async function getPayrollLoans(params) {
    const p = new URLSearchParams();
    if (params.employeeId)
        p.set("employeeId", params.employeeId);
    if (typeof params.activeOnly === "boolean")
        p.set("activeOnly", String(params.activeOnly));
    p.set("pageNumber", String(params.pageNumber));
    p.set("pageSize", String(params.pageSize));
    const { data } = await httpClient.get(`/api/v1/payroll/loans?${p.toString()}`);
    return data;
}
export async function getPayrollLoanById(id) {
    const { data } = await httpClient.get(`/api/v1/payroll/loans/${id}`);
    return data;
}
export async function createPayrollLoan(payload) {
    const { data } = await httpClient.post("/api/v1/payroll/loans", payload);
    return data;
}
export async function updatePayrollLoan(id, payload) {
    const { data } = await httpClient.put(`/api/v1/payroll/loans/${id}`, payload);
    return data;
}
export async function registerInstallmentPayment(loanId, installmentId) {
    const { data } = await httpClient.post(`/api/v1/payroll/loans/${loanId}/installments/${installmentId}/pay`);
    return data;
}
export async function cancelPayrollLoan(id) {
    await httpClient.post(`/api/v1/payroll/loans/${id}/cancel`);
}

import { httpClient } from "@/services/api/httpClient";
import type { CreatePayrollLoanRequest, UpdatePayrollLoanRequest, PagedResult, PayrollLoan } from "@/modules/payroll/types/payroll.types";

export async function getPayrollLoans(params: {
  employeeId: string;
  activeOnly: boolean;
  pageNumber: number;
  pageSize: number;
}): Promise<PagedResult<PayrollLoan>> {
  const p = new URLSearchParams();
  if (params.employeeId) p.set("employeeId", params.employeeId);
  if (typeof params.activeOnly === "boolean") p.set("activeOnly", String(params.activeOnly));
  p.set("pageNumber", String(params.pageNumber));
  p.set("pageSize", String(params.pageSize));
  const { data } = await httpClient.get<PagedResult<PayrollLoan>>(`/api/v1/payroll/loans?${p.toString()}`);
  return data;
}

export async function getPayrollLoanById(id: string): Promise<PayrollLoan> {
  const { data } = await httpClient.get<PayrollLoan>(`/api/v1/payroll/loans/${id}`);
  return data;
}

export async function createPayrollLoan(payload: CreatePayrollLoanRequest): Promise<PayrollLoan> {
  const { data } = await httpClient.post<PayrollLoan>("/api/v1/payroll/loans", payload);
  return data;
}

export async function updatePayrollLoan(id: string, payload: UpdatePayrollLoanRequest): Promise<PayrollLoan> {
  const { data } = await httpClient.put<PayrollLoan>(`/api/v1/payroll/loans/${id}`, payload);
  return data;
}

export async function registerInstallmentPayment(loanId: string, installmentId: string): Promise<PayrollLoan> {
  const { data } = await httpClient.post<PayrollLoan>(`/api/v1/payroll/loans/${loanId}/installments/${installmentId}/pay`);
  return data;
}

export async function cancelPayrollLoan(id: string): Promise<void> {
  await httpClient.post(`/api/v1/payroll/loans/${id}/cancel`);
}

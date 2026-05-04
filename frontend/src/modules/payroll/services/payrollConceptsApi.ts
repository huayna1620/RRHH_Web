import { httpClient } from "@/services/api/httpClient";
import type { CreatePayrollConceptRequest, PayrollConcept, UpdatePayrollConceptRequest } from "@/modules/payroll/types/payroll.types";

export async function getPayrollConcepts(): Promise<PayrollConcept[]> {
  const { data } = await httpClient.get<PayrollConcept[]>("/api/v1/payroll/concepts");
  return data;
}

export async function createPayrollConcept(payload: CreatePayrollConceptRequest): Promise<PayrollConcept> {
  const { data } = await httpClient.post<PayrollConcept>("/api/v1/payroll/concepts", payload);
  return data;
}

export async function updatePayrollConcept(id: string, payload: UpdatePayrollConceptRequest): Promise<PayrollConcept> {
  const { data } = await httpClient.put<PayrollConcept>(`/api/v1/payroll/concepts/${id}`, payload);
  return data;
}

export async function deletePayrollConcept(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/payroll/concepts/${id}`);
}

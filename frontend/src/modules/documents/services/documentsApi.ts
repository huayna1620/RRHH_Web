import { httpClient } from "@/services/api/httpClient";
import type {
  DocumentTemplate,
  CreateTemplatePayload,
  EmployeeDocument,
  CreateDocumentPayload
} from "@/modules/documents/types/documents.types";

const BASE = "/api/v1/documents";

// Templates
export async function getDocumentTemplates(): Promise<DocumentTemplate[]> {
  const { data } = await httpClient.get<DocumentTemplate[]>(`${BASE}/templates`);
  return data;
}

export async function createDocumentTemplate(payload: CreateTemplatePayload): Promise<DocumentTemplate> {
  const { data } = await httpClient.post<DocumentTemplate>(`${BASE}/templates`, payload);
  return data;
}

export async function deleteDocumentTemplate(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/templates/${id}`);
}

// Documents
export async function getDocuments(employeeId: string, status: string): Promise<EmployeeDocument[]> {
  const params: Record<string, string> = {};
  if (employeeId) params.employeeId = employeeId;
  if (status) params.status = status;
  const { data } = await httpClient.get<EmployeeDocument[]>(BASE, { params });
  return data;
}

export async function getDocument(id: string): Promise<EmployeeDocument> {
  const { data } = await httpClient.get<EmployeeDocument>(`${BASE}/${id}`);
  return data;
}

export async function createDocument(payload: CreateDocumentPayload): Promise<EmployeeDocument> {
  const { data } = await httpClient.post<EmployeeDocument>(BASE, payload);
  return data;
}

export async function sendForSignature(id: string): Promise<void> {
  await httpClient.post(`${BASE}/${id}/send`);
}

export async function signDocument(id: string): Promise<void> {
  await httpClient.post(`${BASE}/${id}/sign`);
}

export async function rejectDocument(id: string, reason: string): Promise<void> {
  await httpClient.post(`${BASE}/${id}/reject`, { reason });
}

export async function getMyDocuments(): Promise<EmployeeDocument[]> {
  const { data } = await httpClient.get<EmployeeDocument[]>(`${BASE}/my`);
  return data;
}

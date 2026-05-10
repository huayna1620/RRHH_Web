import { httpClient } from "@/services/api/httpClient";
import type {
  CreateTemplatePayload,
  OnboardingProcess,
  OnboardingTemplate,
  StartProcessPayload,
  UpdateTemplatePayload,
} from "@/modules/onboarding/types/onboarding.types";

const BASE = "/api/v1/onboarding";

export async function getOnboardingTemplates(): Promise<OnboardingTemplate[]> {
  const { data } = await httpClient.get<OnboardingTemplate[]>(`${BASE}/templates`);
  return data;
}

export async function createOnboardingTemplate(payload: CreateTemplatePayload): Promise<OnboardingTemplate> {
  const { data } = await httpClient.post<OnboardingTemplate>(`${BASE}/templates`, payload);
  return data;
}

export async function deleteOnboardingTemplate(id: string): Promise<void> {
  await httpClient.delete(`${BASE}/templates/${id}`);
}

export async function updateOnboardingTemplate(id: string, payload: UpdateTemplatePayload): Promise<OnboardingTemplate> {
  const { data } = await httpClient.put<OnboardingTemplate>(`${BASE}/templates/${id}`, payload);
  return data;
}

export async function duplicateOnboardingTemplate(id: string): Promise<OnboardingTemplate> {
  const { data } = await httpClient.post<OnboardingTemplate>(`${BASE}/templates/${id}/duplicate`);
  return data;
}

export async function updateOnboardingTemplateStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`${BASE}/templates/${id}/status`, { isActive });
}

export async function getOnboardingProcesses(employeeId?: string): Promise<OnboardingProcess[]> {
  const url = employeeId ? `${BASE}/processes?employeeId=${employeeId}` : `${BASE}/processes`;
  const { data } = await httpClient.get<OnboardingProcess[]>(url);
  return data;
}

export async function getOnboardingProcess(id: string): Promise<OnboardingProcess> {
  const { data } = await httpClient.get<OnboardingProcess>(`${BASE}/processes/${id}`);
  return data;
}

export async function startOnboardingProcess(payload: StartProcessPayload): Promise<OnboardingProcess> {
  const { data } = await httpClient.post<OnboardingProcess>(`${BASE}/processes`, payload);
  return data;
}

export async function completeOnboardingTask(processId: string, taskId: string): Promise<void> {
  await httpClient.post(`${BASE}/processes/${processId}/tasks/${taskId}/complete`);
}

export async function completeOnboardingProcess(processId: string): Promise<void> {
  await httpClient.post(`${BASE}/processes/${processId}/complete`);
}

export async function cancelOnboardingProcess(processId: string): Promise<void> {
  await httpClient.post(`${BASE}/processes/${processId}/cancel`);
}

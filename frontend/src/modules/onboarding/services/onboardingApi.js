import { httpClient } from "@/services/api/httpClient";
const BASE = "/api/v1/onboarding";
export async function getOnboardingTemplates() {
    const { data } = await httpClient.get(`${BASE}/templates`);
    return data;
}
export async function createOnboardingTemplate(payload) {
    const { data } = await httpClient.post(`${BASE}/templates`, payload);
    return data;
}
export async function deleteOnboardingTemplate(id) {
    await httpClient.delete(`${BASE}/templates/${id}`);
}
export async function getOnboardingProcesses(employeeId) {
    const url = employeeId ? `${BASE}/processes?employeeId=${employeeId}` : `${BASE}/processes`;
    const { data } = await httpClient.get(url);
    return data;
}
export async function getOnboardingProcess(id) {
    const { data } = await httpClient.get(`${BASE}/processes/${id}`);
    return data;
}
export async function startOnboardingProcess(payload) {
    const { data } = await httpClient.post(`${BASE}/processes`, payload);
    return data;
}
export async function completeOnboardingTask(processId, taskId) {
    await httpClient.post(`${BASE}/processes/${processId}/tasks/${taskId}/complete`);
}

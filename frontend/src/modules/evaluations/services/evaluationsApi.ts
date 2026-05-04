import { httpClient } from "@/services/api/httpClient";
import type {
  EvaluationCycle,
  CreateCyclePayload,
  EvaluationAssignment,
  CreateAssignmentPayload,
  SubmitSelfEvaluationPayload,
  SubmitEvaluatorEvaluationPayload,
  FinalizeEvaluationPayload
} from "@/modules/evaluations/types/evaluations.types";

const BASE = "/api/v1/evaluations";

// Cycles
export async function getCycles(): Promise<EvaluationCycle[]> {
  const { data } = await httpClient.get<EvaluationCycle[]>(`${BASE}/cycles`);
  return data;
}

export async function createCycle(payload: CreateCyclePayload): Promise<EvaluationCycle> {
  const { data } = await httpClient.post<EvaluationCycle>(`${BASE}/cycles`, payload);
  return data;
}

export async function activateCycle(id: string): Promise<void> {
  await httpClient.post(`${BASE}/cycles/${id}/activate`);
}

export async function closeCycle(id: string): Promise<void> {
  await httpClient.post(`${BASE}/cycles/${id}/close`);
}

// Assignments
export async function getAssignments(cycleId: string, employeeId: string): Promise<EvaluationAssignment[]> {
  const params: Record<string, string> = {};
  if (cycleId) params.cycleId = cycleId;
  if (employeeId) params.employeeId = employeeId;
  const { data } = await httpClient.get<EvaluationAssignment[]>(`${BASE}/assignments`, { params });
  return data;
}

export async function createAssignment(payload: CreateAssignmentPayload): Promise<EvaluationAssignment> {
  const { data } = await httpClient.post<EvaluationAssignment>(`${BASE}/assignments`, payload);
  return data;
}

export async function submitSelfEvaluation(id: string, payload: SubmitSelfEvaluationPayload): Promise<EvaluationAssignment> {
  const { data } = await httpClient.post<EvaluationAssignment>(`${BASE}/assignments/${id}/self`, payload);
  return data;
}

export async function submitEvaluatorEvaluation(id: string, payload: SubmitEvaluatorEvaluationPayload): Promise<EvaluationAssignment> {
  const { data } = await httpClient.post<EvaluationAssignment>(`${BASE}/assignments/${id}/evaluator`, payload);
  return data;
}

export async function finalizeEvaluation(id: string, payload: FinalizeEvaluationPayload): Promise<EvaluationAssignment> {
  const { data } = await httpClient.post<EvaluationAssignment>(`${BASE}/assignments/${id}/finalize`, payload);
  return data;
}

export async function getMyEvaluations(): Promise<EvaluationAssignment[]> {
  const { data } = await httpClient.get<EvaluationAssignment[]>(`${BASE}/my`);
  return data;
}

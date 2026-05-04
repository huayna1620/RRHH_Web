export interface EvaluationCycle {
    id: string;
    name: string;
    period: string;
    year: number;
    startDate: string;
    endDate: string;
    status: "draft" | "active" | "closed";
    totalAssignments: number;
    finalizedAssignments: number;
}
export interface CreateCyclePayload {
    name: string;
    period: string;
    year: number;
    startDate: string;
    endDate: string;
}
export interface EvaluationAssignment {
    id: string;
    cycleId: string;
    cycleName: string;
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    evaluatorEmployeeId: string | null;
    evaluatorName: string | null;
    selfScore: number | null;
    selfComments: string | null;
    selfCompletedAtUtc: string | null;
    evaluatorScore: number | null;
    evaluatorComments: string | null;
    evaluatorCompletedAtUtc: string | null;
    finalScore: number | null;
    finalComments: string | null;
    status: string;
}
export interface CreateAssignmentPayload {
    cycleId: string;
    employeeId: string;
    evaluatorEmployeeId: string | null;
}
export interface SubmitSelfEvaluationPayload {
    score: number;
    comments: string;
}
export interface SubmitEvaluatorEvaluationPayload {
    score: number;
    comments: string;
}
export interface FinalizeEvaluationPayload {
    finalScore: number;
    finalComments: string;
}

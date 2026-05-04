import type { CreatePayrollConceptRequest, PayrollConcept, UpdatePayrollConceptRequest } from "@/modules/payroll/types/payroll.types";
export declare function getPayrollConcepts(): Promise<PayrollConcept[]>;
export declare function createPayrollConcept(payload: CreatePayrollConceptRequest): Promise<PayrollConcept>;
export declare function updatePayrollConcept(id: string, payload: UpdatePayrollConceptRequest): Promise<PayrollConcept>;
export declare function deletePayrollConcept(id: string): Promise<void>;

import type { CreateTemplatePayload, OnboardingProcess, OnboardingTemplate, StartProcessPayload } from "@/modules/onboarding/types/onboarding.types";
export declare function getOnboardingTemplates(): Promise<OnboardingTemplate[]>;
export declare function createOnboardingTemplate(payload: CreateTemplatePayload): Promise<OnboardingTemplate>;
export declare function deleteOnboardingTemplate(id: string): Promise<void>;
export declare function getOnboardingProcesses(employeeId?: string): Promise<OnboardingProcess[]>;
export declare function getOnboardingProcess(id: string): Promise<OnboardingProcess>;
export declare function startOnboardingProcess(payload: StartProcessPayload): Promise<OnboardingProcess>;
export declare function completeOnboardingTask(processId: string, taskId: string): Promise<void>;

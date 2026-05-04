export interface OnboardingTemplateTask {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  tasks: OnboardingTemplateTask[];
}

export interface CreateTemplateTaskPayload {
  title: string;
  description: string;
  sortOrder: number;
}

export interface CreateTemplatePayload {
  name: string;
  description: string;
  tasks: CreateTemplateTaskPayload[];
}

export interface OnboardingTaskItem {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isCompleted: boolean;
  completedAtUtc: string | null;
  completedByUserName: string | null;
}

export interface OnboardingProcess {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  templateName: string;
  startedAtUtc: string;
  completedAtUtc: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  tasks: OnboardingTaskItem[];
}

export interface StartProcessPayload {
  employeeId: string;
  templateId: string;
}

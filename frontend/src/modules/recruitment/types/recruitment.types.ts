export type PagedResult<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type RecruitmentStatus = "new" | "screening" | "interview" | "offered" | "hired" | "rejected";

export type RecruitmentCandidateListItem = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  positionApplied: string;
  expectedSalary: number | null;
  source: string | null;
  currentStatus: RecruitmentStatus;
  isPotentialHire: boolean;
  applicationDate: string;
  nextStepDate: string | null;
  isActive: boolean;
  jobPostingId: string | null;
  jobPostingTitle: string | null;
  convertedToEmployee: boolean;
};

export type RecruitmentCandidateDetail = RecruitmentCandidateListItem & {
  notes: string | null;
  lastStatusChangeAtUtc: string | null;
  rejectionReason: string | null;
  convertedEmployeeId: string | null;
};

export type RecruitmentQuery = {
  search: string;
  status: RecruitmentStatus;
  isPotentialHire: boolean;
  isActive: boolean;
  jobPostingId: string;
  pageNumber: number;
  pageSize: number;
};

export type RecruitmentStatusOption = {
  code: RecruitmentStatus;
  name: string;
};

export type RecruitmentCatalogs = {
  statuses: RecruitmentStatusOption[];
};

export type RecruitmentCandidatePayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  positionApplied: string;
  expectedSalary: number;
  source: string;
  currentStatus: RecruitmentStatus;
  isPotentialHire: boolean;
  applicationDate: string;
  nextStepDate: string;
  notes: string;
  jobPostingId: string;
};

export type CandidateStatusHistory = {
  id: string;
  fromStatus: RecruitmentStatus;
  toStatus: RecruitmentStatus;
  changedAtUtc: string;
  changedBy: string;
  notes: string | null;
  rejectionReason: string | null;
};

// Job Postings
export type JobPostingStatus = "open" | "paused" | "closed";

export type JobPosting = {
  id: string;
  title: string;
  description: string | null;
  areaName: string | null;
  positionName: string | null;
  status: JobPostingStatus;
  openedDate: string;
  closedDate: string | null;
  requiredCount: number;
  notes: string | null;
  candidateCount: number;
  isActive: boolean;
};

export type JobPostingPayload = {
  title: string;
  description: string;
  areaName: string;
  positionName: string;
  openedDate: string;
  requiredCount: number;
  notes: string;
};

export type UpdateJobPostingPayload = JobPostingPayload & {
  status: JobPostingStatus;
  closedDate: string;
};

export type ConvertToEmployeeRequest = {
  employeeCode: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  hireDate: string;
  baseSalary: number;
  workEmail: string;
  branchId: string;
  areaId: string;
  positionId: string;
  contractTypeId: string;
  managerId: string;
};

export type ConvertToEmployeeResult = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
};

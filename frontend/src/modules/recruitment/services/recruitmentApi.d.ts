import type { CandidateStatusHistory, ConvertToEmployeeRequest, ConvertToEmployeeResult, PagedResult, RecruitmentCandidateDetail, RecruitmentCandidateListItem, RecruitmentCandidatePayload, RecruitmentCatalogs, RecruitmentQuery, RecruitmentStatus } from "@/modules/recruitment/types/recruitment.types";
export declare function getRecruitmentCandidates(query: RecruitmentQuery): Promise<PagedResult<RecruitmentCandidateListItem>>;
export declare function getRecruitmentCandidateById(id: string): Promise<RecruitmentCandidateDetail>;
export declare function getRecruitmentCatalogs(): Promise<RecruitmentCatalogs>;
export declare function createRecruitmentCandidate(payload: RecruitmentCandidatePayload): Promise<RecruitmentCandidateDetail>;
export declare function updateRecruitmentCandidate(id: string, payload: Omit<RecruitmentCandidatePayload, "currentStatus">): Promise<RecruitmentCandidateDetail>;
export declare function updateRecruitmentStatus(id: string, payload: {
    status: RecruitmentStatus;
    nextStepDate: string;
    isPotentialHire: boolean;
    notes: string;
    rejectionReason: string;
}): Promise<RecruitmentCandidateDetail>;
export declare function getRecruitmentStatusHistory(id: string): Promise<CandidateStatusHistory[]>;
export declare function convertCandidateToEmployee(id: string, payload: ConvertToEmployeeRequest): Promise<ConvertToEmployeeResult>;
export declare function deleteRecruitmentCandidate(id: string): Promise<void>;

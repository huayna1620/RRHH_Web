import type { JobPosting, JobPostingPayload, PagedResult, UpdateJobPostingPayload } from "@/modules/recruitment/types/recruitment.types";
export declare function getJobPostings(params: {
    search: string;
    status: string;
    pageNumber: number;
    pageSize: number;
}): Promise<PagedResult<JobPosting>>;
export declare function getOpenJobPostings(): Promise<JobPosting[]>;
export declare function createJobPosting(payload: JobPostingPayload): Promise<JobPosting>;
export declare function updateJobPosting(id: string, payload: UpdateJobPostingPayload): Promise<JobPosting>;
export declare function closeJobPosting(id: string): Promise<void>;
export declare function deleteJobPosting(id: string): Promise<void>;

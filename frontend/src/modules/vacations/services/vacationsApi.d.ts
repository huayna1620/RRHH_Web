import type { PagedResult, VacationCatalogs, VacationItem, VacationQuery } from "@/modules/vacations/types/vacation.types";
export declare function getVacations(query: VacationQuery): Promise<PagedResult<VacationItem>>;
export declare function getVacationCatalogs(year?: number): Promise<VacationCatalogs>;
export declare function createVacationRequest(payload: {
    employeeId: string;
    startDate: string;
    endDate: string;
    reason: string;
}): Promise<VacationItem>;
export declare function approveVacationRequest(id: string, comment: string): Promise<VacationItem>;
export declare function rejectVacationRequest(id: string, comment: string): Promise<VacationItem>;
export declare function cancelVacationRequest(id: string): Promise<VacationItem>;

import type { LeaveCatalogs, LeaveItem, LeaveQuery, PagedResult } from "@/modules/leaves/types/leave.types";
export declare function getLeaves(query: LeaveQuery): Promise<PagedResult<LeaveItem>>;
export declare function getLeaveCatalogs(): Promise<LeaveCatalogs>;
export declare function createLeaveRequest(payload: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    isPaid: boolean;
    reason: string;
}): Promise<LeaveItem>;
export declare function approveLeaveRequest(leaveId: string, comment: string): Promise<LeaveItem>;
export declare function rejectLeaveRequest(leaveId: string, comment: string): Promise<LeaveItem>;
export declare function cancelLeaveRequest(leaveId: string): Promise<LeaveItem>;

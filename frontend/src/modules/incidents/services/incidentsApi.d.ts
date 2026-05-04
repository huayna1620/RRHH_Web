import type { AttendanceIncident, AttendanceIncidentQuery, AttendanceIncidentStats, AttendanceIncidentSummary, PagedResult } from "@/modules/incidents/types/incident.types";
export declare function getIncidents(query: AttendanceIncidentQuery): Promise<PagedResult<AttendanceIncident>>;
export declare function getIncidentById(id: string): Promise<AttendanceIncident>;
export declare function submitJustification(id: string, justificationText: string): Promise<AttendanceIncident>;
export declare function approveIncident(id: string, reviewerComment: string): Promise<AttendanceIncident>;
export declare function rejectIncident(id: string, reviewerComment: string): Promise<AttendanceIncident>;
export declare function expireOpenIncidents(): Promise<{
    expiredCount: number;
}>;
export declare function getIncidentStats(query: AttendanceIncidentQuery): Promise<AttendanceIncidentStats>;
export declare function getIncidentSummary(fromDate: string, toDate: string): Promise<AttendanceIncidentSummary[]>;

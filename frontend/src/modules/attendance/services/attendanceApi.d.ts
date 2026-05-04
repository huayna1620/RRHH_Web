import type { AttendanceCatalogs, AttendanceItem, AttendanceQuery, AttendanceSummary, PagedResult } from "@/modules/attendance/types/attendance.types";
export declare function getAttendance(query: AttendanceQuery): Promise<PagedResult<AttendanceItem>>;
export declare function getAttendanceCatalogs(): Promise<AttendanceCatalogs>;
export declare function getAttendanceSummary(query: AttendanceQuery): Promise<AttendanceSummary>;
export declare function checkIn(employeeId: string): Promise<AttendanceItem>;
export declare function checkOut(attendanceId: string): Promise<AttendanceItem>;
export declare function markAbsent(employeeId: string, reason: string): Promise<AttendanceItem>;
export declare function justifyAttendance(attendanceId: string, justification: string): Promise<AttendanceItem>;

export type PagedResult<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType = "personal" | "medical" | "study" | "maternity_paternity" | "other";

export type LeaveItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  area: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  requestedDays: number;
  isPaid: boolean;
  status: LeaveStatus;
  reason: string | null;
  reviewerComment: string | null;
  requestedAtUtc: string;
  reviewedAtUtc: string | null;
};

export type LeaveQuery = {
  search: string;
  employeeId: string;
  status: LeaveStatus;
  leaveType: LeaveType;
  startDateFrom: string;
  startDateTo: string;
  year: number;
  pageNumber: number;
  pageSize: number;
};

export type LeaveTypeOption = {
  code: LeaveType;
  name: string;
};

export type LeaveEmployeeOption = {
  id: string;
  label: string;
};

export type LeaveCatalogs = {
  employees: LeaveEmployeeOption[];
  leaveTypes: LeaveTypeOption[];
};

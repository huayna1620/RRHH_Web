import type { EmployeeCatalogs, EmployeeDetail, EmployeePayload, EmployeeQuery, EmployeeListItem, PagedResult } from "@/modules/employees/types/employee.types";
export declare function getEmployees(query: EmployeeQuery): Promise<PagedResult<EmployeeListItem>>;
export declare function getEmployeeById(id: string): Promise<EmployeeDetail>;
export declare function getEmployeeCatalogs(): Promise<EmployeeCatalogs>;
export declare function createEmployee(payload: EmployeePayload): Promise<EmployeeDetail>;
export declare function updateEmployee(id: string, payload: EmployeePayload): Promise<EmployeeDetail>;
export declare function updateEmployeeStatus(id: string, isActive: boolean): Promise<void>;
export declare function deleteEmployee(id: string): Promise<void>;

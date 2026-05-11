import type { CreatePayrollLoanRequest, UpdatePayrollLoanRequest, PagedResult, PayrollLoan } from "@/modules/payroll/types/payroll.types";
export declare function getPayrollLoans(params: {
    employeeId: string;
    activeOnly: boolean;
    pageNumber: number;
    pageSize: number;
}): Promise<PagedResult<PayrollLoan>>;
export declare function getPayrollLoanById(id: string): Promise<PayrollLoan>;
export declare function createPayrollLoan(payload: CreatePayrollLoanRequest): Promise<PayrollLoan>;
export declare function updatePayrollLoan(id: string, payload: UpdatePayrollLoanRequest): Promise<PayrollLoan>;
export declare function registerInstallmentPayment(loanId: string, installmentId: string): Promise<PayrollLoan>;
export declare function cancelPayrollLoan(id: string): Promise<void>;

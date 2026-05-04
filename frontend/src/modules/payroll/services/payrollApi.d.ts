import type { GeneratePayrollResult, PagedResult, PayrollCatalogs, PayrollItem, PayrollQuery } from "@/modules/payroll/types/payroll.types";
export declare function getPayroll(query: PayrollQuery): Promise<PagedResult<PayrollItem>>;
export declare function getPayrollById(id: string): Promise<PayrollItem>;
export declare function getPayrollCatalogs(): Promise<PayrollCatalogs>;
export declare function generatePayroll(payload: {
    year: number;
    month: number;
    employeeId: string;
    forceRecalculate: boolean;
}): Promise<GeneratePayrollResult>;
export declare function updatePayrollAdjustments(payrollId: string, payload: {
    bonuses: number;
    deductions: number;
    notes: string;
}): Promise<PayrollItem>;
export declare function approvePayroll(year: number, month: number): Promise<{
    approvedCount: number;
}>;
export declare function unapprovePayroll(year: number, month: number): Promise<{
    unapprovedCount: number;
}>;
export declare function markPayrollPaid(year: number, month: number): Promise<{
    paidCount: number;
}>;
export declare function downloadPayslip(payrollId: string): Promise<Blob>;
export declare function downloadBulkPayslips(year: number, month: number): Promise<Blob>;
export type BankFormatDescriptor = {
    code: string;
    displayName: string;
    fileExtension: string;
    description: string;
};
export type BankFilePreview = {
    fileName: string;
    includedCount: number;
    totalAmount: number;
    skipped: {
        employeeId: string;
        employeeCode: string;
        fullName: string;
        reason: string;
    }[];
};
export declare function getBankFormats(): Promise<BankFormatDescriptor[]>;
export declare function downloadBankFile(year: number, month: number, format: string): Promise<Blob>;
export declare function previewBankFile(year: number, month: number, format: string): Promise<BankFilePreview>;

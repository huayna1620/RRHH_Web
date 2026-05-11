export type PagedResult<T> = {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
};
export type PayrollStatus = "draft" | "approved" | "paid";
export type PayrollItem = {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    area: string;
    year: number;
    month: number;
    baseSalary: number;
    bonuses: number;
    automaticBonuses: number;
    deductions: number;
    manualDeductions: number;
    automaticDeductions: number;
    incidentDeductions: number;
    loanDeductions: number;
    grossIncome: number;
    netPay: number;
    status: PayrollStatus;
    notes: string | null;
    generatedAtUtc: string;
    lastCalculatedAtUtc: string | null;
    approvedAtUtc: string | null;
    approvedBy: string | null;
    paidAtUtc: string | null;
    paidBy: string | null;
};
export type PayrollQuery = {
    search: string;
    employeeId: string;
    areaId: string;
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    pageNumber: number;
    pageSize: number;
};
export type PayrollEmployeeOption = {
    id: string;
    label: string;
};
export type PayrollAreaOption = {
    id: string;
    name: string;
};
export type PayrollCatalogs = {
    employees: PayrollEmployeeOption[];
    areas: PayrollAreaOption[];
};
export type GeneratePayrollResult = {
    generatedCount: number;
    updatedCount: number;
    totalProcessed: number;
};
export type ConceptType = "earning" | "deduction";
export type PayrollConcept = {
    id: string;
    code: string;
    name: string;
    type: ConceptType;
    fixedAmount: number | null;
    percentage: number | null;
    isAutomatic: boolean;
    isActive: boolean;
    description: string | null;
};
export type CreatePayrollConceptRequest = {
    code: string;
    name: string;
    type: ConceptType;
    fixedAmount: number | null;
    percentage: number | null;
    isAutomatic: boolean;
    description: string | null;
};
export type UpdatePayrollConceptRequest = {
    name: string;
    type: ConceptType;
    fixedAmount: number | null;
    percentage: number | null;
    isAutomatic: boolean;
    isActive: boolean;
    description: string | null;
};
export type LoanType = "loan" | "advance";
export type PayrollLoanInstallment = {
    id: string;
    installmentNumber: number;
    year: number;
    month: number;
    amount: number;
    isPaid: boolean;
    paidAtUtc: string | null;
};
export type PayrollLoan = {
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    loanType: LoanType;
    totalAmount: number;
    monthlyInstallment: number;
    totalInstallments: number;
    paidInstallments: number;
    remainingInstallments: number;
    remainingAmount: number;
    startDate: string;
    isActive: boolean;
    notes: string | null;
    installments: PayrollLoanInstallment[];
};
export type CreatePayrollLoanRequest = {
    employeeId: string;
    loanType: LoanType;
    totalAmount: number;
    totalInstallments: number;
    startDate: string;
    notes: string;
};
export type UpdatePayrollLoanRequest = {
    loanType: LoanType | null;
    notes: string | null;
};

import type { EmployeeCatalogs, EmployeeDetail, EmployeePayload } from "@/modules/employees/types/employee.types";
type Props = {
    open: boolean;
    mode: "create" | "edit";
    catalogs?: EmployeeCatalogs;
    employee: EmployeeDetail | null;
    loadingEmployee: boolean;
    saving: boolean;
    onClose: () => void;
    onSubmit: (payload: EmployeePayload) => Promise<void>;
};
export declare function ModalFormEmpleado({ open, mode, catalogs, employee, loadingEmployee, saving, onClose, onSubmit }: Props): JSX.Element;
export { ModalFormEmpleado as EmployeeFormModal };

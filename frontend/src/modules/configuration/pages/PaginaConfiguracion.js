import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { createBranch, createContractType, deleteBranch, deleteContractType, getBranches, getContractTypes, getGeneralSettings, updateBranch, updateContractType, upsertGeneralSetting, } from "@/modules/configuration/services/configurationApi";
const defQuery = { search: "", isActive: undefined, pageNumber: 1, pageSize: 50, sortBy: "", sortDirection: "asc" };
const blank = () => ({ name: "", code: "" });
export function PaginaConfiguracion() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("branches");
    const [feedback, setFeedback] = useState(null);
    const [open, setOpen] = useState(false);
    const [isNew, setIsNew] = useState(true);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(blank());
    const [deleteId, setDeleteId] = useState(null);
    const [deleteType, setDeleteType] = useState("branches");
    const [settingKey, setSettingKey] = useState("");
    const [settingValue, setSettingValue] = useState("");
    const [settingDesc, setSettingDesc] = useState("");
    const [settingOpen, setSettingOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => getBranches(defQuery) });
    const contractsQuery = useQuery({ queryKey: ["contract-types"], queryFn: () => getContractTypes(defQuery) });
    const settingsQuery = useQuery({ queryKey: ["general-settings"], queryFn: getGeneralSettings });
    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["branches"] });
        await queryClient.invalidateQueries({ queryKey: ["contract-types"] });
        await queryClient.invalidateQueries({ queryKey: ["general-settings"] });
    };
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const saveMutation = useMutation({
        mutationFn: () => {
            const payload = { name: form.name, code: form.code };
            if (tab === "branches")
                return isNew ? createBranch(payload) : updateBranch(selected.id, payload);
            return isNew ? createContractType(payload) : updateContractType(selected.id, payload);
        },
        onSuccess: async () => { await refresh(); ok("Guardado."); setOpen(false); },
        onError: () => fail("No se pudo guardar."),
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteType === "branches" ? deleteBranch(id) : deleteContractType(id),
        onSuccess: async () => { await refresh(); ok("Eliminado."); setDeleteId(null); },
        onError: () => fail("No se pudo eliminar."),
    });
    const settingMutation = useMutation({
        mutationFn: () => upsertGeneralSetting(settingKey, { value: settingValue, description: settingDesc, isSensitive: false }),
        onSuccess: async () => { await refresh(); ok("Configuración guardada."); setSettingOpen(false); },
        onError: () => fail("No se pudo guardar."),
    });
    function openNew() { setForm(blank()); setIsNew(true); setSelected(null); setOpen(true); }
    function openEdit(item) {
        setForm({ name: item.name, code: item.code ?? "" });
        setIsNew(false);
        setSelected(item);
        setOpen(true);
    }
    function openDeleteItem(id, type) { setDeleteId(id); setDeleteType(type); }
    function openEditSetting(s) {
        setSettingKey(s.key);
        setSettingValue(s.value);
        setSettingDesc(s.description ?? "");
        setEditingSetting(s);
        setSettingOpen(true);
    }
    const branches = branchesQuery.data?.items ?? [];
    const contracts = contractsQuery.data?.items ?? [];
    const settings = settingsQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Configuraci\u00F3n", description: "Gesti\u00F3n de cat\u00E1logos y ajustes del sistema" }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "flex gap-2 border-b", children: ["branches", "contracts", "settings"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`, children: t === "branches" ? "Sedes" : t === "contracts" ? "Tipos de contrato" : "Configuraciones generales" }, t))) }), (tab === "branches" || tab === "contracts") && (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex justify-end", children: _jsxs(Button, { onClick: openNew, children: ["Nuevo ", tab === "branches" ? "sede" : "tipo de contrato"] }) }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [(tab === "branches" ? branches : contracts).map((r) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: r.name }), _jsxs("td", { className: "px-3 py-2 text-slate-500", children: [r.employeesCount, " empleados"] }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: r.isActive ? "success" : "neutral", children: r.isActive ? "Activo" : "Inactivo" }) }), _jsxs("td", { className: "px-3 py-2 flex gap-1", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEdit(r), children: "Editar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => openDeleteItem(r.id, tab), children: "Eliminar" })] })] }, r.id))), (tab === "branches" ? branches : contracts).length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 4, children: "Sin registros" }) })] })] }) })] })), tab === "settings" && (_jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Clave" }), _jsx("th", { className: "px-3 py-2", children: "Valor" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [settings.map((s) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs", children: s.key }), _jsx("td", { className: "px-3 py-2", children: s.value }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: s.description ?? "—" }), _jsx("td", { className: "px-3 py-2", children: _jsx(Button, { size: "sm", variant: "secondary", onClick: () => openEditSetting(s), children: "Editar" }) })] }, s.id))), settings.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 4, children: "Sin configuraciones" }) })] })] }) })), _jsx(Modal, { open: open, title: isNew ? "Nuevo registro" : "Editar registro", onClose: () => setOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "C\u00F3digo" }), _jsx(Input, { value: form.code, onChange: (e) => setForm((f) => ({ ...f, code: e.target.value })) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !form.name || saveMutation.isPending, onClick: () => saveMutation.mutate(), children: "Guardar" })] })] }) }), _jsx(Modal, { open: !!deleteId, title: "Confirmar eliminaci\u00F3n", onClose: () => setDeleteId(null), children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-slate-600", children: "\u00BFEliminar este registro?" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setDeleteId(null), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: deleteMutation.isPending, onClick: () => deleteId && deleteMutation.mutate(deleteId), children: "Eliminar" })] })] }) }), _jsx(Modal, { open: settingOpen, title: "Editar configuraci\u00F3n", onClose: () => setSettingOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Clave" }), _jsx(Input, { value: settingKey, onChange: (e) => setSettingKey(e.target.value), disabled: !!editingSetting })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Valor" }), _jsx(Input, { value: settingValue, onChange: (e) => setSettingValue(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Descripci\u00F3n" }), _jsx(Input, { value: settingDesc, onChange: (e) => setSettingDesc(e.target.value) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setSettingOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !settingKey || settingMutation.isPending, onClick: () => settingMutation.mutate(), children: "Guardar" })] })] }) })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { completeOnboardingTask, createOnboardingTemplate, deleteOnboardingTemplate, getOnboardingProcesses, getOnboardingTemplates, startOnboardingProcess, } from "@/modules/onboarding/services/onboardingApi";
export function PaginaOnboarding() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("processes");
    const [feedback, setFeedback] = useState(null);
    const [createTplOpen, setCreateTplOpen] = useState(false);
    const [startProcessOpen, setStartProcessOpen] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState(null);
    const [tplForm, setTplForm] = useState({ name: "", description: "", tasks: "" });
    const [processForm, setProcessForm] = useState({ employeeId: "", templateId: "" });
    const tplsQuery = useQuery({ queryKey: ["onboarding-templates"], queryFn: getOnboardingTemplates });
    const processesQuery = useQuery({ queryKey: ["onboarding-processes"], queryFn: () => getOnboardingProcesses() });
    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["onboarding-templates"] });
        await queryClient.invalidateQueries({ queryKey: ["onboarding-processes"] });
    };
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createTplMutation = useMutation({
        mutationFn: createOnboardingTemplate,
        onSuccess: async () => { await refresh(); ok("Plantilla creada."); setCreateTplOpen(false); setTplForm({ name: "", description: "", tasks: "" }); },
        onError: () => fail("No se pudo crear la plantilla."),
    });
    const deleteTplMutation = useMutation({
        mutationFn: deleteOnboardingTemplate,
        onSuccess: async () => { await refresh(); ok("Plantilla eliminada."); },
        onError: () => fail("No se pudo eliminar."),
    });
    const startMutation = useMutation({
        mutationFn: startOnboardingProcess,
        onSuccess: async () => { await refresh(); ok("Proceso iniciado."); setStartProcessOpen(false); setProcessForm({ employeeId: "", templateId: "" }); },
        onError: () => fail("No se pudo iniciar el proceso."),
    });
    const completeMutation = useMutation({
        mutationFn: ({ processId, taskId }) => completeOnboardingTask(processId, taskId),
        onSuccess: async () => { await refresh(); ok("Tarea completada."); },
        onError: () => fail("No se pudo completar la tarea."),
    });
    const tpls = tplsQuery.data ?? [];
    const processes = processesQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Onboarding", description: "Gesti\u00F3n de procesos de incorporaci\u00F3n", action: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateTplOpen(true), children: "Nueva plantilla" }), _jsx(Button, { onClick: () => setStartProcessOpen(true), children: "Iniciar proceso" })] }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "flex gap-2 border-b", children: ["processes", "templates"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`, children: t === "processes" ? "Procesos" : "Plantillas" }, t))) }), tab === "processes" && (_jsxs("div", { className: "space-y-4", children: [processes.map((p) => (_jsxs("div", { className: "rounded-lg border bg-white p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-semibold", children: p.employeeName }), _jsxs("div", { className: "text-xs text-slate-500", children: [p.templateName, " \u00B7 ", p.completedTasks, "/", p.totalTasks, " tareas"] })] }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setSelectedProcess(selectedProcess?.id === p.id ? null : p), children: selectedProcess?.id === p.id ? "Ocultar" : "Ver tareas" })] }), selectedProcess?.id === p.id && (_jsx("div", { className: "space-y-1", children: p.tasks?.map((task) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: `w-4 h-4 rounded-full border flex-shrink-0 ${task.isCompleted ? "bg-green-500 border-green-500" : "border-slate-300"}` }), _jsx("span", { className: task.isCompleted ? "line-through text-slate-400" : "", children: task.title }), !task.isCompleted && (_jsx(Button, { size: "sm", variant: "secondary", onClick: () => completeMutation.mutate({ processId: p.id, taskId: task.id }), children: "Completar" }))] }, task.id))) }))] }, p.id))), processes.length === 0 && _jsx("div", { className: "py-8 text-center text-slate-500 text-sm", children: "Sin procesos de onboarding" })] })), tab === "templates" && (_jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Tareas" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [tpls.map((t) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: t.name }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: t.description ?? "—" }), _jsx("td", { className: "px-3 py-2", children: t.tasks?.length ?? 0 }), _jsx("td", { className: "px-3 py-2", children: _jsx(Button, { size: "sm", variant: "danger", onClick: () => deleteTplMutation.mutate(t.id), children: "Eliminar" }) })] }, t.id))), tpls.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 4, children: "Sin plantillas" }) })] })] }) })), _jsx(Modal, { open: createTplOpen, title: "Nueva plantilla de onboarding", onClose: () => setCreateTplOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: tplForm.name, onChange: (e) => setTplForm((f) => ({ ...f, name: e.target.value })) })] }), _jsx(Textarea, { value: tplForm.description, onChange: (e) => setTplForm((f) => ({ ...f, description: e.target.value })), placeholder: "Descripci\u00F3n" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateTplOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !tplForm.name || createTplMutation.isPending, onClick: () => createTplMutation.mutate({ name: tplForm.name, description: tplForm.description, tasks: [] }), children: "Crear" })] })] }) }), _jsx(Modal, { open: startProcessOpen, title: "Iniciar proceso de onboarding", onClose: () => setStartProcessOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "ID del empleado" }), _jsx(Input, { value: processForm.employeeId, onChange: (e) => setProcessForm((f) => ({ ...f, employeeId: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Plantilla" }), _jsxs("select", { className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm", value: processForm.templateId, onChange: (e) => setProcessForm((f) => ({ ...f, templateId: e.target.value })), children: [_jsx("option", { value: "", children: "Seleccionar plantilla" }), tpls.map((t) => _jsx("option", { value: t.id, children: t.name }, t.id))] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setStartProcessOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !processForm.employeeId || !processForm.templateId || startMutation.isPending, onClick: () => startMutation.mutate({ employeeId: processForm.employeeId, templateId: processForm.templateId }), children: "Iniciar" })] })] }) })] }));
}

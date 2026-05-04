import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { createDocument, createDocumentTemplate, deleteDocumentTemplate, getDocumentTemplates, getDocuments, rejectDocument, sendForSignature, signDocument, } from "@/modules/documents/services/documentsApi";
const statusLabels = {
    draft: "Borrador", pending_signature: "Pendiente firma",
    signed: "Firmado", rejected: "Rechazado",
};
export function PaginaDocumentos() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("documents");
    const [statusFilter, setStatusFilter] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [createDocOpen, setCreateDocOpen] = useState(false);
    const [createTplOpen, setCreateTplOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [docForm, setDocForm] = useState({ employeeId: "", templateId: "", title: "", type: "", htmlContent: "" });
    const [tplForm, setTplForm] = useState({ name: "", type: "", htmlContent: "", description: "" });
    const docsQuery = useQuery({ queryKey: ["documents", statusFilter], queryFn: () => getDocuments("", statusFilter) });
    const tplsQuery = useQuery({ queryKey: ["document-templates"], queryFn: getDocumentTemplates });
    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["documents"] });
        await queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    };
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createDocMutation = useMutation({
        mutationFn: createDocument,
        onSuccess: async () => { await refresh(); ok("Documento creado."); setCreateDocOpen(false); setDocForm({ employeeId: "", templateId: "", title: "", type: "", htmlContent: "" }); },
        onError: () => fail("No se pudo crear el documento."),
    });
    const createTplMutation = useMutation({
        mutationFn: createDocumentTemplate,
        onSuccess: async () => { await refresh(); ok("Plantilla creada."); setCreateTplOpen(false); setTplForm({ name: "", type: "", htmlContent: "", description: "" }); },
        onError: () => fail("No se pudo crear la plantilla."),
    });
    const deleteTplMutation = useMutation({
        mutationFn: deleteDocumentTemplate,
        onSuccess: async () => { await refresh(); ok("Plantilla eliminada."); },
        onError: () => fail("No se pudo eliminar."),
    });
    const sendMutation = useMutation({
        mutationFn: (id) => sendForSignature(id),
        onSuccess: async () => { await refresh(); ok("Enviado para firma."); },
        onError: () => fail("No se pudo enviar."),
    });
    const signMutation = useMutation({
        mutationFn: (id) => signDocument(id),
        onSuccess: async () => { await refresh(); ok("Documento firmado."); },
        onError: () => fail("No se pudo firmar."),
    });
    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => rejectDocument(id, reason),
        onSuccess: async () => { await refresh(); ok("Documento rechazado."); setRejectOpen(false); },
        onError: () => fail("No se pudo rechazar."),
    });
    const docs = docsQuery.data ?? [];
    const tpls = tplsQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Documentos", description: "Gesti\u00F3n de documentos de empleados", action: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateTplOpen(true), children: "Nueva plantilla" }), _jsx(Button, { onClick: () => setCreateDocOpen(true), children: "Nuevo documento" })] }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), _jsx("div", { className: "flex gap-2 border-b", children: ["documents", "templates"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`, children: t === "documents" ? "Documentos" : "Plantillas" }, t))) }), tab === "documents" && (_jsxs(_Fragment, { children: [_jsxs(Select, { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-48", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "draft", children: "Borrador" }), _jsx("option", { value: "pending_signature", children: "Pendiente firma" }), _jsx("option", { value: "signed", children: "Firmado" }), _jsx("option", { value: "rejected", children: "Rechazado" })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Empleado" }), _jsx("th", { className: "px-3 py-2", children: "T\u00EDtulo" }), _jsx("th", { className: "px-3 py-2", children: "Tipo" }), _jsx("th", { className: "px-3 py-2", children: "Estado" }), _jsx("th", { className: "px-3 py-2", children: "Fecha" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [docs.map((d) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-semibold", children: d.employeeName }), _jsx("div", { className: "text-xs text-slate-500", children: d.employeeCode })] }), _jsx("td", { className: "px-3 py-2", children: d.title }), _jsx("td", { className: "px-3 py-2 text-xs", children: d.type }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: d.status === "signed" ? "success" : d.status === "rejected" ? "danger" : d.status === "pending_signature" ? "warning" : "neutral", children: statusLabels[d.status] ?? d.status }) }), _jsx("td", { className: "px-3 py-2 text-xs text-slate-500", children: new Date(d.createdAtUtc).toLocaleDateString("es-PE") }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [d.status === "draft" && _jsx(Button, { size: "sm", onClick: () => sendMutation.mutate(d.id), children: "Enviar" }), d.status === "pending_signature" && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "sm", onClick: () => signMutation.mutate(d.id), children: "Firmar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => { setSelectedDoc(d); setRejectReason(""); setRejectOpen(true); }, children: "Rechazar" })] }))] })] }, d.id))), docs.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin documentos" }) })] })] }) })] })), tab === "templates" && (_jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Tipo" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [tpls.map((t) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: t.name }), _jsx("td", { className: "px-3 py-2 text-xs", children: t.type }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: t.description ?? "—" }), _jsx("td", { className: "px-3 py-2", children: t.isActive ? "Sí" : "No" }), _jsx("td", { className: "px-3 py-2", children: _jsx(Button, { size: "sm", variant: "danger", onClick: () => deleteTplMutation.mutate(t.id), children: "Eliminar" }) })] }, t.id))), tpls.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 5, children: "Sin plantillas" }) })] })] }) })), _jsx(Modal, { open: createDocOpen, title: "Nuevo documento", onClose: () => setCreateDocOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "ID de empleado" }), _jsx(Input, { value: docForm.employeeId, onChange: (e) => setDocForm((f) => ({ ...f, employeeId: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "T\u00EDtulo" }), _jsx(Input, { value: docForm.title, onChange: (e) => setDocForm((f) => ({ ...f, title: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Tipo" }), _jsx(Input, { value: docForm.type, onChange: (e) => setDocForm((f) => ({ ...f, type: e.target.value })), placeholder: "ej. contrato, carta" })] }), _jsx(Textarea, { value: docForm.htmlContent, onChange: (e) => setDocForm((f) => ({ ...f, htmlContent: e.target.value })), placeholder: "Contenido HTML del documento", rows: 4 }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateDocOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !docForm.employeeId || !docForm.title || createDocMutation.isPending, onClick: () => createDocMutation.mutate({ ...docForm, templateId: docForm.templateId || null }), children: "Crear" })] })] }) }), _jsx(Modal, { open: createTplOpen, title: "Nueva plantilla", onClose: () => setCreateTplOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre" }), _jsx(Input, { value: tplForm.name, onChange: (e) => setTplForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Tipo" }), _jsx(Input, { value: tplForm.type, onChange: (e) => setTplForm((f) => ({ ...f, type: e.target.value })), placeholder: "ej. contrato" })] }), _jsx(Textarea, { value: tplForm.htmlContent, onChange: (e) => setTplForm((f) => ({ ...f, htmlContent: e.target.value })), placeholder: "Contenido HTML de la plantilla", rows: 4 }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Descripci\u00F3n" }), _jsx(Input, { value: tplForm.description, onChange: (e) => setTplForm((f) => ({ ...f, description: e.target.value })) })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setCreateTplOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !tplForm.name || !tplForm.type || createTplMutation.isPending, onClick: () => createTplMutation.mutate(tplForm), children: "Crear" })] })] }) }), _jsx(Modal, { open: rejectOpen, title: "Rechazar documento", onClose: () => setRejectOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-slate-600", children: selectedDoc?.title }), _jsx(Textarea, { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "Motivo de rechazo" }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setRejectOpen(false), children: "Cancelar" }), _jsx(Button, { variant: "danger", disabled: !rejectReason || rejectMutation.isPending, onClick: () => selectedDoc && rejectMutation.mutate({ id: selectedDoc.id, reason: rejectReason }), children: "Rechazar" })] })] }) })] }));
}

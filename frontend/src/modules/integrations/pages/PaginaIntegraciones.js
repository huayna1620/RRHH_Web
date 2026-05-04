import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { createApiToken, createWebhook, deleteWebhook, getApiTokens, getWebhookEvents, getWebhooks, revokeApiToken, testWebhook, toggleWebhook, } from "@/modules/integrations/services/integrationsApi";
export function PaginaIntegraciones() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState("tokens");
    const [feedback, setFeedback] = useState(null);
    const [newToken, setNewToken] = useState(null);
    const [tokenName, setTokenName] = useState("");
    const [tokenOpen, setTokenOpen] = useState(false);
    const [webhookOpen, setWebhookOpen] = useState(false);
    const [webhookForm, setWebhookForm] = useState({ url: "", description: "", events: "" });
    const tokensQuery = useQuery({ queryKey: ["api-tokens"], queryFn: getApiTokens });
    const webhooksQuery = useQuery({ queryKey: ["webhooks"], queryFn: getWebhooks });
    const eventsQuery = useQuery({ queryKey: ["webhook-events"], queryFn: getWebhookEvents });
    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
        await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    };
    const ok = (msg) => setFeedback({ type: "success", message: msg });
    const fail = (msg) => setFeedback({ type: "error", message: msg });
    const createTokenMutation = useMutation({
        mutationFn: () => createApiToken({ name: tokenName, scopes: [], expirationDays: null, description: "" }),
        onSuccess: async (res) => { await refresh(); setNewToken(res.token); setTokenOpen(false); setTokenName(""); },
        onError: () => fail("No se pudo crear el token."),
    });
    const revokeTokenMutation = useMutation({
        mutationFn: (id) => revokeApiToken(id),
        onSuccess: async () => { await refresh(); ok("Token revocado."); },
        onError: () => fail("No se pudo revocar."),
    });
    const createWebhookMutation = useMutation({
        mutationFn: () => createWebhook({ name: webhookForm.description || webhookForm.url, url: webhookForm.url, description: webhookForm.description, events: webhookForm.events.split(",").map((e) => e.trim()).filter(Boolean), format: "raw" }),
        onSuccess: async () => { await refresh(); ok("Webhook creado."); setWebhookOpen(false); setWebhookForm({ url: "", description: "", events: "" }); },
        onError: () => fail("No se pudo crear el webhook."),
    });
    const deleteWebhookMutation = useMutation({
        mutationFn: (id) => deleteWebhook(id),
        onSuccess: async () => { await refresh(); ok("Webhook eliminado."); },
        onError: () => fail("No se pudo eliminar."),
    });
    const toggleWebhookMutation = useMutation({
        mutationFn: (id) => toggleWebhook(id),
        onSuccess: async () => { await refresh(); ok("Estado actualizado."); },
        onError: () => fail("No se pudo actualizar."),
    });
    const testWebhookMutation = useMutation({
        mutationFn: (id) => testWebhook(id),
        onSuccess: () => ok("Evento de prueba enviado."),
        onError: () => fail("No se pudo enviar el evento."),
    });
    const tokens = tokensQuery.data ?? [];
    const webhooks = webhooksQuery.data ?? [];
    return (_jsxs("section", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Integraciones", description: "Tokens de API y webhooks", action: tab === "tokens"
                    ? _jsx(Button, { onClick: () => setTokenOpen(true), children: "Nuevo token" })
                    : _jsx(Button, { onClick: () => setWebhookOpen(true), children: "Nuevo webhook" }) }), feedback && _jsx(Alert, { variant: feedback.type, message: feedback.message, onClose: () => setFeedback(null) }), newToken && (_jsxs("div", { className: "rounded-md bg-yellow-50 border border-yellow-200 p-4 space-y-2", children: [_jsx("p", { className: "text-sm font-semibold text-yellow-800", children: "Copia este token ahora \u2014 no se mostrar\u00E1 de nuevo:" }), _jsx("code", { className: "block break-all text-xs bg-white border rounded p-2", children: newToken }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => setNewToken(null), children: "Entendido" })] })), _jsx("div", { className: "flex gap-2 border-b", children: ["tokens", "webhooks"].map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`, children: t === "tokens" ? "Tokens de API" : "Webhooks" }, t))) }), tab === "tokens" && (_jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "Nombre" }), _jsx("th", { className: "px-3 py-2", children: "Prefijo" }), _jsx("th", { className: "px-3 py-2", children: "Creado" }), _jsx("th", { className: "px-3 py-2", children: "\u00DAltimo uso" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [tokens.map((t) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-semibold", children: t.name }), _jsxs("td", { className: "px-3 py-2 font-mono text-xs", children: [t.tokenPrefix, "..."] }), _jsx("td", { className: "px-3 py-2 text-xs text-slate-500", children: new Date(t.createdAtUtc).toLocaleDateString("es-PE") }), _jsx("td", { className: "px-3 py-2 text-xs text-slate-500", children: t.lastUsedAtUtc ? new Date(t.lastUsedAtUtc).toLocaleDateString("es-PE") : "Nunca" }), _jsx("td", { className: "px-3 py-2", children: t.isActive ? "Sí" : "No" }), _jsx("td", { className: "px-3 py-2", children: _jsx(Button, { size: "sm", variant: "danger", onClick: () => revokeTokenMutation.mutate(t.id), children: "Revocar" }) })] }, t.id))), tokens.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 6, children: "Sin tokens" }) })] })] }) })), tab === "webhooks" && (_jsx("div", { className: "overflow-auto rounded-lg border bg-white", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "bg-slate-50 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2", children: "URL" }), _jsx("th", { className: "px-3 py-2", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-3 py-2", children: "Eventos" }), _jsx("th", { className: "px-3 py-2", children: "Activo" }), _jsx("th", { className: "px-3 py-2", children: "Acciones" })] }) }), _jsxs("tbody", { children: [webhooks.map((w) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "px-3 py-2 font-mono text-xs max-w-xs truncate", children: w.url }), _jsx("td", { className: "px-3 py-2 text-slate-500", children: w.description ?? "—" }), _jsx("td", { className: "px-3 py-2 text-xs", children: w.events?.join(", ") }), _jsx("td", { className: "px-3 py-2", children: w.isActive ? "Sí" : "No" }), _jsxs("td", { className: "px-3 py-2 flex gap-1 flex-wrap", children: [_jsx(Button, { size: "sm", variant: "secondary", onClick: () => toggleWebhookMutation.mutate(w.id), children: w.isActive ? "Pausar" : "Activar" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => testWebhookMutation.mutate(w.id), children: "Probar" }), _jsx(Button, { size: "sm", variant: "danger", onClick: () => deleteWebhookMutation.mutate(w.id), children: "Eliminar" })] })] }, w.id))), webhooks.length === 0 && _jsx("tr", { children: _jsx("td", { className: "px-3 py-6 text-center text-slate-500", colSpan: 5, children: "Sin webhooks" }) })] })] }) })), _jsx(Modal, { open: tokenOpen, title: "Nuevo token de API", onClose: () => setTokenOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Nombre del token" }), _jsx(Input, { value: tokenName, onChange: (e) => setTokenName(e.target.value), placeholder: "ej. App m\u00F3vil, Integraci\u00F3n ERP" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setTokenOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !tokenName || createTokenMutation.isPending, onClick: () => createTokenMutation.mutate(), children: "Crear" })] })] }) }), _jsx(Modal, { open: webhookOpen, title: "Nuevo webhook", onClose: () => setWebhookOpen(false), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "URL del endpoint" }), _jsx(Input, { value: webhookForm.url, onChange: (e) => setWebhookForm((f) => ({ ...f, url: e.target.value })), placeholder: "https://..." })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Descripci\u00F3n" }), _jsx(Input, { value: webhookForm.description, onChange: (e) => setWebhookForm((f) => ({ ...f, description: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-500", children: "Eventos (separados por coma)" }), _jsx(Textarea, { value: webhookForm.events, onChange: (e) => setWebhookForm((f) => ({ ...f, events: e.target.value })), placeholder: eventsQuery.data?.map((e) => e.eventType).join(", ") ?? "employee.created, payroll.approved, ..." })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "secondary", onClick: () => setWebhookOpen(false), children: "Cancelar" }), _jsx(Button, { disabled: !webhookForm.url || createWebhookMutation.isPending, onClick: () => createWebhookMutation.mutate(), children: "Crear" })] })] }) })] }));
}

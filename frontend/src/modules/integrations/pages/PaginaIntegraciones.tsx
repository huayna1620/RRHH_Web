import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import {
  createApiToken, createWebhook, deleteWebhook, getApiTokens,
  getWebhookEvents, getWebhooks, revokeApiToken, testWebhook, toggleWebhook,
} from "@/modules/integrations/services/integrationsApi";

type Tab = "tokens" | "webhooks";

export function PaginaIntegraciones(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("tokens");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const [tokenName, setTokenName] = useState("");
  const [tokenOpen, setTokenOpen] = useState(false);

  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: "", description: "", events: "" });

  const tokensQuery = useQuery({ queryKey: ["api-tokens"], queryFn: getApiTokens });
  const webhooksQuery = useQuery({ queryKey: ["webhooks"], queryFn: getWebhooks });
  const eventsQuery = useQuery({ queryKey: ["webhook-events"], queryFn: getWebhookEvents });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
  };

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

  const createTokenMutation = useMutation({
    mutationFn: () => createApiToken({ name: tokenName, scopes: [], expirationDays: null, description: "" }),
    onSuccess: async (res) => { await refresh(); setNewToken(res.token); setTokenOpen(false); setTokenName(""); },
    onError: () => fail("No se pudo crear el token."),
  });

  const revokeTokenMutation = useMutation({
    mutationFn: (id: string) => revokeApiToken(id),
    onSuccess: async () => { await refresh(); ok("Token revocado."); },
    onError: () => fail("No se pudo revocar."),
  });

  const createWebhookMutation = useMutation({
    mutationFn: () => createWebhook({ name: webhookForm.description || webhookForm.url, url: webhookForm.url, description: webhookForm.description, events: webhookForm.events.split(",").map((e) => e.trim()).filter(Boolean), format: "raw" }),
    onSuccess: async () => { await refresh(); ok("Webhook creado."); setWebhookOpen(false); setWebhookForm({ url: "", description: "", events: "" }); },
    onError: () => fail("No se pudo crear el webhook."),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: async () => { await refresh(); ok("Webhook eliminado."); },
    onError: () => fail("No se pudo eliminar."),
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: (id: string) => toggleWebhook(id),
    onSuccess: async () => { await refresh(); ok("Estado actualizado."); },
    onError: () => fail("No se pudo actualizar."),
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => testWebhook(id),
    onSuccess: () => ok("Evento de prueba enviado."),
    onError: () => fail("No se pudo enviar el evento."),
  });

  const tokens = tokensQuery.data ?? [];
  const webhooks = webhooksQuery.data ?? [];

  return (
    <section className="space-y-4">
      <PageHeader title="Integraciones" description="Tokens de API y webhooks" action={
        tab === "tokens"
          ? <Button onClick={() => setTokenOpen(true)}>Nuevo token</Button>
          : <Button onClick={() => setWebhookOpen(true)}>Nuevo webhook</Button>
      } />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {newToken && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">Copia este token ahora — no se mostrará de nuevo:</p>
          <code className="block break-all text-xs bg-white border rounded p-2">{newToken}</code>
          <Button size="sm" variant="secondary" onClick={() => setNewToken(null)}>Entendido</Button>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {(["tokens", "webhooks"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "tokens" ? "Tokens de API" : "Webhooks"}
          </button>
        ))}
      </div>

      {tab === "tokens" && (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Prefijo</th>
                <th className="px-3 py-2">Creado</th>
                <th className="px-3 py-2">Último uso</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 font-semibold">{t.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{t.tokenPrefix}...</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(t.createdAtUtc).toLocaleDateString("es-PE")}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{t.lastUsedAtUtc ? new Date(t.lastUsedAtUtc).toLocaleDateString("es-PE") : "Nunca"}</td>
                  <td className="px-3 py-2">{t.isActive ? "Sí" : "No"}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="danger" onClick={() => revokeTokenMutation.mutate(t.id)}>Revocar</Button>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin tokens</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Eventos</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs max-w-xs truncate">{w.url}</td>
                  <td className="px-3 py-2 text-slate-500">{w.description ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{w.events?.join(", ")}</td>
                  <td className="px-3 py-2">{w.isActive ? "Sí" : "No"}</td>
                  <td className="px-3 py-2 flex gap-1 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => toggleWebhookMutation.mutate(w.id)}>{w.isActive ? "Pausar" : "Activar"}</Button>
                    <Button size="sm" variant="secondary" onClick={() => testWebhookMutation.mutate(w.id)}>Probar</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteWebhookMutation.mutate(w.id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={5}>Sin webhooks</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={tokenOpen} title="Nuevo token de API" onClose={() => setTokenOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Nombre del token</label><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="ej. App móvil, Integración ERP" /></div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTokenOpen(false)}>Cancelar</Button>
            <Button disabled={!tokenName || createTokenMutation.isPending} onClick={() => createTokenMutation.mutate()}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={webhookOpen} title="Nuevo webhook" onClose={() => setWebhookOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">URL del endpoint</label><Input value={webhookForm.url} onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
          <div><label className="text-xs text-slate-500">Descripción</label><Input value={webhookForm.description} onChange={(e) => setWebhookForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div>
            <label className="text-xs text-slate-500">Eventos (separados por coma)</label>
            <Textarea value={webhookForm.events} onChange={(e) => setWebhookForm((f) => ({ ...f, events: e.target.value }))} placeholder={eventsQuery.data?.map((e) => e.eventType).join(", ") ?? "employee.created, payroll.approved, ..."} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWebhookOpen(false)}>Cancelar</Button>
            <Button disabled={!webhookForm.url || createWebhookMutation.isPending} onClick={() => createWebhookMutation.mutate()}>Crear</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

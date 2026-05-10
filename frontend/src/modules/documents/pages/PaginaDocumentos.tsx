import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  createDocument,
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplates,
  getDocuments,
  rejectDocument,
  sendForSignature,
  signDocument,
} from "@/modules/documents/services/documentsApi";
import type { EmployeeDocument } from "@/modules/documents/types/documents.types";

type Tab = "documents" | "templates";

const statusLabels: Record<string, string> = {
  draft: "Borrador", pending_signature: "Pendiente firma",
  signed: "Firmado", rejected: "Rechazado",
};

export function PaginaDocumentos(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("documents");
  const [statusFilter, setStatusFilter] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [createTplOpen, setCreateTplOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<EmployeeDocument | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [docForm, setDocForm] = useState({ employeeId: "", templateId: "", title: "", type: "", htmlContent: "" });
  const [tplForm, setTplForm] = useState({ name: "", type: "", htmlContent: "", description: "" });

  const docsQuery = useQuery({ queryKey: ["documents", statusFilter], queryFn: () => getDocuments("", statusFilter) });
  const tplsQuery = useQuery({ queryKey: ["document-templates"], queryFn: getDocumentTemplates });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
    await queryClient.invalidateQueries({ queryKey: ["document-templates"] });
  };

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

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
    mutationFn: (id: string) => sendForSignature(id),
    onSuccess: async () => { await refresh(); ok("Enviado para firma."); },
    onError: () => fail("No se pudo enviar."),
  });

  const signMutation = useMutation({
    mutationFn: (id: string) => signDocument(id),
    onSuccess: async () => { await refresh(); ok("Documento firmado."); },
    onError: () => fail("No se pudo firmar."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDocument(id, reason),
    onSuccess: async () => { await refresh(); ok("Documento rechazado."); setRejectOpen(false); },
    onError: () => fail("No se pudo rechazar."),
  });

  const docs = docsQuery.data ?? [];
  const tpls = tplsQuery.data ?? [];

  function handleExport(format: ExportFormat): void {
    const sourceRows = tab === "documents" ? docs : tpls;
    if (!sourceRows.length) { fail("No hay datos para exportar con los filtros actuales."); return; }
    const data = tab === "documents"
      ? docs.map((d) => ({
          Empleado: d.employeeName,
          Codigo: d.employeeCode,
          Titulo: d.title,
          Tipo: d.type,
          Estado: statusLabels[d.status] ?? d.status,
          Fecha: new Date(d.createdAtUtc).toLocaleDateString("es-PE"),
        }))
      : tpls.map((t) => ({
          Nombre: t.name,
          Tipo: t.type,
          Descripcion: t.description ?? "",
          Activo: t.isActive ? "Si" : "No",
        }));
    exportRows(format, data, makeFileName(tab === "documents" ? "Documentos" : "Plantillas", [statusFilter || null]), tab === "documents" ? "Documentos" : "Plantillas de documentos", {
      subtitle: tab === "documents" ? "Documentos laborales por empleado y estado de firma." : "Plantillas disponibles para generacion documental.",
      period: "Repositorio documental",
      filters: [
        { label: "Vista", value: tab === "documents" ? "Documentos" : "Plantillas" },
        { label: "Estado", value: statusFilter ? statusLabels[statusFilter] ?? statusFilter : "Todos" },
      ],
      metrics: [
        { label: "Total", value: sourceRows.length },
        { label: "Firmados", value: docs.filter((item) => item.status === "signed").length },
        { label: "Pendientes", value: docs.filter((item) => item.status === "pending_signature").length },
        { label: "Plantillas", value: tpls.length },
      ],
    });
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Documentos" description="Gestión de documentos de empleados" action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreateTplOpen(true)}>Nueva plantilla</Button>
          <ExportMenu fileName={makeFileName(tab === "documents" ? "Documentos" : "Plantillas", [statusFilter || null])} filtersActive={Boolean(statusFilter || tab !== "documents")} resultCount={tab === "documents" ? docs.length : tpls.length} onExport={handleExport} />
          <Button onClick={() => setCreateDocOpen(true)}>Nuevo documento</Button>
        </div>
      } />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="flex gap-2 border-b">
        {(["documents", "templates"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "documents" ? "Documentos" : "Plantillas"}
          </button>
        ))}
      </div>

      {tab === "documents" && (
        <>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="pending_signature">Pendiente firma</option>
            <option value="signed">Firmado</option>
            <option value="rejected">Rechazado</option>
          </Select>

          <div className="overflow-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-3 py-2"><div className="font-semibold">{d.employeeName}</div><div className="text-xs text-slate-500">{d.employeeCode}</div></td>
                    <td className="px-3 py-2">{d.title}</td>
                    <td className="px-3 py-2 text-xs">{d.type}</td>
                    <td className="px-3 py-2">
                      <Badge variant={d.status === "signed" ? "success" : d.status === "rejected" ? "danger" : d.status === "pending_signature" ? "warning" : "neutral"}>
                        {statusLabels[d.status] ?? d.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(d.createdAtUtc).toLocaleDateString("es-PE")}</td>
                    <td className="px-3 py-2 flex gap-1 flex-wrap">
                      {d.status === "draft" && <Button size="sm" onClick={() => sendMutation.mutate(d.id)}>Enviar</Button>}
                      {d.status === "pending_signature" && (
                        <>
                          <Button size="sm" onClick={() => signMutation.mutate(d.id)}>Firmar</Button>
                          <Button size="sm" variant="danger" onClick={() => { setSelectedDoc(d); setRejectReason(""); setRejectOpen(true); }}>Rechazar</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin documentos</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "templates" && (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tpls.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 font-semibold">{t.name}</td>
                  <td className="px-3 py-2 text-xs">{t.type}</td>
                  <td className="px-3 py-2 text-slate-500">{t.description ?? "—"}</td>
                  <td className="px-3 py-2">{t.isActive ? "Sí" : "No"}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="danger" onClick={() => deleteTplMutation.mutate(t.id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {tpls.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={5}>Sin plantillas</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createDocOpen} title="Nuevo documento" onClose={() => setCreateDocOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">ID de empleado</label><Input value={docForm.employeeId} onChange={(e) => setDocForm((f) => ({ ...f, employeeId: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Título</label><Input value={docForm.title} onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Tipo</label><Input value={docForm.type} onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))} placeholder="ej. contrato, carta" /></div>
          <Textarea value={docForm.htmlContent} onChange={(e) => setDocForm((f) => ({ ...f, htmlContent: e.target.value }))} placeholder="Contenido HTML del documento" rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateDocOpen(false)}>Cancelar</Button>
            <Button disabled={!docForm.employeeId || !docForm.title || createDocMutation.isPending} onClick={() => createDocMutation.mutate({ ...docForm, templateId: docForm.templateId || null })}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={createTplOpen} title="Nueva plantilla" onClose={() => setCreateTplOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="text-xs text-slate-500">Tipo</label><Input value={tplForm.type} onChange={(e) => setTplForm((f) => ({ ...f, type: e.target.value }))} placeholder="ej. contrato" /></div>
          <Textarea value={tplForm.htmlContent} onChange={(e) => setTplForm((f) => ({ ...f, htmlContent: e.target.value }))} placeholder="Contenido HTML de la plantilla" rows={4} />
          <div><label className="text-xs text-slate-500">Descripción</label><Input value={tplForm.description} onChange={(e) => setTplForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateTplOpen(false)}>Cancelar</Button>
            <Button disabled={!tplForm.name || !tplForm.type || createTplMutation.isPending} onClick={() => createTplMutation.mutate(tplForm)}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={rejectOpen} title="Rechazar documento" onClose={() => setRejectOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{selectedDoc?.title}</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo de rechazo" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="danger" disabled={!rejectReason || rejectMutation.isPending} onClick={() => selectedDoc && rejectMutation.mutate({ id: selectedDoc.id, reason: rejectReason })}>Rechazar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

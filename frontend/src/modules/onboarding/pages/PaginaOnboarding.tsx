import { useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import {
  completeOnboardingTask,
  createOnboardingTemplate,
  deleteOnboardingTemplate,
  getOnboardingProcesses,
  getOnboardingTemplates,
  startOnboardingProcess,
} from "@/modules/onboarding/services/onboardingApi";
import type { OnboardingProcess, OnboardingTemplate } from "@/modules/onboarding/types/onboarding.types";

type Tab = "processes" | "templates";

export function PaginaOnboarding(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("processes");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [createTplOpen, setCreateTplOpen] = useState(false);
  const [startProcessOpen, setStartProcessOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<OnboardingProcess | null>(null);
  const [tplForm, setTplForm] = useState({ name: "", description: "", tasks: "" });
  const [processForm, setProcessForm] = useState({ employeeId: "", templateId: "" });

  const tplsQuery = useQuery({ queryKey: ["onboarding-templates"], queryFn: getOnboardingTemplates });
  const processesQuery = useQuery({ queryKey: ["onboarding-processes"], queryFn: () => getOnboardingProcesses() });

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["onboarding-templates"] });
    await queryClient.invalidateQueries({ queryKey: ["onboarding-processes"] });
  };

  const ok = (msg: string): void => setFeedback({ type: "success", message: msg });
  const fail = (msg: string): void => setFeedback({ type: "error", message: msg });

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
    mutationFn: ({ processId, taskId }: { processId: string; taskId: string }) => completeOnboardingTask(processId, taskId),
    onSuccess: async () => { await refresh(); ok("Tarea completada."); },
    onError: () => fail("No se pudo completar la tarea."),
  });

  const tpls = tplsQuery.data ?? [];
  const processes = processesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <PageHeader title="Onboarding" description="Gestión de procesos de incorporación" action={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreateTplOpen(true)}>Nueva plantilla</Button>
          <Button onClick={() => setStartProcessOpen(true)}>Iniciar proceso</Button>
        </div>
      } />

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <div className="flex gap-2 border-b">
        {(["processes", "templates"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "processes" ? "Procesos" : "Plantillas"}
          </button>
        ))}
      </div>

      {tab === "processes" && (
        <div className="space-y-4">
          {processes.map((p) => (
            <div key={p.id} className="rounded-lg border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.employeeName}</div>
                  <div className="text-xs text-slate-500">{p.templateName} · {p.completedTasks}/{p.totalTasks} tareas</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setSelectedProcess(selectedProcess?.id === p.id ? null : p)}>
                  {selectedProcess?.id === p.id ? "Ocultar" : "Ver tareas"}
                </Button>
              </div>
              {selectedProcess?.id === p.id && (
                <div className="space-y-1">
                  {p.tasks?.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-4 h-4 rounded-full border flex-shrink-0 ${task.isCompleted ? "bg-green-500 border-green-500" : "border-slate-300"}`} />
                      <span className={task.isCompleted ? "line-through text-slate-400" : ""}>{task.title}</span>
                      {!task.isCompleted && (
                        <Button size="sm" variant="secondary" onClick={() => completeMutation.mutate({ processId: p.id, taskId: task.id })}>Completar</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {processes.length === 0 && <div className="py-8 text-center text-slate-500 text-sm">Sin procesos de onboarding</div>}
        </div>
      )}

      {tab === "templates" && (
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Tareas</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tpls.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 font-semibold">{t.name}</td>
                  <td className="px-3 py-2 text-slate-500">{t.description ?? "—"}</td>
                  <td className="px-3 py-2">{t.tasks?.length ?? 0}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="danger" onClick={() => deleteTplMutation.mutate(t.id)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
              {tpls.length === 0 && <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={4}>Sin plantillas</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createTplOpen} title="Nueva plantilla de onboarding" onClose={() => setCreateTplOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">Nombre</label><Input value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <Textarea value={tplForm.description} onChange={(e) => setTplForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateTplOpen(false)}>Cancelar</Button>
            <Button disabled={!tplForm.name || createTplMutation.isPending} onClick={() => createTplMutation.mutate({ name: tplForm.name, description: tplForm.description, tasks: [] })}>Crear</Button>
          </div>
        </div>
      </Modal>

      <Modal open={startProcessOpen} title="Iniciar proceso de onboarding" onClose={() => setStartProcessOpen(false)}>
        <div className="space-y-3">
          <div><label className="text-xs text-slate-500">ID del empleado</label><Input value={processForm.employeeId} onChange={(e) => setProcessForm((f) => ({ ...f, employeeId: e.target.value }))} /></div>
          <div>
            <label className="text-xs text-slate-500">Plantilla</label>
            <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={processForm.templateId} onChange={(e) => setProcessForm((f) => ({ ...f, templateId: e.target.value }))}>
              <option value="">Seleccionar plantilla</option>
              {tpls.map((t: OnboardingTemplate) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStartProcessOpen(false)}>Cancelar</Button>
            <Button disabled={!processForm.employeeId || !processForm.templateId || startMutation.isPending} onClick={() => startMutation.mutate({ employeeId: processForm.employeeId, templateId: processForm.templateId })}>Iniciar</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

import { useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  Eye,
  FilePlus2,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { getEmployees } from "@/modules/employees/services/employeesApi";
import type { EmployeeListItem } from "@/modules/employees/types/employee.types";
import {
  cancelOnboardingProcess,
  completeOnboardingProcess,
  completeOnboardingTask,
  createOnboardingTemplate,
  deleteOnboardingTemplate,
  duplicateOnboardingTemplate,
  getOnboardingProcesses,
  getOnboardingTemplates,
  startOnboardingProcess,
  updateOnboardingTemplate,
  updateOnboardingTemplateStatus,
} from "@/modules/onboarding/services/onboardingApi";
import type { OnboardingProcess, OnboardingTemplate } from "@/modules/onboarding/types/onboarding.types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab          = "processes" | "templates";
type StatusFilter = "all" | "active" | "pending" | "completed" | "cancelled" | "inactive";
type Feedback     = { type: "success" | "error"; message: string };
type TaskForm     = { title: string; description: string };
type TemplateForm = { name: string; description: string; tasks: TaskForm[] };
type ProcessForm  = { employeeId: string; templateId: string; notes: string };

const emptyTemplateForm: TemplateForm = { name: "", description: "", tasks: [{ title: "", description: "" }] };
const emptyProcessForm: ProcessForm   = { employeeId: "", templateId: "", notes: "" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700", "bg-orange-100 text-orange-700",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function normalize(v: string): string { return v.trim().toLowerCase(); }

function processStatus(p: OnboardingProcess): { label: string; variant: "success" | "warning" | "neutral" | "info" } {
  if (!p.isActive)          return { label: "Cancelado",   variant: "neutral" };
  if (p.completedAtUtc)     return { label: "Completado",  variant: "success" };
  if (p.completedTasks === 0) return { label: "Pendiente", variant: "warning" };
  return { label: "En progreso", variant: "info" };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, icon: Icon, iconBg, iconColor, loading }: {
  label: string; value: number | string; subtitle: string;
  icon: React.ElementType; iconBg: string; iconColor: string; loading: boolean;
}): JSX.Element {
  return (
    <div className="relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`size-6 ${iconColor}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-slate-500">{label}</p>
        {loading ? (
          <><Skeleton className="my-1 h-7 w-14" /><Skeleton className="h-3 w-20" /></>
        ) : (
          <><p className="text-[26px] font-extrabold leading-tight text-slate-800">{value}</p>
          <p className="text-[11px] text-slate-400">{subtitle}</p></>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ variant, label }: { variant: "success" | "warning" | "neutral" | "info"; label: string }): JSX.Element {
  const styles = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    neutral: "bg-slate-50 text-slate-600 ring-slate-200",
    info:    "bg-blue-50 text-blue-700 ring-blue-200",
  };
  const dots = {
    success: "bg-emerald-500", warning: "bg-amber-500",
    neutral: "bg-slate-400",  info:    "bg-blue-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${styles[variant]}`}>
      <span className={`size-1.5 rounded-full ${dots[variant]}`} />
      {label}
    </span>
  );
}

function ProgressBar({ value, completed, total }: { value: number; completed: number; total: number }): JSX.Element {
  return (
    <div className="min-w-[130px]">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">{completed}/{total} tareas</span>
        <span className="font-semibold text-slate-700">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function AvatarCircle({ name }: { name: string }): JSX.Element {
  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${avatarColor(name)}`}>
      {initials(name)}
    </span>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType; title: string; subtitle: string; action?: JSX.Element;
}): JSX.Element {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 ring-1 ring-brand-100">
        <Icon className="size-7" />
      </div>
      <h3 className="mt-4 text-[15px] font-bold text-slate-800">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-50">
        <Icon className="size-3.5 text-brand-600" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

function ModalShell({ open, onClose, title, subtitle, maxWidth = "max-w-2xl", children }: {
  open: boolean; onClose: () => void; title: string; subtitle: string;
  maxWidth?: string; children: JSX.Element;
}): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className={`flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl sm:border`}>
        <div className="shrink-0 border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900">{title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            </div>
            <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X className="size-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onConfirm, confirmLabel, confirmDanger = false, loading = false }: {
  onClose: () => void; onConfirm?: () => void; confirmLabel: string;
  confirmDanger?: boolean; loading?: boolean;
}): JSX.Element {
  return (
    <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          Cancelar
        </button>
        {onConfirm && (
          <button type="button" onClick={onConfirm} disabled={loading}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-6 text-[13px] font-semibold text-white shadow-sm transition disabled:opacity-60 disabled:pointer-events-none",
              confirmDanger
                ? "bg-gradient-to-b from-rose-500 to-rose-600 shadow-rose-500/30 hover:from-rose-500 hover:to-rose-700"
                : "bg-gradient-to-b from-brand-500 to-brand-600 shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700"
            )}
          >
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function PaginaOnboarding(): JSX.Element {
  const queryClient = useQueryClient();

  // UI state
  const [tab, setTab]                       = useState<Tab>("processes");
  const [feedback, setFeedback]             = useState<Feedback | null>(null);
  const [templateModal, setTemplateModal]   = useState<"create" | "edit" | "view" | null>(null);
  const [processModal, setProcessModal]     = useState<"start" | "view" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [selectedProcess, setSelectedProcess]   = useState<OnboardingProcess | null>(null);
  const [templateForm, setTemplateForm]     = useState<TemplateForm>(emptyTemplateForm);
  const [processForm, setProcessForm]       = useState<ProcessForm>(emptyProcessForm);
  const [templateError, setTemplateError]   = useState<string | null>(null);
  const [processError, setProcessError]     = useState<string | null>(null);

  // Filters
  const [processSearch, setProcessSearch]             = useState("");
  const [templateSearch, setTemplateSearch]           = useState("");
  const [employeeSearch, setEmployeeSearch]           = useState("");
  const [processStatusFilter, setProcessStatusFilter] = useState<StatusFilter>("all");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<StatusFilter>("all");
  const [templateFilter, setTemplateFilter]           = useState("all");

  // Queries
  const templatesQuery = useQuery({ queryKey: ["onboarding-templates"], queryFn: getOnboardingTemplates });
  const processesQuery = useQuery({ queryKey: ["onboarding-processes"], queryFn: () => getOnboardingProcesses() });
  const employeesQuery = useQuery({
    queryKey: ["employees", "onboarding-picker", employeeSearch],
    queryFn: () => getEmployees({ search: employeeSearch, areaId: "", branchId: "", isActive: true, pageNumber: 1, pageSize: 25, sortBy: "fullName", sortDirection: "asc" }),
  });

  const templates = templatesQuery.data ?? [];
  const processes = processesQuery.data ?? [];
  const employees = employeesQuery.data?.items ?? [];

  const selectedTemplateForProcess = templates.find((t) => t.id === processForm.templateId);
  const selectedEmployee           = employees.find((e) => e.id === processForm.employeeId);

  // KPI counts
  const activeProcesses    = processes.filter((p) => p.isActive && !p.completedAtUtc).length;
  const pendingProcesses   = processes.filter((p) => p.isActive && !p.completedAtUtc && p.completedTasks === 0).length;
  const completedProcesses = processes.filter((p) => !!p.completedAtUtc).length;
  const loading            = templatesQuery.isLoading || processesQuery.isLoading;

  // Filtered lists
  const filteredProcesses = useMemo(() => processes.filter((p) => {
    const text   = normalize(`${p.employeeName} ${p.employeeCode} ${p.templateName}`);
    const status = processStatus(p).label.toLowerCase();
    return (
      (!processSearch.trim() || text.includes(normalize(processSearch))) &&
      (templateFilter === "all" || p.templateName === templateFilter) &&
      (processStatusFilter === "all"
        || (processStatusFilter === "active"    && p.isActive && !p.completedAtUtc)
        || (processStatusFilter === "pending"   && status === "pendiente")
        || (processStatusFilter === "completed" && status === "completado")
        || (processStatusFilter === "cancelled" && status === "cancelado"))
    );
  }), [processes, processSearch, processStatusFilter, templateFilter]);

  const filteredTemplates = useMemo(() => templates.filter((t) => {
    const text = normalize(`${t.name} ${t.description ?? ""}`);
    return (
      (!templateSearch.trim() || text.includes(normalize(templateSearch))) &&
      (templateStatusFilter === "all"
        || (templateStatusFilter === "active"   && t.isActive)
        || (templateStatusFilter === "inactive" && !t.isActive))
    );
  }), [templates, templateSearch, templateStatusFilter]);

  const hasProcessFilters  = Boolean(processSearch || processStatusFilter !== "all" || templateFilter !== "all");
  const hasTemplateFilters = Boolean(templateSearch || templateStatusFilter !== "all");

  // Refresh
  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["onboarding-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["onboarding-processes"] }),
    ]);
  }

  // Open helpers
  function openCreate(): void  { setSelectedTemplate(null); setTemplateForm(emptyTemplateForm); setTemplateError(null); setTemplateModal("create"); }
  function openEdit(t: OnboardingTemplate): void {
    setSelectedTemplate(t);
    setTemplateForm({ name: t.name, description: t.description ?? "", tasks: t.tasks.length > 0 ? t.tasks.map((task) => ({ title: task.title, description: task.description ?? "" })) : [{ title: "", description: "" }] });
    setTemplateError(null);
    setTemplateModal("edit");
  }
  function openView(t: OnboardingTemplate): void  { setSelectedTemplate(t); setTemplateModal("view"); }
  function openStart(): void   { setSelectedProcess(null); setProcessForm(emptyProcessForm); setProcessError(null); setEmployeeSearch(""); setProcessModal("start"); }
  function openProcess(p: OnboardingProcess): void { setSelectedProcess(p); setProcessModal("view"); }

  // Validation
  function validateTemplate(): { name: string; description: string; tasks: { title: string; description: string; sortOrder: number }[] } | null {
    const name  = templateForm.name.trim();
    const desc  = templateForm.description.trim();
    const tasks = templateForm.tasks.map((t, i) => ({ title: t.title.trim(), description: t.description.trim(), sortOrder: i + 1 })).filter((t) => t.title);
    const dup   = templates.some((t) => t.id !== selectedTemplate?.id && normalize(t.name) === normalize(name));
    if (name.length < 3)    { setTemplateError("El nombre debe tener al menos 3 caracteres."); return null; }
    if (desc.length < 10)   { setTemplateError("La descripción debe tener al menos 10 caracteres."); return null; }
    if (dup)                { setTemplateError("Ya existe una plantilla con ese nombre."); return null; }
    if (!tasks.length || tasks.some((t) => t.title.length < 3)) { setTemplateError("Agrega al menos una tarea con nombre válido (mínimo 3 caracteres)."); return null; }
    setTemplateError(null);
    return { name, description: desc, tasks };
  }

  function validateProcess(): { employeeId: string; templateId: string } | null {
    if (!processForm.employeeId) { setProcessError("Selecciona un empleado."); return null; }
    if (!processForm.templateId) { setProcessError("Selecciona una plantilla."); return null; }
    setProcessError(null);
    return { employeeId: processForm.employeeId, templateId: processForm.templateId };
  }

  // Mutations
  const saveTemplate = useMutation({
    mutationFn: async () => {
      const payload = validateTemplate();
      if (!payload) throw new Error("validation");
      return templateModal === "edit" && selectedTemplate
        ? updateOnboardingTemplate(selectedTemplate.id, payload)
        : createOnboardingTemplate(payload);
    },
    onSuccess: async () => {
      await refresh();
      setFeedback({ type: "success", message: templateModal === "edit" ? "Plantilla actualizada." : "Plantilla creada correctamente." });
      setTemplateModal(null);
    },
    onError: (e) => { if (e instanceof Error && e.message === "validation") return; setFeedback({ type: "error", message: "No se pudo guardar la plantilla." }); },
  });

  const startProcess = useMutation({
    mutationFn: async () => {
      const payload = validateProcess();
      if (!payload) throw new Error("validation");
      return startOnboardingProcess(payload);
    },
    onSuccess: async () => { await refresh(); setFeedback({ type: "success", message: "Proceso iniciado correctamente." }); setProcessModal(null); },
    onError: (e) => { if (e instanceof Error && e.message === "validation") return; setFeedback({ type: "error", message: "No se pudo iniciar el proceso." }); },
  });

  const action = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => { await refresh(); setFeedback({ type: "success", message: "Acción realizada correctamente." }); setProcessModal(null); },
    onError: () => setFeedback({ type: "error", message: "No se pudo completar la acción." }),
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50">
            <Rocket className="size-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Onboarding</h1>
            <p className="mt-0.5 text-sm text-slate-500">Gestión de procesos de incorporación</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300">
            <FilePlus2 className="size-4" />
            Nueva plantilla
          </button>
          <button onClick={openStart} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700">
            <Play className="size-4" />
            Iniciar proceso
          </button>
        </div>
      </div>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Procesos activos"      value={activeProcesses}    subtitle="En ejecución"         icon={Users}       iconBg="bg-brand-50"   iconColor="text-brand-500"   loading={loading} />
        <StatCard label="Pendientes"            value={pendingProcesses}   subtitle="Sin tareas iniciadas" icon={Clock3}       iconBg="bg-amber-50"   iconColor="text-amber-500"   loading={loading} />
        <StatCard label="Completados"           value={completedProcesses} subtitle="Procesos finalizados" icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-500" loading={loading} />
        <StatCard label="Plantillas"            value={templates.length}   subtitle={`${templates.filter((t) => t.isActive).length} activas`} icon={ListChecks} iconBg="bg-indigo-50" iconColor="text-indigo-500" loading={loading} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1">
        {([
          { key: "processes" as Tab, icon: UserPlus,   label: "Procesos",   count: processes.length },
          { key: "templates" as Tab, icon: ListChecks,  label: "Plantillas", count: templates.length },
        ] as const).map(({ key, icon: Icon, label, count }) => (
          <button key={key} onClick={() => setTab(key)} className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
            tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}>
            <Icon className={cn("size-4", tab === key ? "text-brand-500" : "text-slate-400")} />
            {label}
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              tab === key ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500"
            )}>{count}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ PROCESOS TAB ══ */}
      {tab === "processes" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">

          {/* Main table */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={processSearch} onChange={(e) => { setProcessSearch(e.target.value); }}
                  placeholder="Buscar por empleado, código o plantilla"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
              </div>
              <select value={processStatusFilter} onChange={(e) => setProcessStatusFilter(e.target.value as StatusFilter)}
                className="h-10 min-w-[155px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
                <option value="all">Todos los estados</option>
                <option value="active">En progreso</option>
                <option value="pending">Pendientes</option>
                <option value="completed">Completados</option>
                <option value="cancelled">Cancelados</option>
              </select>
              <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}
                className="h-10 min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
                <option value="all">Todas las plantillas</option>
                {templates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              {hasProcessFilters && (
                <button onClick={() => { setProcessSearch(""); setProcessStatusFilter("all"); setTemplateFilter("all"); }}
                  className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                  <X className="size-3.5" />Limpiar
                </button>
              )}
              <span className="ml-auto shrink-0 text-sm font-medium text-slate-500">
                {filteredProcesses.length} {filteredProcesses.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      {["Empleado", "Plantilla", "Fecha de inicio", "Estado", "Progreso"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left">
                          <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-slate-900">
                            {h}<ArrowUpDown className="size-3 text-slate-300" />
                          </button>
                        </th>
                      ))}
                      <th className="px-5 py-3 text-right text-[12px] font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processesQuery.isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          {[...Array(6)].map((__, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}
                        </tr>
                      ))
                    ) : filteredProcesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <EmptyState
                            icon={UserPlus}
                            title="Aún no hay procesos de onboarding"
                            subtitle="Crea una plantilla o inicia un nuevo proceso para comenzar."
                            action={
                              <div className="flex justify-center gap-2">
                                <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                                  <FilePlus2 className="size-3.5" />Nueva plantilla
                                </button>
                                <button onClick={openStart} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:from-brand-500 hover:to-brand-700">
                                  <Play className="size-3.5" />Iniciar proceso
                                </button>
                              </div>
                            }
                          />
                        </td>
                      </tr>
                    ) : filteredProcesses.map((p) => {
                      const st = processStatus(p);
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <AvatarCircle name={p.employeeName} />
                              <div>
                                <p className="text-[13px] font-semibold text-slate-800">{p.employeeName}</p>
                                <p className="font-mono text-[11px] text-slate-400">{p.employeeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[13px] text-slate-600">{p.templateName}</td>
                          <td className="px-5 py-3 text-[13px] text-slate-500">{formatDate(p.startedAtUtc)}</td>
                          <td className="px-5 py-3"><StatusBadge variant={st.variant} label={st.label} /></td>
                          <td className="px-5 py-3"><ProgressBar value={p.progressPercent} completed={p.completedTasks} total={p.totalTasks} /></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button title="Ver detalle" onClick={() => openProcess(p)} className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                                <Eye className="size-4" />
                              </button>
                              {p.isActive && !p.completedAtUtc && (
                                <>
                                  <button title="Finalizar proceso" onClick={() => action.mutate(() => completeOnboardingProcess(p.id))}
                                    className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600">
                                    <CheckCircle2 className="size-4" />
                                  </button>
                                  <button title="Cancelar proceso" onClick={() => action.mutate(() => cancelOnboardingProcess(p.id))}
                                    className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500">
                                    <XCircle className="size-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-slate-900">Procesos activos</h3>
                <CalendarDays className="size-4 text-slate-400" />
              </div>
              <div className="space-y-2">
                {processes.filter((p) => p.isActive && !p.completedAtUtc).slice(0, 5).map((p) => (
                  <button key={p.id} onClick={() => openProcess(p)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50">
                    <AvatarCircle name={p.employeeName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{p.employeeName}</p>
                      <p className="truncate text-[11px] text-slate-400">{p.templateName}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-brand-600">{Math.round(p.progressPercent)}%</span>
                  </button>
                ))}
                {processes.filter((p) => p.isActive && !p.completedAtUtc).length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">Sin procesos activos.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[13px] font-bold text-slate-900">Resumen general</h3>
              {[
                { label: "En progreso", value: activeProcesses - pendingProcesses, color: "bg-blue-500" },
                { label: "Pendientes",  value: pendingProcesses,   color: "bg-amber-400" },
                { label: "Completados", value: completedProcesses, color: "bg-emerald-500" },
                { label: "Cancelados",  value: processes.filter((p) => !p.isActive).length, color: "bg-rose-400" },
              ].map((item) => (
                <div key={item.label} className="mb-2">
                  <div className="flex items-center justify-between text-[12px] text-slate-600 mb-1">
                    <div className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${item.color}`} />{item.label}</div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: processes.length ? `${Math.round((item.value / processes.length) * 100)}%` : "0%" }} />
                  </div>
                </div>
              ))}
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-[12px]">
                <span className="text-slate-500">Total procesos</span>
                <span className="font-bold text-slate-900">{processes.length}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════ PLANTILLAS TAB ══ */}
      {tab === "templates" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar por nombre o descripción"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
            </div>
            <select value={templateStatusFilter} onChange={(e) => setTemplateStatusFilter(e.target.value as StatusFilter)}
              className="h-10 min-w-[155px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
            {hasTemplateFilters && (
              <button onClick={() => { setTemplateSearch(""); setTemplateStatusFilter("all"); }}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                <X className="size-3.5" />Limpiar
              </button>
            )}
            <span className="ml-auto shrink-0 text-sm font-medium text-slate-500">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    {["Nombre", "Descripción", "Tareas", "Duración est.", "Estado", "Creación"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left">
                        <span className="text-[12px] font-semibold text-slate-600">{h}</span>
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right text-[12px] font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templatesQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>{[...Array(7)].map((__, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}</tr>
                    ))
                  ) : filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <EmptyState
                          icon={ListChecks}
                          title="Aún no hay plantillas de onboarding"
                          subtitle="Crea una plantilla base para reutilizar tareas en nuevos ingresos."
                          action={
                            <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm transition">
                              <Plus className="size-3.5" />Nueva plantilla
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  ) : filteredTemplates.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-slate-800">{t.name}</p>
                      </td>
                      <td className="max-w-[260px] px-5 py-3">
                        <p className="line-clamp-1 text-[13px] text-slate-500">{t.description || "Sin descripción"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          <ClipboardList className="size-3" />{t.tasks.length}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-slate-500">{Math.max(t.tasks.length, 1)} día{t.tasks.length !== 1 ? "s" : ""}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                          t.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-600 ring-slate-200"
                        )}>
                          <span className={`size-1.5 rounded-full ${t.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {t.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-slate-500">{formatDate(t.createdAtUtc)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button title="Ver detalle"  onClick={() => openView(t)}  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Eye     className="size-4" /></button>
                          <button title="Editar"       onClick={() => openEdit(t)}  className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil  className="size-4" /></button>
                          <button title="Duplicar"     onClick={() => action.mutate(() => duplicateOnboardingTemplate(t.id))} className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Copy    className="size-4" /></button>
                          <button title={t.isActive ? "Desactivar" : "Activar"} onClick={() => action.mutate(() => updateOnboardingTemplateStatus(t.id, !t.isActive))}
                            className={cn("flex size-8 items-center justify-center rounded-lg transition", t.isActive ? "text-slate-400 hover:bg-rose-50 hover:text-rose-500" : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600")}>
                            {t.isActive ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                          </button>
                          <button title="Eliminar"     onClick={() => action.mutate(() => deleteOnboardingTemplate(t.id))} className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"><Trash2  className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ MODAL NUEVA/EDITAR PLANTILLA ══ */}
      <ModalShell
        open={templateModal === "create" || templateModal === "edit"}
        onClose={() => setTemplateModal(null)}
        title={templateModal === "edit" ? "Editar plantilla" : "Nueva plantilla de onboarding"}
        subtitle="Define una plantilla reutilizable con las tareas del proceso de incorporación."
      >
        <div className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto">
            <div className="space-y-5 px-6 py-5">
              {templateError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
                  <AlertCircle className="size-4 shrink-0" />{templateError}
                </div>
              )}

              <SectionTitle icon={FilePlus2} label="Información de la plantilla" />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Nombre de la plantilla <span className="text-rose-500">*</span></span>
                  <Input value={templateForm.name} onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej. Incorporación administrativa" />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Descripción <span className="text-rose-500">*</span></span>
                  <Textarea value={templateForm.description} onChange={(e) => setTemplateForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe cuándo usar esta plantilla y qué cubre el proceso (mínimo 10 caracteres)." />
                </label>
              </div>

              <SectionTitle icon={ClipboardList} label="Tareas del proceso" />

              <div className="rounded-xl border border-slate-200 bg-slate-50/60">
                {/* Task headers */}
                <div className="hidden grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] gap-3 border-b border-slate-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:grid">
                  <span>#</span><span>Nombre de tarea</span><span>Descripción</span><span />
                </div>
                <div className="divide-y divide-slate-100">
                  {templateForm.tasks.map((task, idx) => (
                    <div key={idx} className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] items-center gap-3 px-4 py-3">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-700">{idx + 1}</span>
                      <Input value={task.title} onChange={(e) => setTemplateForm((p) => ({ ...p, tasks: p.tasks.map((t, i) => i === idx ? { ...t, title: e.target.value } : t) }))} placeholder="Nombre de tarea" />
                      <Input value={task.description} onChange={(e) => setTemplateForm((p) => ({ ...p, tasks: p.tasks.map((t, i) => i === idx ? { ...t, description: e.target.value } : t) }))} placeholder="Descripción breve (opcional)" />
                      <button onClick={() => setTemplateForm((p) => ({ ...p, tasks: p.tasks.filter((_, i) => i !== idx) }))}
                        className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500" title="Eliminar tarea">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 px-4 py-3">
                  <button onClick={() => setTemplateForm((p) => ({ ...p, tasks: [...p.tasks, { title: "", description: "" }] }))}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 text-[12px] font-semibold text-brand-600 transition hover:bg-brand-100">
                    <Plus className="size-3.5" />Agregar tarea
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Duración estimada: <strong>{Math.max(templateForm.tasks.filter((t) => t.title.trim()).length, 1)} día{templateForm.tasks.filter((t) => t.title.trim()).length !== 1 ? "s" : ""}</strong> · basado en el número de tareas con nombre.
              </p>
            </div>
          </div>
          <ModalFooter
            onClose={() => setTemplateModal(null)}
            onConfirm={() => saveTemplate.mutate()}
            confirmLabel={saveTemplate.isPending ? "Guardando..." : "Guardar plantilla"}
            loading={saveTemplate.isPending}
          />
        </div>
      </ModalShell>

      {/* ══════════════════════════════════════════ MODAL INICIAR PROCESO ══ */}
      <ModalShell
        open={processModal === "start"}
        onClose={() => setProcessModal(null)}
        title="Iniciar proceso de onboarding"
        subtitle="Asigna una plantilla a un colaborador para comenzar su proceso de incorporación."
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto px-6 py-5">
            {processError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
                <AlertCircle className="size-4 shrink-0" />{processError}
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">

              {/* Left: employee + template */}
              <div className="space-y-5">
                <div>
                  <SectionTitle icon={Users} label="1. Seleccionar empleado" />
                  <div className="mt-3 space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Buscar por nombre, código o documento..."
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20" />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {employees.map((emp: EmployeeListItem) => (
                        <button key={emp.id} type="button" onClick={() => setProcessForm((p) => ({ ...p, employeeId: emp.id }))}
                          className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50", processForm.employeeId === emp.id && "bg-brand-50")}>
                          <AvatarCircle name={emp.fullName} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-800">{emp.fullName}</p>
                            <p className="truncate text-[11px] text-slate-400">{emp.employeeCode} · {emp.area} · {emp.position}</p>
                          </div>
                          {processForm.employeeId === emp.id && <CheckCircle2 className="size-4 shrink-0 text-brand-600" />}
                        </button>
                      ))}
                      {employees.length === 0 && <p className="px-3 py-5 text-center text-sm text-slate-400">No se encontraron empleados activos.</p>}
                    </div>
                    {selectedEmployee && (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <AvatarCircle name={selectedEmployee.fullName} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-slate-900">{selectedEmployee.fullName}</p>
                          <p className="text-[11px] text-slate-500">{selectedEmployee.employeeCode} · {selectedEmployee.area}</p>
                        </div>
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <SectionTitle icon={ListChecks} label="2. Seleccionar plantilla" />
                  <div className="mt-3">
                    <select value={processForm.templateId} onChange={(e) => setProcessForm((p) => ({ ...p, templateId: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20">
                      <option value="">Selecciona una plantilla activa</option>
                      {templates.filter((t) => t.isActive).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} tareas)</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <SectionTitle icon={CalendarDays} label="3. Observaciones" />
                  <Textarea className="mt-3" value={processForm.notes} onChange={(e) => setProcessForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Notas internas del proceso (campo informativo, pendiente de integración con backend)." />
                  <p className="mt-1.5 text-[11px] text-slate-400">El proceso iniciará con la fecha de hoy. Las tareas se crean automáticamente desde la plantilla.</p>
                </div>
              </div>

              {/* Right: template preview */}
              <div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  {selectedTemplateForProcess ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50"><ListChecks className="size-4 text-brand-600" /></div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{selectedTemplateForProcess.name}</p>
                          <p className="text-[11px] text-slate-400">{selectedTemplateForProcess.tasks.length} tareas · {Math.max(selectedTemplateForProcess.tasks.length, 1)} días est.</p>
                        </div>
                      </div>
                      <p className="mb-3 text-[12px] text-slate-500 line-clamp-2">{selectedTemplateForProcess.description}</p>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tareas incluidas</p>
                        {selectedTemplateForProcess.tasks.slice(0, 6).map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-[12px] text-slate-600">
                            <CheckCircle2 className="size-3.5 shrink-0 text-brand-400" />{task.title}
                          </div>
                        ))}
                        {selectedTemplateForProcess.tasks.length > 6 && (
                          <p className="text-[11px] text-slate-400">+{selectedTemplateForProcess.tasks.length - 6} tareas más</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <ListChecks className="mx-auto mb-2 size-8 text-slate-200" />
                      <p className="text-sm font-medium text-slate-400">Vista previa de plantilla</p>
                      <p className="mt-1 text-[12px] text-slate-400">Selecciona una plantilla para ver sus tareas.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <ModalFooter
            onClose={() => setProcessModal(null)}
            onConfirm={() => startProcess.mutate()}
            confirmLabel={startProcess.isPending ? "Iniciando..." : "Iniciar proceso"}
            loading={startProcess.isPending}
          />
        </div>
      </ModalShell>

      {/* ══════════════════════════════════════════ MODAL VER PROCESO ══ */}
      <ModalShell
        open={processModal === "view" && !!selectedProcess}
        onClose={() => setProcessModal(null)}
        title={selectedProcess?.employeeName ?? "Detalle del proceso"}
        subtitle={selectedProcess ? `${selectedProcess.templateName} · ${processStatus(selectedProcess).label}` : ""}
      >
        {selectedProcess ? (
          <div className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {/* Progress */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-slate-700">Progreso total</span>
                  <StatusBadge variant={processStatus(selectedProcess).variant} label={processStatus(selectedProcess).label} />
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, selectedProcess.progressPercent))}%` }} />
                </div>
                <p className="mt-2 text-[12px] text-slate-500">{selectedProcess.completedTasks} de {selectedProcess.totalTasks} tareas completadas · {Math.round(selectedProcess.progressPercent)}%</p>
              </div>

              {/* Tasks */}
              <SectionTitle icon={ClipboardList} label="Tareas del proceso" />
              <div className="space-y-2">
                {selectedProcess.tasks.map((task) => (
                  <div key={task.id} className={cn("flex items-start gap-3 rounded-xl border p-3 transition", task.isCompleted ? "border-emerald-100 bg-emerald-50/60" : "border-slate-200 bg-white")}>
                    <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", task.isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                      {task.isCompleted ? <CheckCircle2 className="size-4" /> : <ClipboardList className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[13px] font-semibold", task.isCompleted ? "text-emerald-800 line-through decoration-emerald-400" : "text-slate-800")}>{task.title}</p>
                      {task.description && <p className="text-[12px] text-slate-500">{task.description}</p>}
                      {task.completedAtUtc && <p className="mt-0.5 text-[11px] text-emerald-600">Completada el {formatDate(task.completedAtUtc)}{task.completedByUserName ? ` por ${task.completedByUserName}` : ""}</p>}
                    </div>
                    {selectedProcess.isActive && !selectedProcess.completedAtUtc && !task.isCompleted && (
                      <button onClick={() => action.mutate(() => completeOnboardingTask(selectedProcess.id, task.id))}
                        className="inline-flex h-8 shrink-0 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100">
                        Completar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setProcessModal(null)} className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Cerrar
                </button>
                {selectedProcess.isActive && !selectedProcess.completedAtUtc && (
                  <button onClick={() => action.mutate(() => completeOnboardingProcess(selectedProcess.id))}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:from-emerald-500 hover:to-emerald-700">
                    <CheckCircle2 className="size-4" />Finalizar proceso
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </ModalShell>

      {/* ══════════════════════════════════════════ MODAL VER PLANTILLA ══ */}
      <ModalShell
        open={templateModal === "view" && !!selectedTemplate}
        onClose={() => setTemplateModal(null)}
        title={selectedTemplate?.name ?? "Detalle de plantilla"}
        subtitle={selectedTemplate?.description ?? ""}
      >
        {selectedTemplate ? (
          <div className="flex flex-col overflow-hidden">
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Tareas",    value: selectedTemplate.tasks.length },
                  { label: "Estado",    value: selectedTemplate.isActive ? "Activa" : "Inactiva" },
                  { label: "Creación",  value: formatDate(selectedTemplate.createdAtUtc) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="mt-1 text-[14px] font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <SectionTitle icon={ClipboardList} label="Tareas incluidas" />
              <div className="space-y-2">
                {selectedTemplate.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700">{task.sortOrder}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800">{task.title}</p>
                      {task.description && <p className="text-[12px] text-slate-500">{task.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setTemplateModal(null)} className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">Cerrar</button>
                <button onClick={() => openEdit(selectedTemplate)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:from-brand-500 hover:to-brand-700">
                  <Pencil className="size-4" />Editar plantilla
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </ModalShell>

    </section>
  );
}

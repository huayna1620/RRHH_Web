import { useMemo, useState, type JSX } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Filter,
  KeyRound,
  Layers3,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import { getAuditLogs } from "@/modules/audit/services/auditApi";
import type { AuditLogItem, AuditLogQuery } from "@/modules/audit/types/audit.types";

type Tone = "teal" | "blue" | "amber" | "rose" | "slate" | "violet";
type AuditResult = "success" | "warning" | "error" | "rejected";

const pageSizeOptions = [10, 25, 50, 100];
const defaultQuery: AuditLogQuery = {
  search: "",
  module: "",
  action: "",
  userName: "",
  userId: "",
  from: "",
  to: "",
  pageNumber: 1,
  pageSize: 10,
};

const moduleLabels: Record<string, string> = {
  payroll: "Nómina",
  "payroll.concepts": "Conceptos de nómina",
  "payroll.loans": "Préstamos",
  vacations: "Vacaciones",
  leaves: "Permisos",
  employees: "Empleados",
  users: "Usuarios",
  roles: "Roles",
  security: "Seguridad",
  "org.areas": "Áreas",
  "org.positions": "Cargos",
  organization: "Organización",
  attendance: "Asistencia",
  documents: "Documentos",
  configuration: "Configuración",
  integrations: "Integraciones",
  auditlog: "Auditoría",
};

const actionLabels: Record<string, string> = {
  create: "Crear",
  update: "Editar",
  edit: "Editar",
  approve: "Aprobar",
  reject: "Rechazar",
  activate: "Activar",
  deactivate: "Desactivar",
  generate: "Generar",
  export: "Exportar",
  delete: "Eliminar",
  cancel: "Cancelar",
  payment: "Pago",
  adjust: "Ajustar",
  unapprove: "Revertir aprobación",
  "mark-paid": "Marcar pagado",
  login: "Iniciar sesión",
};

const toneClasses: Record<Tone, { soft: string; icon: string; text: string; ring: string }> = {
  teal: { soft: "bg-teal-50", icon: "bg-teal-100 text-teal-700", text: "text-teal-700", ring: "ring-teal-200" },
  blue: { soft: "bg-blue-50", icon: "bg-blue-100 text-blue-700", text: "text-blue-700", ring: "ring-blue-200" },
  amber: { soft: "bg-amber-50", icon: "bg-amber-100 text-amber-700", text: "text-amber-700", ring: "ring-amber-200" },
  rose: { soft: "bg-rose-50", icon: "bg-rose-100 text-rose-700", text: "text-rose-700", ring: "ring-rose-200" },
  slate: { soft: "bg-slate-50", icon: "bg-slate-100 text-slate-700", text: "text-slate-700", ring: "ring-slate-200" },
  violet: { soft: "bg-violet-50", icon: "bg-violet-100 text-violet-700", text: "text-violet-700", ring: "ring-violet-200" },
};

function normalizeModule(module: string): string {
  const key = module.trim().toLowerCase();
  return moduleLabels[key] ?? moduleLabels[key.split(".")[0]] ?? (module || "Sistema");
}

function normalizeAction(action: string): string {
  const key = action.trim().toLowerCase();
  return actionLabels[key] ?? actionLabels[key.replace("_", "-")] ?? (action || "Evento");
}

function actionTone(action: string): Tone {
  const key = action.toLowerCase();
  if (["delete", "reject", "deactivate", "cancel"].includes(key)) return "rose";
  if (["approve", "activate", "mark-paid", "payment"].includes(key)) return "teal";
  if (["create", "generate"].includes(key)) return "blue";
  if (["update", "adjust", "unapprove"].includes(key)) return "amber";
  return "slate";
}

function inferResult(item: AuditLogItem): AuditResult {
  const action = item.action.toLowerCase();
  const details = (item.details ?? "").toLowerCase();
  if (details.includes("error") || details.includes("failed") || details.includes("fall")) return "error";
  if (["reject", "cancel"].includes(action)) return "rejected";
  if (["delete", "deactivate", "unapprove"].includes(action)) return "warning";
  return "success";
}

function resultInfo(result: AuditResult): { label: string; tone: Tone; icon: JSX.Element } {
  if (result === "error") return { label: "Error", tone: "rose", icon: <XCircle className="size-3.5" /> };
  if (result === "rejected") return { label: "Rechazado", tone: "rose", icon: <XCircle className="size-3.5" /> };
  if (result === "warning") return { label: "Advertencia", tone: "amber", icon: <AlertTriangle className="size-3.5" /> };
  return { label: "Éxito", tone: "teal", icon: <CheckCircle2 className="size-3.5" /> };
}

function isCritical(item: AuditLogItem): boolean {
  const action = item.action.toLowerCase();
  const details = (item.details ?? "").toLowerCase();
  return ["delete", "reject", "deactivate", "unapprove"].includes(action) || details.includes("error");
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return formatTimestamp(value).slice(0, 10);
}

function initials(name: string): string {
  return (name || "Sistema").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}

function entityLabel(item: AuditLogItem): { primary: string; secondary: string } {
  const detail = item.details?.trim();
  if (detail && detail.length <= 90 && !detail.includes("=")) {
    return { primary: detail, secondary: `${item.entityType} ${item.entityId.slice(0, 8)}` };
  }
  if (detail?.includes(" - ")) {
    return { primary: detail.split(" - ").slice(0, 2).join(" - "), secondary: item.entityType };
  }
  return { primary: item.entityType || "Entidad", secondary: item.entityId ? `ID ${item.entityId.slice(0, 8)}` : "Sin código" };
}

function Badge({ children, tone = "slate", icon }: { children: string; tone?: Tone; icon?: JSX.Element }): JSX.Element {
  const colors = toneClasses[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1", colors.soft, colors.text, colors.ring)}>
      {icon}
      {children}
    </span>
  );
}

function KpiCard({ title, value, helper, icon, tone }: { title: string; value: string | number; helper: string; icon: JSX.Element; tone: Tone }): JSX.Element {
  const colors = toneClasses[tone];
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-xl", colors.icon)}>{icon}</div>
      </div>
    </div>
  );
}

function parseDetails(details: string | null): Array<{ key: string; value: string }> {
  if (!details) return [];
  const trimmed = details.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return Object.entries(parsed).map(([key, value]) => ({ key, value: typeof value === "object" ? JSON.stringify(value) : String(value ?? "") }));
  } catch {
    // Details in the current backend are often stored as "key=value key=value".
  }

  const pairs = trimmed.match(/[\wÁÉÍÓÚÑáéíóúñ.-]+=[^,;\n]+/g);
  if (pairs?.length) {
    return pairs.map((pair) => {
      const [key, ...value] = pair.split("=");
      return { key, value: value.join("=").trim() };
    });
  }

  return [{ key: "Detalle", value: trimmed }];
}

function exportAudit(format: ExportFormat, rows: AuditLogItem[], query: AuditLogQuery): void {
  exportRows(
    format,
    rows.map((item) => {
      const entity = entityLabel(item);
      const result = resultInfo(inferResult(item));
      return {
        "Fecha y hora": formatTimestamp(item.timestamp),
        Usuario: item.userName || "Sistema",
        Módulo: normalizeModule(item.module),
        Acción: normalizeAction(item.action),
        Entidad: entity.primary,
        "Código interno": entity.secondary,
        IP: item.ipAddress ?? "",
        Resultado: result.label,
        Detalles: item.details ?? "",
      };
    }),
    makeFileName("Auditoria", [query.module || "todos", query.from, query.to]),
    "Eventos de auditoría",
    {
      title: "Eventos de auditoría",
      subtitle: "Registro de actividad del sistema según los filtros aplicados.",
      filters: [
        { label: "Búsqueda", value: query.search },
        { label: "Módulo", value: query.module ? normalizeModule(query.module) : "Todos" },
        { label: "Acción", value: query.action ? normalizeAction(query.action) : "Todas" },
        { label: "Usuario", value: query.userName },
        { label: "Desde", value: query.from },
        { label: "Hasta", value: query.to },
      ],
    }
  );
}

export function PaginaAuditoria(): JSX.Element {
  const [query, setQuery] = useState<AuditLogQuery>(defaultQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const listQuery = useQuery({ queryKey: ["audit-logs", query], queryFn: () => getAuditLogs(query) });
  const today = new Date().toISOString().slice(0, 10);
  const todayQuery = useQuery({
    queryKey: ["audit-logs", "today-summary"],
    queryFn: () => getAuditLogs({ ...defaultQuery, from: today, pageSize: 100 }),
  });

  const rows = listQuery.data?.items ?? [];
  const summaryRows = todayQuery.data?.items ?? rows;
  const total = listQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;

  const modules = useMemo(() => Array.from(new Set(summaryRows.concat(rows).map((item) => item.module).filter(Boolean))).sort(), [summaryRows, rows]);
  const actions = useMemo(() => Array.from(new Set(summaryRows.concat(rows).map((item) => item.action).filter(Boolean))).sort(), [summaryRows, rows]);

  const kpis = useMemo(() => {
    const eventsToday = todayQuery.data?.totalCount ?? summaryRows.length;
    const users = new Set(summaryRows.map((item) => item.userName).filter(Boolean)).size;
    const auditedModules = new Set(summaryRows.concat(rows).map((item) => item.module).filter(Boolean)).size;
    const critical = summaryRows.filter(isCritical).length;
    return { eventsToday, users, auditedModules, critical };
  }, [rows, summaryRows, todayQuery.data?.totalCount]);

  const setQueryValue = <K extends keyof AuditLogQuery>(key: K, value: AuditLogQuery[K]): void => {
    setQuery((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? Number(value) : 1 }));
  };

  const details = parseDetails(selected?.details ?? null);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Trazabilidad SAE - RRHH</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Auditoría</h1>
          <p className="mt-1 text-sm text-slate-500">Registro de actividad del sistema, cambios sensibles y seguimiento por usuario.</p>
        </div>
        <div className="relative">
          <Button variant="secondary" onClick={() => setExportOpen((open) => !open)}><Download className="size-4" />Exportar</Button>
          {exportOpen && (
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl">
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => { exportAudit("excel", rows, query); setExportOpen(false); }}><FileSpreadsheet className="size-4 text-teal-700" />Excel</button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => { exportAudit("csv", rows, query); setExportOpen(false); }}><FileDown className="size-4 text-blue-700" />CSV</button>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => { exportAudit("pdf", rows, query); setExportOpen(false); }}><FileDown className="size-4 text-rose-700" />PDF</button>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Eventos hoy" value={kpis.eventsToday} helper="Actividad registrada en la fecha" icon={<Clock3 className="size-5" />} tone="teal" />
        <KpiCard title="Usuarios activos" value={kpis.users} helper="Usuarios con eventos recientes" icon={<Users className="size-5" />} tone="blue" />
        <KpiCard title="Módulos auditados" value={kpis.auditedModules} helper="Áreas con trazabilidad visible" icon={<Layers3 className="size-5" />} tone="violet" />
        <KpiCard title="Alertas críticas" value={kpis.critical} helper="Eliminaciones, rechazos o desactivaciones" icon={<AlertTriangle className="size-5" />} tone="rose" />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_180px_170px_180px_150px_150px_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar eventos" value={query.search} onChange={(event) => setQueryValue("search", event.target.value)} />
          </div>
          <Select value={query.module} onChange={(event) => setQueryValue("module", event.target.value)}>
            <option value="">Todos los módulos</option>
            {modules.map((module) => <option key={module} value={module}>{normalizeModule(module)}</option>)}
          </Select>
          <Select value={query.action} onChange={(event) => setQueryValue("action", event.target.value)}>
            <option value="">Todas las acciones</option>
            {actions.map((action) => <option key={action} value={action}>{normalizeAction(action)}</option>)}
          </Select>
          <Input placeholder="Usuario" value={query.userName} onChange={(event) => setQueryValue("userName", event.target.value)} />
          <Input type="date" value={query.from} onChange={(event) => setQueryValue("from", event.target.value)} />
          <Input type="date" value={query.to} onChange={(event) => setQueryValue("to", event.target.value)} />
          <Button variant="secondary" onClick={() => setQuery(defaultQuery)}><Filter className="size-4" />Limpiar</Button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Eventos del sistema</h2>
              <p className="text-sm text-slate-500">{total.toLocaleString("es-PE")} eventos encontrados con los filtros actuales.</p>
            </div>
            {listQuery.isFetching && <span className="text-xs font-black text-teal-700">Actualizando...</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Fecha y hora</th>
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Módulo</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Entidad</th>
                  <th className="px-5 py-3">IP</th>
                  <th className="px-5 py-3">Resultado</th>
                  <th className="px-5 py-3 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((item) => {
                  const entity = entityLabel(item);
                  const result = resultInfo(inferResult(item));
                  return (
                    <tr key={item.id} className={cn("transition hover:bg-slate-50", selected?.id === item.id && "bg-teal-50/50")}>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{formatTimestamp(item.timestamp)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{initials(item.userName)}</div>
                          <div>
                            <p className="font-black text-slate-900">{item.userName || "Sistema"}</p>
                            <p className="text-xs text-slate-500">{item.userId ? "Usuario autenticado" : "Proceso interno"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Badge tone="blue">{normalizeModule(item.module)}</Badge></td>
                      <td className="px-5 py-4"><Badge tone={actionTone(item.action)}>{normalizeAction(item.action)}</Badge></td>
                      <td className="px-5 py-4">
                        <p className="max-w-[220px] truncate font-semibold text-slate-800">{entity.primary}</p>
                        <p className="text-xs text-slate-500">{entity.secondary}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">{item.ipAddress ?? "No registrada"}</td>
                      <td className="px-5 py-4"><Badge tone={result.tone} icon={result.icon}>{result.label}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedId(item.id)} title="Ver detalle"><Eye className="size-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={8}>No se encontraron eventos de auditoría.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">Mostrando {rows.length} de {total.toLocaleString("es-PE")} eventos</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select className="w-32" value={String(query.pageSize)} onChange={(event) => setQuery((current) => ({ ...current, pageSize: Number(event.target.value), pageNumber: 1 }))}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size} por página</option>)}
              </Select>
              <Button variant="secondary" disabled={query.pageNumber <= 1} onClick={() => setQueryValue("pageNumber", query.pageNumber - 1)}><ChevronLeft className="size-4" />Anterior</Button>
              <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">{query.pageNumber} / {totalPages}</span>
              <Button variant="secondary" disabled={query.pageNumber >= totalPages} onClick={() => setQueryValue("pageNumber", query.pageNumber + 1)}>Siguiente<ChevronRight className="size-4" /></Button>
            </div>
          </footer>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ShieldCheck className="size-5" /></div>
              <div>
                <h2 className="text-base font-black text-slate-950">Detalle del evento</h2>
                <p className="text-sm text-slate-500">Trazabilidad del registro seleccionado.</p>
              </div>
            </div>

            {selected ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Evento</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{normalizeAction(selected.action)} en {normalizeModule(selected.module)}</p>
                  <p className="text-sm text-slate-500">{formatTimestamp(selected.timestamp)}</p>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Usuario</dt><dd className="text-right font-bold text-slate-800">{selected.userName || "Sistema"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Entidad</dt><dd className="text-right font-bold text-slate-800">{entityLabel(selected).primary}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">IP</dt><dd className="font-mono text-xs text-slate-800">{selected.ipAddress ?? "No registrada"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Resultado</dt><dd><Badge tone={resultInfo(inferResult(selected)).tone}>{resultInfo(inferResult(selected)).label}</Badge></dd></div>
                </dl>

                <section className="rounded-2xl border border-slate-100 p-4">
                  <h3 className="text-sm font-black text-slate-950">Observaciones</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.details || "Este evento no incluye observaciones adicionales."}</p>
                </section>

                <section className="rounded-2xl border border-slate-100 p-4">
                  <h3 className="text-sm font-black text-slate-950">Cambios realizados</h3>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-xl bg-rose-50 p-3">
                      <p className="text-xs font-black uppercase text-rose-700">Antes</p>
                      <p className="mt-1 text-sm text-rose-900">No existe comparación estructurada antes/después para este evento.</p>
                    </div>
                    <div className="rounded-xl bg-teal-50 p-3">
                      <p className="text-xs font-black uppercase text-teal-700">Después</p>
                      {details.length > 0 ? (
                        <dl className="mt-2 space-y-1 text-sm">
                          {details.slice(0, 6).map((detail) => (
                            <div key={`${detail.key}-${detail.value}`} className="flex justify-between gap-3">
                              <dt className="font-semibold text-teal-900">{detail.key}</dt>
                              <dd className="text-right text-teal-800">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-1 text-sm text-teal-900">Evento registrado correctamente, sin payload adicional.</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">Selecciona un evento para revisar su detalle.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Actividad reciente</h2>
              <Activity className="size-5 text-teal-700" />
            </div>
            <div className="mt-4 space-y-4">
              {rows.slice(0, 5).map((item) => {
                const entity = entityLabel(item);
                return (
                  <div key={`activity-${item.id}`} className="flex gap-3">
                    <div className={cn("mt-0.5 flex size-9 items-center justify-center rounded-xl", toneClasses[actionTone(item.action)].icon)}>
                      <KeyRound className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-5 text-slate-800">
                        {item.userName || "Sistema"} {normalizeAction(item.action).toLowerCase()} {entity.primary}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="slate">{normalizeModule(item.module)}</Badge>
                        <span className="text-xs font-semibold text-slate-400">{relativeTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && <p className="text-sm text-slate-500">No hay actividad reciente para mostrar.</p>}
            </div>
            <Button className="mt-5 w-full" variant="secondary" onClick={() => setQuery((current) => ({ ...current, pageNumber: Math.min(totalPages, current.pageNumber + 1) }))} disabled={query.pageNumber >= totalPages}>
              Ver más actividad
            </Button>
          </section>

          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-sm font-black text-amber-900">Preparado para auditoría avanzada</h3>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  El backend actual no guarda before/after ni severidad formal. La interfaz ya reserva ese espacio y muestra los detalles disponibles sin inventar datos.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

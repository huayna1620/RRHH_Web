import { useMemo, useState, type JSX, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Eye,
  FileDown,
  FileSpreadsheet,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  Trash2,
  Webhook,
  X,
  XCircle,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import { cn } from "@/lib/utils/cn";
import {
  createApiToken,
  createWebhook,
  deleteWebhook,
  getApiTokens,
  getWebhookDeliveries,
  getWebhookEvents,
  getWebhooks,
  revokeApiToken,
  rotateApiToken,
  testWebhook,
  toggleWebhook,
} from "@/modules/integrations/services/integrationsApi";
import type {
  ApiToken,
  ApiTokenCreated,
  CreateApiTokenPayload,
  CreateWebhookPayload,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEvent,
  WebhookPayloadFormat,
} from "@/modules/integrations/types/integrations.types";

type Tab = "tokens" | "webhooks";
type Tone = "teal" | "blue" | "amber" | "rose" | "slate" | "violet";
type TokenStatusFilter = "todos" | "activos" | "inactivos" | "expirados";
type WebhookStatusFilter = "todos" | "activos" | "inactivos" | "error" | "sin-entregas";

type TokenForm = {
  name: string;
  description: string;
  expirationDays: string;
  responsible: string;
  ipRestriction: string;
  autoRotation: boolean;
  readOnly: boolean;
  environment: "production" | "test";
  scopes: string[];
};

type WebhookForm = {
  name: string;
  url: string;
  description: string;
  format: WebhookPayloadFormat;
  timeoutSeconds: string;
  sslVerification: boolean;
  automaticRetries: boolean;
  maxRetries: string;
  environment: "production" | "test";
  events: string[];
};

const emptyTokenForm: TokenForm = {
  name: "",
  description: "",
  expirationDays: "90",
  responsible: "",
  ipRestriction: "",
  autoRotation: false,
  readOnly: false,
  environment: "production",
  scopes: ["employees:read"],
};

const emptyWebhookForm: WebhookForm = {
  name: "",
  url: "",
  description: "",
  format: "raw",
  timeoutSeconds: "15",
  sslVerification: true,
  automaticRetries: true,
  maxRetries: "3",
  environment: "production",
  events: [],
};

const tokenScopes = [
  { value: "employees:read", label: "Empleados", hint: "Lectura de colaboradores", group: "Lectura" },
  { value: "employees:write", label: "Empleados", hint: "Creación y edición", group: "Escritura" },
  { value: "attendance:read", label: "Asistencia", hint: "Registros y marcaciones", group: "Lectura" },
  { value: "vacations:read", label: "Vacaciones", hint: "Solicitudes y saldos", group: "Lectura" },
  { value: "leaves:read", label: "Permisos", hint: "Permisos y licencias", group: "Lectura" },
  { value: "payroll:read", label: "Planilla", hint: "Lectura de nómina", group: "Nómina" },
  { value: "payroll:write", label: "Conceptos", hint: "Cambios de conceptos", group: "Nómina" },
  { value: "documents:read", label: "Documentos", hint: "Documentos laborales", group: "Documentos" },
  { value: "reports:read", label: "Reportes", hint: "Exportación y reportes", group: "Reportes" },
  { value: "analytics:read", label: "Analítica", hint: "Indicadores ejecutivos", group: "Reportes" },
  { value: "webhooks:manage", label: "Webhooks", hint: "Administración técnica", group: "Integraciones" },
  { value: "audit:read", label: "Auditoría", hint: "Trazabilidad del sistema", group: "Seguridad" },
];

const payloadFormats: Array<{ value: WebhookPayloadFormat; label: string; hint: string }> = [
  { value: "raw", label: "Genérico JSON", hint: "Payload estándar firmado con HMAC." },
  { value: "slack", label: "Slack", hint: "Mensaje listo para Slack Block Kit." },
  { value: "teams", label: "Microsoft Teams", hint: "MessageCard para canales de Teams." },
];

const toneClasses: Record<Tone, { soft: string; icon: string; text: string; ring: string; border: string }> = {
  teal: { soft: "bg-teal-50", icon: "bg-teal-100 text-teal-700", text: "text-teal-700", ring: "ring-teal-200", border: "border-teal-100" },
  blue: { soft: "bg-blue-50", icon: "bg-blue-100 text-blue-700", text: "text-blue-700", ring: "ring-blue-200", border: "border-blue-100" },
  amber: { soft: "bg-amber-50", icon: "bg-amber-100 text-amber-700", text: "text-amber-700", ring: "ring-amber-200", border: "border-amber-100" },
  rose: { soft: "bg-rose-50", icon: "bg-rose-100 text-rose-700", text: "text-rose-700", ring: "ring-rose-200", border: "border-rose-100" },
  slate: { soft: "bg-slate-50", icon: "bg-slate-100 text-slate-700", text: "text-slate-700", ring: "ring-slate-200", border: "border-slate-100" },
  violet: { soft: "bg-violet-50", icon: "bg-violet-100 text-violet-700", text: "text-violet-700", ring: "ring-violet-200", border: "border-violet-100" },
};

function formatDate(value: string | null): string {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function relativeDate(value: string | null): string {
  if (!value) return "Nunca";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 8) return `Hace ${days} días`;
  return formatDate(value);
}

function isExpired(token: ApiToken): boolean {
  return Boolean(token.expiresAtUtc && new Date(token.expiresAtUtc).getTime() < Date.now());
}

function tokenStatus(token: ApiToken): { label: string; tone: Tone } {
  if (!token.isActive) return { label: "Revocado", tone: "rose" };
  if (isExpired(token)) return { label: "Expirado", tone: "amber" };
  return { label: "Activo", tone: "teal" };
}

function webhookStatus(webhook: WebhookEndpoint): { label: string; tone: Tone } {
  if (!webhook.isActive) return { label: "Pausado", tone: "slate" };
  if (!webhook.lastDeliveryAtUtc) return { label: "Sin entregas", tone: "blue" };
  if (webhook.lastDeliverySuccess === false) return { label: webhook.failureCount > 1 ? "Reintento" : "Error", tone: "rose" };
  return { label: "Activo", tone: "teal" };
}

function scopeLabel(scope: string): string {
  const found = tokenScopes.find((item) => item.value === scope);
  if (found) return found.label;
  return scope
    .replace(/:/g, " · ")
    .replace(/\bread\b/i, "Lectura")
    .replace(/\bwrite\b/i, "Escritura")
    .replace(/\bmanage\b/i, "Gestión");
}

function eventLabel(eventType: string, events: WebhookEvent[]): string {
  const found = events.find((item) => item.eventType === eventType);
  if (found) return found.description;
  return eventType
    .replace(/\./g, " ")
    .replace(/\bcreated\b/g, "creado")
    .replace(/\bupdated\b/g, "actualizado")
    .replace(/\bsigned\b/g, "firmado");
}

function initials(value: string): string {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "IN";
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function makeTokenPrefix(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `hrms_${(clean || "nuevo").slice(0, 6)}_***`;
}

function statusMatchesToken(token: ApiToken, status: TokenStatusFilter): boolean {
  if (status === "todos") return true;
  if (status === "activos") return token.isActive && !isExpired(token);
  if (status === "inactivos") return !token.isActive;
  return isExpired(token);
}

function statusMatchesWebhook(webhook: WebhookEndpoint, status: WebhookStatusFilter): boolean {
  if (status === "todos") return true;
  if (status === "activos") return webhook.isActive && webhook.lastDeliverySuccess !== false;
  if (status === "inactivos") return !webhook.isActive;
  if (status === "error") return webhook.lastDeliverySuccess === false;
  return !webhook.lastDeliveryAtUtc;
}

function copyToClipboard(value: string, onDone: (message: string) => void): void {
  void navigator.clipboard?.writeText(value).then(
    () => onDone("Copiado al portapapeles."),
    () => onDone("No se pudo copiar automáticamente.")
  );
}

function Badge({ children, tone = "slate", icon }: { children: ReactNode; tone?: Tone; icon?: JSX.Element }): JSX.Element {
  const colors = toneClasses[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1", colors.soft, colors.text, colors.ring)}>
      {icon}
      {children}
    </span>
  );
}

function SwitchPill({ active }: { active: boolean }): JSX.Element {
  return (
    <span className={cn("inline-flex h-7 w-12 items-center rounded-full p-1 transition", active ? "bg-teal-500" : "bg-slate-300")}>
      <span className={cn("size-5 rounded-full bg-white shadow transition", active && "translate-x-5")} />
    </span>
  );
}

function KpiCard({ title, value, helper, icon, tone }: { title: string; value: string | number; helper: string; icon: JSX.Element; tone: Tone }): JSX.Element {
  const colors = toneClasses[tone];
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-xl", colors.icon)}>{icon}</div>
      </div>
    </section>
  );
}

function PremiumModal({ open, title, subtitle, icon, onClose, children, footer }: { open: boolean; title: string; subtitle: string; icon: JSX.Element; onClose: () => void; children: ReactNode; footer: ReactNode }): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm lg:items-center lg:p-5">
      <section className="flex max-h-[94dvh] w-full max-w-7xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl lg:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-5 text-white lg:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-500/25">{icon}</div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black tracking-tight">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
            </div>
          </div>
          <button className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white" type="button" onClick={onClose} aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 lg:p-7">{children}</div>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end lg:px-7">{footer}</footer>
      </section>
    </div>
  );
}

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }): JSX.Element {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-800">{label}{required && <span className="text-rose-600"> *</span>}</span>
      {hint && <span className="mt-0.5 block text-xs font-semibold text-slate-500">{hint}</span>}
    </label>
  );
}

function exportTokens(format: ExportFormat, tokens: ApiToken[]): void {
  exportRows(
    format,
    tokens.map((token) => ({
      Nombre: token.name,
      Prefijo: token.tokenPrefix,
      Alcances: token.scopes.map(scopeLabel).join(", "),
      Creado: formatDate(token.createdAtUtc),
      "Último uso": formatDateTime(token.lastUsedAtUtc),
      Expira: token.expiresAtUtc ? formatDate(token.expiresAtUtc) : "Sin expiración",
      Estado: tokenStatus(token).label,
    })),
    makeFileName("Tokens_API", []),
    "Tokens de API",
    { title: "Tokens de API", subtitle: "Inventario operativo de credenciales de integración.", metrics: [{ label: "Total tokens", value: tokens.length }] }
  );
}

function exportWebhooks(format: ExportFormat, webhooks: WebhookEndpoint[], events: WebhookEvent[]): void {
  exportRows(
    format,
    webhooks.map((webhook) => ({
      Nombre: webhook.name,
      URL: webhook.url,
      Eventos: webhook.events.map((event) => eventLabel(event, events)).join(", "),
      Método: "POST",
      "Última entrega": formatDateTime(webhook.lastDeliveryAtUtc),
      Fallos: webhook.failureCount,
      Estado: webhookStatus(webhook).label,
    })),
    makeFileName("Webhooks", []),
    "Webhooks",
    { title: "Webhooks", subtitle: "Configuración y salud de endpoints externos.", metrics: [{ label: "Total webhooks", value: webhooks.length }] }
  );
}

export function PaginaIntegraciones(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("tokens");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [tokenForm, setTokenForm] = useState<TokenForm>(emptyTokenForm);
  const [webhookForm, setWebhookForm] = useState<WebhookForm>(emptyWebhookForm);
  const [generatedToken, setGeneratedToken] = useState<ApiTokenCreated | null>(null);
  const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState<WebhookEndpoint | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenStatusFilter, setTokenStatusFilter] = useState<TokenStatusFilter>("todos");
  const [tokenScopeFilter, setTokenScopeFilter] = useState("");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState<WebhookStatusFilter>("todos");
  const [exportOpen, setExportOpen] = useState(false);

  const tokensQuery = useQuery({ queryKey: ["api-tokens"], queryFn: getApiTokens });
  const webhooksQuery = useQuery({ queryKey: ["webhooks"], queryFn: getWebhooks });
  const eventsQuery = useQuery({ queryKey: ["webhook-events"], queryFn: getWebhookEvents });

  const tokens = tokensQuery.data ?? [];
  const webhooks = webhooksQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const selectedToken = tokens.find((token) => token.id === selectedTokenId) ?? tokens[0] ?? null;
  const selectedWebhook = webhooks.find((webhook) => webhook.id === selectedWebhookId) ?? webhooks[0] ?? null;

  const deliveriesQuery = useQuery({
    queryKey: ["webhook-deliveries", selectedWebhook?.id],
    queryFn: () => getWebhookDeliveries(selectedWebhook!.id),
    enabled: Boolean(selectedWebhook?.id),
  });

  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] }),
      queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] }),
    ]);
  };

  const ok = (message: string): void => setFeedback({ type: "success", message });
  const fail = (message: string): void => setFeedback({ type: "error", message });

  const createTokenMutation = useMutation({
    mutationFn: (payload: CreateApiTokenPayload) => createApiToken(payload),
    onSuccess: async (result) => {
      await refresh();
      setGeneratedToken(result);
      setTokenForm(emptyTokenForm);
      ok("Token generado correctamente. Copia la clave completa ahora.");
    },
    onError: () => fail("No se pudo crear el token. Revisa los datos e intenta nuevamente."),
  });

  const revokeTokenMutation = useMutation({
    mutationFn: (id: string) => revokeApiToken(id),
    onSuccess: async () => { await refresh(); ok("Token revocado correctamente."); },
    onError: () => fail("No se pudo revocar el token."),
  });

  const rotateTokenMutation = useMutation({
    mutationFn: (id: string) => rotateApiToken(id),
    onSuccess: async (result) => {
      await refresh();
      setGeneratedToken(result);
      ok("Token rotado correctamente. La nueva clave solo se mostrará una vez.");
    },
    onError: () => fail("No se pudo rotar el token."),
  });

  const createWebhookMutation = useMutation({
    mutationFn: (payload: CreateWebhookPayload) => createWebhook(payload),
    onSuccess: async (result) => {
      await refresh();
      setGeneratedWebhookSecret(result);
      setWebhookForm(emptyWebhookForm);
      ok("Webhook creado correctamente.");
    },
    onError: () => fail("No se pudo crear el webhook. Verifica la URL y los eventos."),
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: async () => { await refresh(); ok("Webhook eliminado."); },
    onError: () => fail("No se pudo eliminar el webhook."),
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: (id: string) => toggleWebhook(id),
    onSuccess: async () => { await refresh(); ok("Estado del webhook actualizado."); },
    onError: () => fail("No se pudo actualizar el webhook."),
  });

  const testWebhookMutation = useMutation({
    mutationFn: (id: string) => testWebhook(id),
    onSuccess: async () => { await refresh(); ok("Evento de prueba enviado."); },
    onError: () => fail("No se pudo enviar el evento de prueba."),
  });

  const filteredTokens = useMemo(() => {
    const search = tokenSearch.trim().toLowerCase();
    return tokens.filter((token) => {
      const matchesSearch = !search || token.name.toLowerCase().includes(search) || (token.description ?? "").toLowerCase().includes(search) || token.tokenPrefix.toLowerCase().includes(search);
      const matchesStatus = statusMatchesToken(token, tokenStatusFilter);
      const matchesScope = !tokenScopeFilter || token.scopes.includes(tokenScopeFilter);
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [tokens, tokenScopeFilter, tokenSearch, tokenStatusFilter]);

  const filteredWebhooks = useMemo(() => {
    const search = webhookSearch.trim().toLowerCase();
    return webhooks.filter((webhook) => {
      const matchesSearch = !search || webhook.name.toLowerCase().includes(search) || webhook.url.toLowerCase().includes(search) || (webhook.description ?? "").toLowerCase().includes(search);
      return matchesSearch && statusMatchesWebhook(webhook, webhookStatusFilter);
    });
  }, [webhooks, webhookSearch, webhookStatusFilter]);

  const kpis = useMemo(() => {
    const tokensActive = tokens.filter((token) => token.isActive && !isExpired(token)).length;
    const webhooksActive = webhooks.filter((webhook) => webhook.isActive).length;
    const callsToday = tokens.filter((token) => token.lastUsedAtUtc && new Date(token.lastUsedAtUtc).toDateString() === new Date().toDateString()).length;
    const failedEvents = webhooks.reduce((total, webhook) => total + (webhook.lastDeliverySuccess === false ? Math.max(1, webhook.failureCount) : 0), 0);
    return { tokensActive, webhooksActive, callsToday, failedEvents };
  }, [tokens, webhooks]);

  const recentActivity = useMemo(() => {
    const tokenItems = tokens.slice(0, 4).map((token) => ({
      id: `token-${token.id}`,
      title: token.lastUsedAtUtc ? `Token "${token.name}" utilizado` : `Token "${token.name}" creado`,
      detail: token.lastUsedAtUtc ? `Último uso ${relativeDate(token.lastUsedAtUtc)}` : `Creado el ${formatDate(token.createdAtUtc)}`,
      tone: token.isActive ? "teal" as Tone : "rose" as Tone,
      date: token.lastUsedAtUtc ?? token.createdAtUtc,
    }));
    const webhookItems = webhooks.slice(0, 4).map((webhook) => ({
      id: `webhook-${webhook.id}`,
      title: webhook.lastDeliverySuccess === false ? `Webhook "${webhook.name}" con error` : `Webhook "${webhook.name}" activo`,
      detail: webhook.lastDeliveryAtUtc ? `Última entrega ${relativeDate(webhook.lastDeliveryAtUtc)}` : "Pendiente de primera entrega",
      tone: webhookStatus(webhook).tone,
      date: webhook.lastDeliveryAtUtc ?? webhook.createdAtUtc,
    }));
    return tokenItems.concat(webhookItems).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [tokens, webhooks]);

  const tokenFormErrors = {
    name: tokenForm.name.trim().length < 3,
    scopes: tokenForm.scopes.length === 0,
  };
  const webhookFormErrors = {
    name: webhookForm.name.trim().length < 3,
    url: !validateUrl(webhookForm.url),
    events: webhookForm.events.length === 0,
  };

  const submitToken = (): void => {
    if (tokenFormErrors.name || tokenFormErrors.scopes) {
      fail("Completa el nombre y selecciona al menos un alcance.");
      return;
    }
    createTokenMutation.mutate({
      name: tokenForm.name.trim(),
      description: tokenForm.description.trim(),
      expirationDays: tokenForm.expirationDays === "none" ? null : Number(tokenForm.expirationDays),
      scopes: tokenForm.scopes,
    });
  };

  const submitWebhook = (): void => {
    if (webhookFormErrors.name || webhookFormErrors.url || webhookFormErrors.events) {
      fail("Completa nombre, URL válida y al menos un evento.");
      return;
    }
    createWebhookMutation.mutate({
      name: webhookForm.name.trim(),
      url: webhookForm.url.trim(),
      description: webhookForm.description.trim(),
      events: webhookForm.events,
      format: webhookForm.format,
    });
  };

  const toggleScope = (scope: string): void => {
    setTokenForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope) ? current.scopes.filter((item) => item !== scope) : [...current.scopes, scope],
    }));
  };

  const toggleEvent = (eventType: string): void => {
    setWebhookForm((current) => ({
      ...current,
      events: current.events.includes(eventType) ? current.events.filter((item) => item !== eventType) : [...current.events, eventType],
    }));
  };

  const renderExportMenu = (): JSX.Element => (
    <div className="relative">
      <Button variant="secondary" onClick={() => setExportOpen((open) => !open)}><FileDown className="size-4" />Exportar<ChevronDown className="size-4" /></Button>
      {exportOpen && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 shadow-xl">
          {(["excel", "csv", "pdf"] as ExportFormat[]).map((format) => (
            <button
              key={format}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                if (tab === "tokens") exportTokens(format, filteredTokens);
                else exportWebhooks(format, filteredWebhooks, events);
                setExportOpen(false);
              }}
            >
              {format === "excel" ? <FileSpreadsheet className="size-4 text-teal-700" /> : <FileDown className="size-4 text-blue-700" />}
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const deliveryRows = deliveriesQuery.data ?? [];
  const selectedWebhookHealth = selectedWebhook ? webhookStatus(selectedWebhook) : null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Operación técnica SAE - RRHH</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Integraciones</h1>
          <p className="mt-1 text-sm text-slate-500">Tokens de API, webhooks, seguridad y trazabilidad de sistemas externos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setWebhookOpen(true)}><Webhook className="size-4" />Nuevo webhook</Button>
          <Button onClick={() => setTokenOpen(true)}><KeyRound className="size-4" />Nuevo token</Button>
        </div>
      </header>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      {generatedToken && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-amber-950">Clave generada para “{generatedToken.name}”</p>
              <p className="text-sm text-amber-800">Cópiala ahora. Por seguridad, el token completo no volverá a mostrarse.</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 lg:max-w-xl">
              <code className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{generatedToken.token}</code>
              <Button size="sm" variant="secondary" onClick={() => copyToClipboard(generatedToken.token, ok)}><Copy className="size-4" />Copiar</Button>
              <Button size="sm" variant="ghost" onClick={() => setGeneratedToken(null)}>Ocultar</Button>
            </div>
          </div>
        </section>
      )}

      {generatedWebhookSecret && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-teal-950">Webhook “{generatedWebhookSecret.name}” creado</p>
              <p className="text-sm text-teal-800">El secreto de firma se muestra una sola vez. Guárdalo en tu sistema receptor.</p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 lg:max-w-lg">
              <code className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{generatedWebhookSecret.secretMasked}</code>
              <Button size="sm" variant="secondary" onClick={() => copyToClipboard(generatedWebhookSecret.secretMasked, ok)}><Copy className="size-4" />Copiar</Button>
              <Button size="sm" variant="ghost" onClick={() => setGeneratedWebhookSecret(null)}>Ocultar</Button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Tokens activos" value={kpis.tokensActive} helper={`De ${tokens.length} tokens generados`} icon={<KeyRound className="size-5" />} tone="teal" />
        <KpiCard title="Webhooks activos" value={kpis.webhooksActive} helper={`De ${webhooks.length} webhooks configurados`} icon={<Webhook className="size-5" />} tone="blue" />
        <KpiCard title="Llamadas hoy" value={kpis.callsToday} helper="Basado en último uso registrado" icon={<Activity className="size-5" />} tone="violet" />
        <KpiCard title="Eventos fallidos" value={kpis.failedEvents} helper="Últimas entregas y fallos acumulados" icon={<AlertTriangle className="size-5" />} tone={kpis.failedEvents ? "rose" : "slate"} />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button className={cn("rounded-xl px-4 py-3 text-sm font-black transition", tab === "tokens" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")} onClick={() => setTab("tokens")} type="button">
            Tokens de API
          </button>
          <button className={cn("rounded-xl px-4 py-3 text-sm font-black transition", tab === "webhooks" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")} onClick={() => setTab("webhooks")} type="button">
            Webhooks
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          {tab === "tokens" ? (
            <>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_220px_auto] lg:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9" placeholder="Buscar token" value={tokenSearch} onChange={(event) => setTokenSearch(event.target.value)} />
                  </div>
                  <Select value={tokenStatusFilter} onChange={(event) => setTokenStatusFilter(event.target.value as TokenStatusFilter)}>
                    <option value="todos">Todos los estados</option>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Revocados</option>
                    <option value="expirados">Expirados</option>
                  </Select>
                  <Select value={tokenScopeFilter} onChange={(event) => setTokenScopeFilter(event.target.value)}>
                    <option value="">Todos los alcances</option>
                    {tokenScopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label} · {scope.group}</option>)}
                  </Select>
                  {renderExportMenu()}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-black text-slate-950">Tokens de API</h2>
                  <p className="text-sm text-slate-500">{filteredTokens.length} credenciales visibles según los filtros actuales.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Nombre</th>
                        <th className="px-5 py-3">Prefijo</th>
                        <th className="px-5 py-3">Alcance</th>
                        <th className="px-5 py-3">Creado</th>
                        <th className="px-5 py-3">Último uso</th>
                        <th className="px-5 py-3">Activo</th>
                        <th className="px-5 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTokens.map((token) => {
                        const status = tokenStatus(token);
                        return (
                          <tr key={token.id} className={cn("transition hover:bg-slate-50", selectedToken?.id === token.id && "bg-teal-50/50")} onClick={() => setSelectedTokenId(token.id)}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white">{initials(token.name)}</div>
                                <div>
                                  <p className="font-black text-slate-950">{token.name}</p>
                                  <p className="line-clamp-1 text-xs text-slate-500">{token.description || "Sin descripción registrada"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4"><code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{token.tokenPrefix}...</code></td>
                            <td className="px-5 py-4">
                              <div className="flex max-w-[260px] flex-wrap gap-1.5">
                                {token.scopes.slice(0, 3).map((scope) => <Badge key={scope} tone="blue">{scopeLabel(scope)}</Badge>)}
                                {token.scopes.length > 3 && <Badge tone="slate">+{token.scopes.length - 3}</Badge>}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{formatDate(token.createdAtUtc)}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{relativeDate(token.lastUsedAtUtc)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2"><SwitchPill active={token.isActive && !isExpired(token)} /><Badge tone={status.tone}>{status.label}</Badge></div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" title="Ver detalle" onClick={(event) => { event.stopPropagation(); setSelectedTokenId(token.id); }}><Eye className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title="Copiar prefijo" onClick={(event) => { event.stopPropagation(); copyToClipboard(token.tokenPrefix, ok); }}><Copy className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title="Rotar token" disabled={!token.isActive || rotateTokenMutation.isPending} onClick={(event) => { event.stopPropagation(); rotateTokenMutation.mutate(token.id); }}><RefreshCw className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title="Revocar" disabled={!token.isActive || revokeTokenMutation.isPending} onClick={(event) => { event.stopPropagation(); revokeTokenMutation.mutate(token.id); }}><Trash2 className="size-4 text-rose-600" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTokens.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={7}>No se encontraron tokens de API.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_auto] lg:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9" placeholder="Buscar webhook" value={webhookSearch} onChange={(event) => setWebhookSearch(event.target.value)} />
                  </div>
                  <Select value={webhookStatusFilter} onChange={(event) => setWebhookStatusFilter(event.target.value as WebhookStatusFilter)}>
                    <option value="todos">Todos los estados</option>
                    <option value="activos">Activos</option>
                    <option value="inactivos">Pausados</option>
                    <option value="error">Con error</option>
                    <option value="sin-entregas">Sin entregas</option>
                  </Select>
                  {renderExportMenu()}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-black text-slate-950">Webhooks</h2>
                  <p className="text-sm text-slate-500">{filteredWebhooks.length} endpoints configurados.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Nombre</th>
                        <th className="px-5 py-3">URL</th>
                        <th className="px-5 py-3">Eventos suscritos</th>
                        <th className="px-5 py-3">Método</th>
                        <th className="px-5 py-3">Última entrega</th>
                        <th className="px-5 py-3">Estado</th>
                        <th className="px-5 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredWebhooks.map((webhook) => {
                        const status = webhookStatus(webhook);
                        return (
                          <tr key={webhook.id} className={cn("transition hover:bg-slate-50", selectedWebhook?.id === webhook.id && "bg-teal-50/50")} onClick={() => setSelectedWebhookId(webhook.id)}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Webhook className="size-5" /></div>
                                <div>
                                  <p className="font-black text-slate-950">{webhook.name}</p>
                                  <p className="text-xs text-slate-500">{payloadFormats.find((format) => format.value === webhook.format)?.label ?? webhook.format}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4"><p className="max-w-[260px] truncate font-mono text-xs text-slate-600">{webhook.url}</p></td>
                            <td className="px-5 py-4">
                              <div className="flex max-w-[250px] flex-wrap gap-1.5">
                                {webhook.events.slice(0, 2).map((eventType) => <Badge key={eventType} tone="blue">{eventLabel(eventType, events)}</Badge>)}
                                {webhook.events.length > 2 && <Badge tone="slate">+{webhook.events.length - 2}</Badge>}
                              </div>
                            </td>
                            <td className="px-5 py-4"><Badge tone="violet">POST</Badge></td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{relativeDate(webhook.lastDeliveryAtUtc)}</td>
                            <td className="px-5 py-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" title="Ver detalle" onClick={(event) => { event.stopPropagation(); setSelectedWebhookId(webhook.id); }}><Eye className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title="Enviar prueba" disabled={testWebhookMutation.isPending} onClick={(event) => { event.stopPropagation(); testWebhookMutation.mutate(webhook.id); }}><Send className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title={webhook.isActive ? "Pausar" : "Activar"} disabled={toggleWebhookMutation.isPending} onClick={(event) => { event.stopPropagation(); toggleWebhookMutation.mutate(webhook.id); }}><RefreshCw className="size-4" /></Button>
                                <Button size="sm" variant="ghost" title="Eliminar" disabled={deleteWebhookMutation.isPending} onClick={(event) => { event.stopPropagation(); deleteWebhookMutation.mutate(webhook.id); }}><Trash2 className="size-4 text-rose-600" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredWebhooks.length === 0 && <tr><td className="px-5 py-12 text-center text-slate-500" colSpan={7}>No se encontraron webhooks.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Actividad reciente</h2>
                <p className="text-sm text-slate-500">Credenciales y entregas recientes.</p>
              </div>
              <Activity className="size-5 text-teal-700" />
            </div>
            <div className="mt-4 space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className={cn("mt-0.5 flex size-9 items-center justify-center rounded-xl", toneClasses[item.tone].icon)}>
                    {item.id.startsWith("token") ? <KeyRound className="size-4" /> : <Webhook className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-5 text-slate-800">{item.title}</p>
                    <p className="text-xs font-semibold text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-sm text-slate-500">Aún no hay actividad registrada.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Buenas prácticas</h2>
              <ShieldCheck className="size-5 text-teal-700" />
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />Rota tus tokens periódicamente.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />Usa solo los alcances mínimos necesarios.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />Guarda claves y secretos fuera del código fuente.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />Revoca credenciales que ya no uses.</li>
            </ul>
            <Button className="mt-5 w-full" variant="secondary"><LockKeyhole className="size-4" />Ver guía completa</Button>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Salud de webhooks</h2>
              <ServerCog className="size-5 text-blue-700" />
            </div>
            <div className="mt-4 space-y-3">
              {webhooks.slice(0, 5).map((webhook) => {
                const status = webhookStatus(webhook);
                return (
                  <div key={`health-${webhook.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{webhook.name}</p>
                      <p className="text-xs text-slate-500">{webhook.failureCount} fallos acumulados</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                );
              })}
              {webhooks.length === 0 && <p className="text-sm text-slate-500">No hay webhooks configurados.</p>}
            </div>
          </section>

          {tab === "tokens" && selectedToken && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Detalle del token</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Nombre</dt><dd className="text-right font-bold text-slate-800">{selectedToken.name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Prefijo</dt><dd className="font-mono text-xs font-bold text-slate-800">{selectedToken.tokenPrefix}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Expira</dt><dd className="text-right font-bold text-slate-800">{selectedToken.expiresAtUtc ? formatDate(selectedToken.expiresAtUtc) : "Sin expiración"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Alcances</dt><dd className="text-right font-bold text-slate-800">{selectedToken.scopes.length}</dd></div>
              </dl>
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                Restricción por IP, responsable y rotación automática requieren ampliar backend. La UI queda preparada en el flujo de creación.
              </div>
            </section>
          )}

          {tab === "webhooks" && selectedWebhook && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Detalle del webhook</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Estado</dt><dd><Badge tone={selectedWebhookHealth?.tone ?? "slate"}>{selectedWebhookHealth?.label ?? "Sin estado"}</Badge></dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">HTTP</dt><dd className="font-bold text-slate-800">{deliveryRows[0]?.responseStatusCode ?? "Sin respuesta"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Reintentos</dt><dd className="font-bold text-slate-800">{selectedWebhook.failureCount}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">SSL</dt><dd className="font-bold text-slate-800">{selectedWebhook.url.startsWith("https://") ? "Verificado por HTTPS" : "No HTTPS"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Entorno</dt><dd className="font-bold text-slate-800">Producción</dd></div>
              </dl>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Últimas entregas</p>
                {deliveryRows.slice(0, 3).map((delivery: WebhookDelivery) => (
                  <div key={delivery.id} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800">{eventLabel(delivery.eventType, events)}</p>
                      <Badge tone={delivery.success ? "teal" : "rose"}>{delivery.success ? "Éxito" : "Error"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">HTTP {delivery.responseStatusCode ?? "sin código"} · intento {delivery.attemptNumber} · {relativeDate(delivery.deliveredAtUtc)}</p>
                  </div>
                ))}
                {deliveryRows.length === 0 && <p className="text-sm text-slate-500">No hay entregas registradas todavía.</p>}
              </div>
            </section>
          )}
        </aside>
      </div>

      <PremiumModal
        open={tokenOpen}
        title="Nuevo token"
        subtitle="Crea un token seguro para conectar sistemas externos"
        icon={<KeyRound className="size-6" />}
        onClose={() => setTokenOpen(false)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setTokenOpen(false)}>Cancelar</Button>
            <Button disabled={createTokenMutation.isPending} onClick={submitToken}><LockKeyhole className="size-4" />Generar token</Button>
          </>
        )}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Información general</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><FieldLabel label="Nombre del token" required /><Input value={tokenForm.name} onChange={(event) => setTokenForm((current) => ({ ...current, name: event.target.value }))} placeholder="Portal empleados" /></div>
                <div className="space-y-2"><FieldLabel label="Responsable" hint="Campo preparado visualmente" /><Input value={tokenForm.responsible} onChange={(event) => setTokenForm((current) => ({ ...current, responsible: event.target.value }))} placeholder="Equipo de TI" /></div>
                <div className="space-y-2 md:col-span-2"><FieldLabel label="Descripción" /><Textarea value={tokenForm.description} onChange={(event) => setTokenForm((current) => ({ ...current, description: event.target.value }))} placeholder="Uso previsto, sistema externo y observaciones de seguridad." /></div>
                <div className="space-y-2"><FieldLabel label="Expira en" required /><Select value={tokenForm.expirationDays} onChange={(event) => setTokenForm((current) => ({ ...current, expirationDays: event.target.value }))}><option value="30">30 días</option><option value="60">60 días</option><option value="90">90 días</option><option value="180">180 días</option><option value="none">Sin expiración</option></Select></div>
                <div className="space-y-2"><FieldLabel label="Entorno permitido" hint="Preparado; no se persiste aún" /><Select value={tokenForm.environment} onChange={(event) => setTokenForm((current) => ({ ...current, environment: event.target.value as TokenForm["environment"] }))}><option value="production">Producción</option><option value="test">Pruebas</option></Select></div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Seguridad</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><FieldLabel label="Restricción por IP" hint="Preparado; requiere ampliar backend para aplicar la restricción" /><Input value={tokenForm.ipRestriction} onChange={(event) => setTokenForm((current) => ({ ...current, ipRestriction: event.target.value }))} placeholder="190.12.34.0/24, 201.10.10.5" /></div>
                {[
                  ["Requiere rotación automática", "autoRotation"],
                  ["Solo lectura", "readOnly"],
                ].map(([label, key]) => (
                  <button key={key} type="button" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left" onClick={() => setTokenForm((current) => ({ ...current, [key]: !current[key as "autoRotation" | "readOnly"] }))}>
                    <span className="font-bold text-slate-800">{label}</span>
                    <SwitchPill active={Boolean(tokenForm[key as "autoRotation" | "readOnly"])} />
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">Alcances del token</h3>
                  <p className="text-sm text-slate-500">{tokenForm.scopes.length} alcances seleccionados.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setTokenForm((current) => ({ ...current, scopes: current.scopes.length === tokenScopes.length ? [] : tokenScopes.map((scope) => scope.value) }))}>Seleccionar todos</Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tokenScopes.map((scope) => {
                  const active = tokenForm.scopes.includes(scope.value);
                  return (
                    <button key={scope.value} type="button" onClick={() => toggleScope(scope.value)} className={cn("rounded-2xl border p-4 text-left transition", active ? "border-teal-300 bg-teal-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{scope.label}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{scope.hint}</p>
                        </div>
                        <span className={cn("flex size-6 items-center justify-center rounded-full border", active ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-transparent")}><CheckCircle2 className="size-4" /></span>
                      </div>
                      <p className="mt-3 font-mono text-[11px] text-slate-400">{scope.value}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Vista previa</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Nombre</dt><dd className="text-right font-bold text-slate-800">{tokenForm.name || "Nuevo token"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Prefijo</dt><dd className="font-mono text-xs font-bold text-slate-800">{makeTokenPrefix(tokenForm.name)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Expiración</dt><dd className="font-bold text-slate-800">{tokenForm.expirationDays === "none" ? "Sin expiración" : `${tokenForm.expirationDays} días`}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Responsable</dt><dd className="text-right font-bold text-slate-800">{tokenForm.responsible || "No registrado"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Entorno</dt><dd className="font-bold text-slate-800">{tokenForm.environment === "production" ? "Producción" : "Pruebas"}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <LockKeyhole className="size-6 text-amber-700" />
              <h3 className="mt-3 text-sm font-black text-amber-950">La clave completa solo se mostrará una vez.</h3>
              <p className="mt-2 text-sm leading-6 text-amber-800">Guárdala en un gestor seguro. El servidor almacena únicamente el hash del token.</p>
            </section>
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Consejos de seguridad</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Usa alcances mínimos.</li>
                <li>Rota el token ante cualquier sospecha.</li>
                <li>No lo pegues en tickets ni chats.</li>
              </ul>
            </section>
          </aside>
        </div>
      </PremiumModal>

      <PremiumModal
        open={webhookOpen}
        title="Nuevo webhook"
        subtitle="Recibe eventos del sistema en tiempo real"
        icon={<Webhook className="size-6" />}
        onClose={() => setWebhookOpen(false)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setWebhookOpen(false)}>Cancelar</Button>
            <Button disabled={createWebhookMutation.isPending} onClick={submitWebhook}><Plus className="size-4" />Crear webhook</Button>
          </>
        )}
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Configuración general</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><FieldLabel label="Nombre" required /><Input value={webhookForm.name} onChange={(event) => setWebhookForm((current) => ({ ...current, name: event.target.value }))} placeholder="Asistencia" /></div>
                <div className="space-y-2"><FieldLabel label="Método" /><Input value="POST" disabled /></div>
                <div className="space-y-2 md:col-span-2"><FieldLabel label="URL de destino" required /><Input value={webhookForm.url} onChange={(event) => setWebhookForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://api.empresa.com/webhooks/rrhh" /></div>
                <div className="space-y-2"><FieldLabel label="Formato de payload" /><Select value={webhookForm.format} onChange={(event) => setWebhookForm((current) => ({ ...current, format: event.target.value as WebhookPayloadFormat }))}>{payloadFormats.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}</Select></div>
                <div className="space-y-2"><FieldLabel label="Tiempo de espera" hint="Preparado; backend usa política interna" /><Input value={webhookForm.timeoutSeconds} onChange={(event) => setWebhookForm((current) => ({ ...current, timeoutSeconds: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><FieldLabel label="Descripción" /><Textarea value={webhookForm.description} onChange={(event) => setWebhookForm((current) => ({ ...current, description: event.target.value }))} placeholder="Uso previsto y sistema receptor." /></div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">Eventos a suscribirse</h3>
                  <p className="text-sm text-slate-500">{webhookForm.events.length} eventos seleccionados.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setWebhookForm((current) => ({ ...current, events: current.events.length === events.length ? [] : events.map((event) => event.eventType) }))}>Seleccionar todos</Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {events.map((event) => {
                  const active = webhookForm.events.includes(event.eventType);
                  return (
                    <button key={event.eventType} type="button" onClick={() => toggleEvent(event.eventType)} className={cn("rounded-2xl border p-4 text-left transition", active ? "border-teal-300 bg-teal-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-900">{event.description}</p>
                          <p className="mt-1 font-mono text-[11px] text-slate-400">{event.eventType}</p>
                        </div>
                        <span className={cn("flex size-6 items-center justify-center rounded-full border", active ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 bg-white text-transparent")}><CheckCircle2 className="size-4" /></span>
                      </div>
                    </button>
                  );
                })}
                {events.length === 0 && <p className="text-sm text-slate-500">Cargando catálogo de eventos...</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Opciones avanzadas</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  ["Verificar SSL", "sslVerification"],
                  ["Reintentos automáticos", "automaticRetries"],
                ].map(([label, key]) => (
                  <button key={key} type="button" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left" onClick={() => setWebhookForm((current) => ({ ...current, [key]: !current[key as "sslVerification" | "automaticRetries"] }))}>
                    <span className="font-bold text-slate-800">{label}</span>
                    <SwitchPill active={Boolean(webhookForm[key as "sslVerification" | "automaticRetries"])} />
                  </button>
                ))}
                <div className="space-y-2"><FieldLabel label="Máximo de reintentos" hint="Preparado; backend usa política interna" /><Input value={webhookForm.maxRetries} onChange={(event) => setWebhookForm((current) => ({ ...current, maxRetries: event.target.value }))} /></div>
                <div className="space-y-2"><FieldLabel label="Entorno" hint="Preparado; no se persiste aún" /><Select value={webhookForm.environment} onChange={(event) => setWebhookForm((current) => ({ ...current, environment: event.target.value as WebhookForm["environment"] }))}><option value="production">Producción</option><option value="test">Pruebas</option></Select></div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-black text-slate-950">Vista previa</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">URL</dt><dd className="max-w-[190px] truncate text-right font-mono text-xs font-bold text-slate-800">{webhookForm.url || "https://..."}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Eventos</dt><dd className="font-bold text-slate-800">{webhookForm.events.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Formato</dt><dd className="font-bold text-slate-800">{payloadFormats.find((format) => format.value === webhookForm.format)?.label}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Estado inicial</dt><dd><Badge tone="teal">Activo</Badge></dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <Send className="size-6 text-blue-700" />
              <h3 className="mt-3 text-sm font-black text-blue-950">Prueba rápida</h3>
              <p className="mt-2 text-sm leading-6 text-blue-800">Después de crear el webhook podrás enviar un evento de prueba desde la tabla.</p>
            </section>
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Nota técnica</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Firmaremos cada solicitud con un hash HMAC-SHA256 para validar el origen del evento.</p>
            </section>
          </aside>
        </div>
      </PremiumModal>
    </section>
  );
}

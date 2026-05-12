import { useEffect, useMemo, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Flag,
  MapPin,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { exportRows, makeFileName } from "@/components/export/exportUtils";
import {
  createBranch,
  createContractType,
  deleteContractType,
  getBranches,
  getContractTypes,
  getGeneralSettings,
  updateBranch,
  updateBranchStatus,
  updateContractType,
  upsertGeneralSetting,
} from "@/modules/configuration/services/configurationApi";
import type {
  ConfigurationCatalogItem,
  ConfigurationCatalogPayload,
  ConfigurationQuery,
  GeneralSettingItem,
} from "@/modules/configuration/types/configuration.types";

type Tab = "branches" | "contracts" | "settings";
type Feedback = { type: "success" | "error"; message: string } | null;
type BranchForm = {
  name: string;
  code: string;
  branchType: string;
  isActive: boolean;
  description: string;
  country: string;
  region: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  responsibleName: string;
  responsibleTitle: string;
  capacity: string;
  businessHours: string;
  costCenter: string;
  openedAtUtc: string;
  visibleForAssignments: boolean;
  requiresApprovalForChanges: boolean;
};

const pageSizeOptions = [8, 12, 20, 50];
const defaultQuery: ConfigurationQuery = {
  search: "",
  isActive: undefined as unknown as boolean,
  location: "",
  pageNumber: 1,
  pageSize: 8,
  sortBy: "name",
  sortDirection: "asc",
};

const branchTypes = ["Administrativa", "Operativa", "Mixta", "Comercial"];

function emptyBranchForm(): BranchForm {
  return {
    name: "",
    code: "",
    branchType: "Administrativa",
    isActive: true,
    description: "",
    country: "Perú",
    region: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    responsibleName: "",
    responsibleTitle: "",
    capacity: "",
    businessHours: "Lunes a viernes, 08:00 a 18:00",
    costCenter: "",
    openedAtUtc: "",
    visibleForAssignments: true,
    requiresApprovalForChanges: false,
  };
}

function branchToForm(branch: ConfigurationCatalogItem): BranchForm {
  return {
    name: branch.name,
    code: branch.code,
    branchType: branch.branchType ?? "Administrativa",
    isActive: branch.isActive,
    description: branch.description ?? "",
    country: branch.country ?? "Perú",
    region: branch.region ?? "",
    city: branch.city ?? "",
    address: branch.address ?? "",
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    responsibleName: branch.responsibleName ?? "",
    responsibleTitle: branch.responsibleTitle ?? "",
    capacity: branch.capacity ? String(branch.capacity) : "",
    businessHours: branch.businessHours ?? "",
    costCenter: branch.costCenter ?? "",
    openedAtUtc: branch.openedAtUtc ? branch.openedAtUtc.slice(0, 10) : "",
    visibleForAssignments: branch.visibleForAssignments ?? true,
    requiresApprovalForChanges: branch.requiresApprovalForChanges ?? false,
  };
}

function formToPayload(form: BranchForm): ConfigurationCatalogPayload {
  return {
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    branchType: form.branchType,
    description: form.description.trim(),
    country: form.country.trim(),
    region: form.region.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    responsibleName: form.responsibleName.trim(),
    responsibleTitle: form.responsibleTitle.trim(),
    capacity: form.capacity ? Number(form.capacity) : null,
    businessHours: form.businessHours.trim(),
    costCenter: form.costCenter.trim(),
    openedAtUtc: form.openedAtUtc ? new Date(`${form.openedAtUtc}T00:00:00`).toISOString() : null,
    isActive: form.isActive,
    visibleForAssignments: form.visibleForAssignments,
    requiresApprovalForChanges: form.requiresApprovalForChanges,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return "No registrado";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function locationLabel(branch: ConfigurationCatalogItem): string {
  return [branch.city, branch.region, branch.country].filter(Boolean).join(" / ") || "Ubicación pendiente";
}

function initials(value?: string | null): string {
  const source = value?.trim() || "Sede";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function extractError(error: unknown, fallback: string): string {
  const maybe = error as { response?: { data?: { message?: string; title?: string } } };
  return maybe.response?.data?.message ?? maybe.response?.data?.title ?? fallback;
}

function FieldError({ message }: { message?: string }): JSX.Element | null {
  return message ? <p className="mt-1 text-xs font-semibold text-rose-600">{message}</p> : null;
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: JSX.Element }): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required ? " *" : ""}
      </span>
      {children}
      <FieldError message={error} />
    </label>
  );
}

function KpiCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: JSX.Element;
  tone: "teal" | "blue" | "amber" | "rose";
}): JSX.Element {
  const tones = {
    teal: { card: "from-teal-50 to-white", text: "text-teal-700", icon: "bg-teal-100" },
    blue: { card: "from-blue-50 to-white", text: "text-blue-700", icon: "bg-blue-100" },
    amber: { card: "from-amber-50 to-white", text: "text-amber-700", icon: "bg-amber-100" },
    rose: { card: "from-rose-50 to-white", text: "text-rose-700", icon: "bg-rose-100" },
  };
  const toneClasses = tones[tone];
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-gradient-to-br p-4 shadow-sm", toneClasses.card)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
        </div>
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", toneClasses.icon, toneClasses.text)}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }): JSX.Element {
  return (
    <span className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1",
      active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
    )}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

function TypeBadge({ type }: { type?: string | null }): JSX.Element {
  return <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-200">{type || "Administrativa"}</span>;
}

function BranchEditorModal({
  open,
  mode,
  branch,
  branches,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  branch: ConfigurationCatalogItem | null;
  branches: ConfigurationCatalogItem[];
  onClose: () => void;
  onSaved: (message: string) => void;
}): JSX.Element | null {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BranchForm>(emptyBranchForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(mode === "edit" && branch ? branchToForm(branch) : emptyBranchForm());
    setErrors({});
  }, [open, mode, branch]);

  const completion = useMemo(() => {
    const required = [form.name, form.code, form.branchType, form.country, form.region, form.city, form.address];
    const done = required.filter((value) => value.trim()).length;
    return Math.round((done / required.length) * 100);
  }, [form]);

  const selectedModules = [
    "Empleados",
    "Reportes",
    "Asignaciones",
    ...(form.visibleForAssignments ? ["Catálogos"] : []),
  ];

  const saveMutation = useMutation({
    mutationFn: async (keepOpen: boolean) => {
      const nextErrors: Record<string, string> = {};
      const duplicateCode = branches.some((item) => item.id !== branch?.id && item.code.toLowerCase() === form.code.trim().toLowerCase());
      const duplicateName = branches.some((item) => item.id !== branch?.id && item.name.toLowerCase() === form.name.trim().toLowerCase());
      if (!form.name.trim()) nextErrors.name = "El nombre de la sede es obligatorio.";
      if (!form.code.trim()) nextErrors.code = "El código de la sede es obligatorio.";
      if (duplicateCode) nextErrors.code = "Ya existe una sede con ese código.";
      if (duplicateName) nextErrors.name = "Ya existe una sede con ese nombre.";
      if (!form.branchType.trim()) nextErrors.branchType = "Selecciona el tipo de sede.";
      if (!form.region.trim()) nextErrors.region = "El departamento o región es obligatorio.";
      if (!form.city.trim()) nextErrors.city = "La ciudad o provincia es obligatoria.";
      if (!form.address.trim()) nextErrors.address = "La dirección es obligatoria.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Ingresa un correo válido.";
      if (form.phone.trim() && form.phone.trim().length < 6) nextErrors.phone = "Ingresa un teléfono válido.";
      if (form.capacity && Number(form.capacity) < 0) nextErrors.capacity = "La capacidad no puede ser negativa.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) throw new Error("validation");

      const payload = formToPayload(form);
      if (mode === "edit" && branch) {
        await updateBranch(branch.id, payload);
      } else {
        await createBranch(payload);
      }
      return keepOpen;
    },
    onSuccess: async (keepOpen) => {
      await queryClient.invalidateQueries({ queryKey: ["configuration", "branches"] });
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      onSaved(mode === "edit" ? "Sede actualizada correctamente." : "Sede creada correctamente.");
      if (keepOpen) {
        setForm(emptyBranchForm());
        setErrors({});
        return;
      }
      onClose();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "validation") return;
      setErrors({ general: extractError(error, "No se pudo guardar la sede.") });
    },
  });

  if (!open) return null;

  const update = <K extends keyof BranchForm>(key: K, value: BranchForm[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 to-teal-900 px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              <Building2 className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{mode === "edit" ? "Editar sede" : "Nueva sede"}</h2>
              <p className="mt-1 max-w-2xl text-sm text-teal-50">
                Registra una sede operativa o administrativa con información completa y lista para usar.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="space-y-5 p-6">
            {errors.general && <Alert variant="error" message={errors.general} onClose={() => setErrors((current) => ({ ...current, general: "" }))} />}

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Store className="size-5" /></div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Información general</h3>
                  <p className="text-sm text-slate-500">Identidad, clasificación y estado operativo de la sede.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre de la sede" required error={errors.name}>
                  <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Sede Lima Norte" />
                </Field>
                <Field label="Código" required error={errors.code}>
                  <Input value={form.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="SLN-001" />
                </Field>
                <Field label="Tipo de sede" required error={errors.branchType}>
                  <Select value={form.branchType} onChange={(event) => update("branchType", event.target.value)}>
                    {branchTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </Select>
                </Field>
                <Field label="Estado" required>
                  <Select value={form.isActive ? "active" : "inactive"} onChange={(event) => update("isActive", event.target.value === "active")}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </Select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Descripción">
                    <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Oficina administrativa para atención interna, RRHH y operaciones." />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><MapPin className="size-5" /></div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Ubicación y contacto</h3>
                  <p className="text-sm text-slate-500">Datos reales para búsquedas, asignaciones y reportes.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="País" required>
                  <Input value={form.country} onChange={(event) => update("country", event.target.value)} />
                </Field>
                <Field label="Departamento / Región" required error={errors.region}>
                  <Input value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="Lima" />
                </Field>
                <Field label="Ciudad / Provincia" required error={errors.city}>
                  <Input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Lima" />
                </Field>
                <div className="md:col-span-3">
                  <Field label="Dirección" required error={errors.address}>
                    <Input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Av. Principal 123, San Isidro" />
                  </Field>
                </div>
                <Field label="Teléfono" error={errors.phone}>
                  <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+51 1 234 5678" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Correo de sede" error={errors.email}>
                    <Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="sede@empresa.com" />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Settings2 className="size-5" /></div>
                <div>
                  <h3 className="text-base font-black text-slate-950">Gestión operativa</h3>
                  <p className="text-sm text-slate-500">Responsable, capacidad y reglas para asignación.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Encargado responsable">
                  <Input value={form.responsibleName} onChange={(event) => update("responsibleName", event.target.value)} placeholder="Ana Pérez" />
                </Field>
                <Field label="Cargo del encargado">
                  <Input value={form.responsibleTitle} onChange={(event) => update("responsibleTitle", event.target.value)} placeholder="Jefa administrativa" />
                </Field>
                <Field label="Capacidad estimada" error={errors.capacity}>
                  <Input type="number" min={0} value={form.capacity} onChange={(event) => update("capacity", event.target.value)} placeholder="120" />
                </Field>
                <Field label="Centro de costo">
                  <Input value={form.costCenter} onChange={(event) => update("costCenter", event.target.value)} placeholder="CC-LIM-ADM" />
                </Field>
                <Field label="Horario de atención">
                  <Input value={form.businessHours} onChange={(event) => update("businessHours", event.target.value)} />
                </Field>
                <Field label="Fecha de apertura">
                  <Input type="date" value={form.openedAtUtc} onChange={(event) => update("openedAtUtc", event.target.value)} />
                </Field>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <input type="checkbox" checked={form.visibleForAssignments} onChange={(event) => update("visibleForAssignments", event.target.checked)} className="mt-1 size-4 accent-teal-600" />
                  <span>
                    <span className="block text-sm font-black text-slate-800">Visible para asignación de empleados</span>
                    <span className="text-xs text-slate-500">Permite que esta sede aparezca en flujos de empleados y catálogos.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <input type="checkbox" checked={form.requiresApprovalForChanges} onChange={(event) => update("requiresApprovalForChanges", event.target.checked)} className="mt-1 size-4 accent-teal-600" />
                  <span>
                    <span className="block text-sm font-black text-slate-800">Requiere aprobación para cambios</span>
                    <span className="text-xs text-slate-500">La regla queda registrada para futuros flujos de aprobación.</span>
                  </span>
                </label>
              </div>
            </section>
          </main>

          <aside className="border-l border-slate-100 bg-slate-50/80 p-6">
            <div className="sticky top-0 space-y-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Vista previa</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-sm font-black text-white">{initials(form.name)}</div>
                  <div>
                    <p className="font-black text-slate-950">{form.name || "Nombre de la sede"}</p>
                    <p className="text-sm text-slate-500">{form.code || "Código pendiente"}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Tipo</dt><dd className="font-bold text-slate-800">{form.branchType}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Estado</dt><dd><StatusBadge active={form.isActive} /></dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Ubicación</dt><dd className="text-right font-bold text-slate-800">{[form.city, form.region].filter(Boolean).join(" / ") || "Pendiente"}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Encargado</dt><dd className="text-right font-bold text-slate-800">{form.responsibleName || "Sin asignar"}</dd></div>
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Completitud</p>
                  <span className="text-sm font-black text-teal-700">{completion}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${completion}%` }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">{completion === 100 ? "Listo para crear" : "Falta completar información requerida"}</p>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Impacto estimado</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800"><b>{form.capacity || "0"}</b> empleados asignables por capacidad estimada.</div>
                  <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{selectedModules.join(", ")} usarán esta sede.</div>
                  <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{form.requiresApprovalForChanges ? "Cambios sujetos a aprobación." : "Cambios directos permitidos por ahora."}</div>
                </div>
              </section>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Los campos nuevos se guardan en backend y quedan disponibles para otros módulos.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            {mode === "create" && <Button variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(true)}>Guardar y crear otra</Button>}
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(false)}>{mode === "edit" ? "Guardar cambios" : "Guardar sede"}</Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SimpleCatalogModal({
  open,
  mode,
  title,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  title: string;
  item: ConfigurationCatalogItem | null;
  onClose: () => void;
  onSave: (payload: { name: string; code: string }) => void;
}): JSX.Element | null {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCode(item?.code ?? "");
  }, [open, item]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">{mode === "create" ? `Nuevo ${title}` : `Editar ${title}`}</h2>
            <p className="text-sm text-slate-500">Catálogo operativo del sistema.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
        </header>
        <div className="space-y-4 p-5">
          <Field label="Nombre" required><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Código" required><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /></Field>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={!name.trim() || !code.trim()} onClick={() => onSave({ name: name.trim(), code: code.trim().toUpperCase() })}>Guardar</Button>
        </footer>
      </div>
    </div>
  );
}

export function PaginaConfiguracion(): JSX.Element {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("branches");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [query, setQuery] = useState<ConfigurationQuery>(defaultQuery);
  const [selectedBranch, setSelectedBranch] = useState<ConfigurationCatalogItem | null>(null);
  const [branchModal, setBranchModal] = useState<{ open: boolean; mode: "create" | "edit"; item: ConfigurationCatalogItem | null }>({ open: false, mode: "create", item: null });
  const [contractModal, setContractModal] = useState<{ open: boolean; mode: "create" | "edit"; item: ConfigurationCatalogItem | null }>({ open: false, mode: "create", item: null });

  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [settingDesc, setSettingDesc] = useState("");
  const [settingOpen, setSettingOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<GeneralSettingItem | null>(null);

  const branchesQuery = useQuery({ queryKey: ["configuration", "branches", query], queryFn: () => getBranches(query) });
  const allBranchesQuery = useQuery({ queryKey: ["configuration", "branches", "all"], queryFn: () => getBranches({ ...defaultQuery, pageSize: 100, pageNumber: 1 }) });
  const contractsQuery = useQuery({ queryKey: ["configuration", "contract-types"], queryFn: () => getContractTypes({ ...defaultQuery, pageSize: 50 }) });
  const settingsQuery = useQuery({ queryKey: ["general-settings"], queryFn: getGeneralSettings });

  const branches = branchesQuery.data?.items ?? [];
  const allBranches = allBranchesQuery.data?.items ?? branches;
  const selected = selectedBranch && allBranches.some((item) => item.id === selectedBranch.id) ? selectedBranch : branches[0] ?? null;
  const contracts = contractsQuery.data?.items ?? [];
  const settings = settingsQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil((branchesQuery.data?.totalCount ?? 0) / query.pageSize));

  const summary = useMemo(() => {
    const active = allBranches.filter((branch) => branch.isActive).length;
    const inactive = allBranches.filter((branch) => !branch.isActive).length;
    const employees = allBranches.reduce((sum, branch) => sum + branch.employeesCount, 0);
    const managers = allBranches.filter((branch) => branch.responsibleName?.trim()).length;
    return { active, inactive, employees, managers, total: allBranches.length };
  }, [allBranches]);

  const activePercent = summary.total ? Math.round((summary.active / summary.total) * 100) : 0;

  const contractMutation = useMutation({
    mutationFn: async ({ mode, id, payload }: { mode: "create" | "edit"; id?: string; payload: { name: string; code: string } }) => (
      mode === "create" ? createContractType(payload) : updateContractType(id!, payload)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["configuration", "contract-types"] });
      setContractModal({ open: false, mode: "create", item: null });
      setFeedback({ type: "success", message: "Tipo de contrato guardado correctamente." });
    },
    onError: (error) => setFeedback({ type: "error", message: extractError(error, "No se pudo guardar el tipo de contrato.") }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateBranchStatus(id, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["configuration", "branches"] });
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      setFeedback({ type: "success", message: "Estado de sede actualizado." });
    },
    onError: (error) => setFeedback({ type: "error", message: extractError(error, "No se pudo actualizar el estado.") }),
  });

  const deleteContractMutation = useMutation({
    mutationFn: deleteContractType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["configuration", "contract-types"] });
      setFeedback({ type: "success", message: "Tipo de contrato eliminado." });
    },
    onError: (error) => setFeedback({ type: "error", message: extractError(error, "No se pudo eliminar.") }),
  });

  const settingMutation = useMutation({
    mutationFn: () => upsertGeneralSetting(settingKey, { value: settingValue, description: settingDesc, isSensitive: false }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["general-settings"] });
      setFeedback({ type: "success", message: "Configuración guardada." });
      setSettingOpen(false);
    },
    onError: (error) => setFeedback({ type: "error", message: extractError(error, "No se pudo guardar la configuración.") }),
  });

  const setQueryValue = <K extends keyof ConfigurationQuery>(key: K, value: ConfigurationQuery[K]): void => {
    setQuery((current) => ({ ...current, [key]: value, pageNumber: key === "pageNumber" ? Number(value) : 1 }));
  };

  const exportBranches = (): void => {
    exportRows(
      "excel",
      allBranches.map((branch) => ({
        Sede: branch.name,
        Código: branch.code,
        Tipo: branch.branchType ?? "Administrativa",
        Ciudad: branch.city ?? "",
        Región: branch.region ?? "",
        Dirección: branch.address ?? "",
        Encargado: branch.responsibleName ?? "Sin encargado",
        Colaboradores: branch.employeesCount,
        Estado: branch.isActive ? "Activo" : "Inactivo",
      })),
      makeFileName("sedes"),
      "Sedes"
    );
  };

  const openEditSetting = (setting: GeneralSettingItem): void => {
    setSettingKey(setting.key);
    setSettingValue(setting.value);
    setSettingDesc(setting.description ?? "");
    setEditingSetting(setting);
    setSettingOpen(true);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">SAE - RRHH</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Configuración</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de catálogos y ajustes del sistema.</p>
        </div>
        {tab === "branches" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportBranches}><Download className="size-4" />Exportar</Button>
            <Button onClick={() => setBranchModal({ open: true, mode: "create", item: null })}><Plus className="size-4" />Nueva sede</Button>
          </div>
        )}
      </header>

      {feedback && <Alert variant={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />}

      <nav className="flex flex-wrap gap-2 border-b border-slate-200">
        {([
          ["branches", "Sedes"],
          ["contracts", "Tipos de contrato"],
          ["settings", "Configuraciones generales"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px rounded-t-xl border-b-2 px-4 py-3 text-sm font-black transition",
              tab === value ? "border-teal-600 bg-white text-teal-700 shadow-sm" : "border-transparent text-slate-500 hover:bg-white hover:text-slate-800"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "branches" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Sedes activas" value={summary.active} helper="Disponibles para operar" icon={<Building2 className="size-5" />} tone="teal" />
            <KpiCard label="Colaboradores asignados" value={summary.employees} helper="Total vinculado a sedes" icon={<Users className="size-5" />} tone="blue" />
            <KpiCard label="Encargados registrados" value={summary.managers} helper="Con responsable visible" icon={<ShieldCheck className="size-5" />} tone="amber" />
            <KpiCard label="Sedes inactivas" value={summary.inactive} helper="No disponibles" icon={<Flag className="size-5" />} tone="rose" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="space-y-5">
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_200px_auto_auto] lg:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9" placeholder="Buscar sede por nombre o código" value={query.search} onChange={(event) => setQueryValue("search", event.target.value)} />
                  </div>
                  <Select value={typeof query.isActive === "boolean" ? String(query.isActive) : "all"} onChange={(event) => setQueryValue("isActive", event.target.value === "all" ? undefined as unknown as boolean : event.target.value === "true")}>
                    <option value="all">Todos los estados</option>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </Select>
                  <Input placeholder="Ciudad o región" value={query.location ?? ""} onChange={(event) => setQueryValue("location", event.target.value)} />
                  <Button variant="secondary" onClick={() => setQuery(defaultQuery)}><RotateCcw className="size-4" />Limpiar</Button>
                  <Button onClick={() => setBranchModal({ open: true, mode: "create", item: null })}><Plus className="size-4" />Nueva sede</Button>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Sedes registradas</h2>
                    <p className="text-sm text-slate-500">{branchesQuery.data?.totalCount ?? 0} resultados encontrados.</p>
                  </div>
                  {branchesQuery.isFetching && <span className="text-xs font-bold text-teal-700">Actualizando...</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Sede</th>
                        <th className="px-5 py-3">Código</th>
                        <th className="px-5 py-3">Ubicación</th>
                        <th className="px-5 py-3">Encargado</th>
                        <th className="px-5 py-3">Colaboradores</th>
                        <th className="px-5 py-3">Estado</th>
                        <th className="px-5 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branches.map((branch) => (
                        <tr key={branch.id} className={cn("transition hover:bg-slate-50", selected?.id === branch.id && "bg-teal-50/50")}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">{initials(branch.name)}</div>
                              <div>
                                <p className="font-black text-slate-950">{branch.name}</p>
                                <p className="text-xs text-slate-500">{branch.description || branch.branchType || "Sede operativa"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4"><span className="font-mono text-xs font-black text-slate-700">{branch.code}</span></td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{locationLabel(branch)}</p>
                            <p className="text-xs text-slate-500">{branch.address || "Dirección pendiente"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex size-8 items-center justify-center rounded-full bg-teal-50 text-xs font-black text-teal-700">{initials(branch.responsibleName)}</div>
                              <div>
                                <p className="font-semibold text-slate-800">{branch.responsibleName || "Sin encargado"}</p>
                                <p className="text-xs text-slate-500">{branch.responsibleTitle || "Pendiente"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-lg font-black text-slate-950">{branch.employeesCount}</span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge active={branch.isActive} /></td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setSelectedBranch(branch)} title="Ver detalle"><Eye className="size-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setBranchModal({ open: true, mode: "edit", item: branch })} title="Editar"><Edit3 className="size-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: branch.id, active: !branch.isActive })} title={branch.isActive ? "Desactivar" : "Activar"}><MoreHorizontal className="size-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {branches.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No se encontraron sedes con los filtros actuales.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <footer className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-500">
                    Mostrando {branches.length} de {branchesQuery.data?.totalCount ?? 0} sedes
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select className="w-28" value={String(query.pageSize)} onChange={(event) => setQuery((current) => ({ ...current, pageSize: Number(event.target.value), pageNumber: 1 }))}>
                      {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / pág.</option>)}
                    </Select>
                    <Button variant="secondary" disabled={query.pageNumber <= 1} onClick={() => setQueryValue("pageNumber", query.pageNumber - 1)}><ChevronLeft className="size-4" />Anterior</Button>
                    <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700">{query.pageNumber} / {totalPages}</span>
                    <Button variant="secondary" disabled={query.pageNumber >= totalPages} onClick={() => setQueryValue("pageNumber", query.pageNumber + 1)}>Siguiente<ChevronRight className="size-4" /></Button>
                  </div>
                </footer>
              </section>
            </main>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-950">Resumen</h2>
                    <p className="text-sm text-slate-500">Distribución operativa</p>
                  </div>
                  <div
                    className="grid size-24 place-items-center rounded-full"
                    style={{ background: `conic-gradient(#0f766e ${activePercent}%, #fee2e2 0)` }}
                  >
                    <div className="grid size-16 place-items-center rounded-full bg-white">
                      <span className="text-lg font-black text-slate-950">{activePercent}%</span>
                    </div>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-teal-50 p-3"><dt className="text-xs font-bold text-teal-700">Activas</dt><dd className="text-2xl font-black text-teal-900">{summary.active}</dd></div>
                  <div className="rounded-xl bg-rose-50 p-3"><dt className="text-xs font-bold text-rose-700">Inactivas</dt><dd className="text-2xl font-black text-rose-900">{summary.inactive}</dd></div>
                  <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold text-slate-500">Total</dt><dd className="text-2xl font-black text-slate-950">{summary.total}</dd></div>
                  <div className="rounded-xl bg-blue-50 p-3"><dt className="text-xs font-bold text-blue-700">Colaboradores</dt><dd className="text-2xl font-black text-blue-900">{summary.employees}</dd></div>
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-slate-950">Detalle de sede</h2>
                {selected ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{initials(selected.name)}</div>
                      <div>
                        <p className="font-black text-slate-950">{selected.name}</p>
                        <p className="text-sm text-slate-500">{selected.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2"><TypeBadge type={selected.branchType} /><StatusBadge active={selected.isActive} /></div>
                    <dl className="space-y-3 text-sm">
                      <div><dt className="text-xs font-bold uppercase text-slate-400">Ubicación</dt><dd className="font-semibold text-slate-800">{locationLabel(selected)}</dd></div>
                      <div><dt className="text-xs font-bold uppercase text-slate-400">Encargado</dt><dd className="font-semibold text-slate-800">{selected.responsibleName || "Sin encargado"}</dd></div>
                      <div><dt className="text-xs font-bold uppercase text-slate-400">Colaboradores</dt><dd className="font-semibold text-slate-800">{selected.employeesCount}</dd></div>
                      <div><dt className="text-xs font-bold uppercase text-slate-400">Creación</dt><dd className="font-semibold text-slate-800">{formatDate(selected.createdAtUtc)}</dd></div>
                    </dl>
                    <Button className="w-full" variant="secondary" onClick={() => setBranchModal({ open: true, mode: "edit", item: selected })}><Edit3 className="size-4" />Editar sede</Button>
                  </div>
                ) : <p className="mt-4 text-sm text-slate-500">Selecciona una sede para ver su detalle.</p>}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-slate-950">Actividad reciente</h2>
                <div className="mt-4 space-y-4">
                  {(selected ? [
                    { title: "Sede registrada", detail: `${selected.name} está disponible en el catálogo.`, date: formatDate(selected.createdAtUtc), icon: CheckCircle2 },
                    { title: selected.updatedAtUtc ? "Sede actualizada" : "Sin cambios recientes", detail: selected.updatedBy ? `Actualizado por ${selected.updatedBy}` : "La auditoría detallada queda preparada.", date: formatDate(selected.updatedAtUtc), icon: Activity },
                    { title: selected.isActive ? "Sede activa" : "Sede inactiva", detail: selected.isActive ? "Puede usarse en asignaciones." : "No debería asignarse a nuevos empleados.", date: "Estado actual", icon: Flag },
                  ] : [
                    { title: "Actividad preparada", detail: "Selecciona una sede para ver eventos recientes.", date: "UI lista", icon: Activity },
                  ]).map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><item.icon className="size-4" /></div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.detail}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}

      {tab === "contracts" && (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Tipos de contrato</h2>
              <p className="text-sm text-slate-500">Catálogo usado por los perfiles de empleados.</p>
            </div>
            <Button onClick={() => setContractModal({ open: true, mode: "create", item: null })}><Plus className="size-4" />Nuevo tipo</Button>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Nombre</th><th className="px-5 py-3">Código</th><th className="px-5 py-3">Uso</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-black text-slate-950">{item.name}</td>
                  <td className="px-5 py-4 font-mono text-xs font-bold">{item.code}</td>
                  <td className="px-5 py-4 text-slate-600">{item.employeesCount} empleados</td>
                  <td className="px-5 py-4"><StatusBadge active={item.isActive} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setContractModal({ open: true, mode: "edit", item })}>Editar</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteContractMutation.mutate(item.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "settings" && (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Configuraciones generales</h2>
              <p className="text-sm text-slate-500">Parámetros operativos del sistema.</p>
            </div>
            <Button onClick={() => { setEditingSetting(null); setSettingKey(""); setSettingValue(""); setSettingDesc(""); setSettingOpen(true); }}><Plus className="size-4" />Nueva configuración</Button>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Clave</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Descripción</th><th className="px-5 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-5 py-4 font-mono text-xs font-bold">{setting.key}</td>
                  <td className="px-5 py-4">{setting.value}</td>
                  <td className="px-5 py-4 text-slate-500">{setting.description ?? "Sin descripción"}</td>
                  <td className="px-5 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => openEditSetting(setting)}>Editar</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <BranchEditorModal
        open={branchModal.open}
        mode={branchModal.mode}
        branch={branchModal.item}
        branches={allBranches}
        onClose={() => setBranchModal({ open: false, mode: "create", item: null })}
        onSaved={(message) => setFeedback({ type: "success", message })}
      />

      <SimpleCatalogModal
        open={contractModal.open}
        mode={contractModal.mode}
        title="tipo de contrato"
        item={contractModal.item}
        onClose={() => setContractModal({ open: false, mode: "create", item: null })}
        onSave={(payload) => contractMutation.mutate({ mode: contractModal.mode, id: contractModal.item?.id, payload })}
      />

      {settingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">{editingSetting ? "Editar configuración" : "Nueva configuración"}</h2>
                <p className="text-sm text-slate-500">Ajuste general del sistema.</p>
              </div>
              <button onClick={() => setSettingOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
            </header>
            <div className="space-y-4 p-5">
              <Field label="Clave" required><Input value={settingKey} onChange={(event) => setSettingKey(event.target.value)} disabled={!!editingSetting} /></Field>
              <Field label="Valor" required><Input value={settingValue} onChange={(event) => setSettingValue(event.target.value)} /></Field>
              <Field label="Descripción"><Input value={settingDesc} onChange={(event) => setSettingDesc(event.target.value)} /></Field>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <Button variant="secondary" onClick={() => setSettingOpen(false)}>Cancelar</Button>
              <Button disabled={!settingKey || !settingValue || settingMutation.isPending} onClick={() => settingMutation.mutate()}>Guardar</Button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { ChevronDown, Clipboard, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import type { ExportFormat } from "@/components/export/exportUtils";

type ExportMenuProps = {
  disabled?: boolean;
  loading?: boolean;
  fileName?: string;
  resultCount?: number;
  filtersActive?: boolean;
  updatedAtLabel?: string;
  onExport: (format: ExportFormat) => void | Promise<void>;
};

const OPTIONS: Array<{
  format: ExportFormat;
  label: string;
  extension: string;
  Icon: typeof FileText;
  badgeClassName: string;
  badgeText: string;
}> = [
  { format: "excel", label: "Excel", extension: ".xlsx", Icon: FileSpreadsheet, badgeClassName: "bg-emerald-500 text-white", badgeText: "XLS" },
  { format: "csv", label: "CSV", extension: ".csv", Icon: FileText, badgeClassName: "bg-emerald-400 text-white", badgeText: "CSV" },
  { format: "pdf", label: "PDF", extension: ".pdf", Icon: FileText, badgeClassName: "bg-red-500 text-white", badgeText: "PDF" },
  { format: "print", label: "Imprimir", extension: "", Icon: Printer, badgeClassName: "bg-slate-500 text-white", badgeText: "PRN" },
];

export function ExportMenu({
  disabled = false,
  loading = false,
  fileName = "Exportacion",
  resultCount,
  filtersActive = true,
  updatedAtLabel,
  onExport,
}: ExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suggestedFileName = useMemo(() => `${fileName}.xlsx`, [fileName]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent): void {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function select(format: ExportFormat): Promise<void> {
    setOpen(false);
    await onExport(format);
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-400 bg-white px-4 text-[13px] font-semibold text-teal-700 shadow-sm transition hover:border-teal-500 hover:bg-teal-50 hover:text-teal-800 disabled:pointer-events-none disabled:opacity-50"
      >
        <Download className="size-4 text-teal-600" />
        {loading ? "Exportando..." : "Exportar"}
        <ChevronDown className={`size-3.5 text-teal-600 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl shadow-slate-900/12">
          <p className="mb-3 text-[12px] font-medium text-slate-500">Formato de exportacion</p>

          <div className="space-y-1">
          {OPTIONS.map(({ format, label, extension, Icon, badgeClassName, badgeText }) => (
            <button
              key={format}
              type="button"
              onClick={() => void select(format)}
              className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-md text-[9px] font-black shadow-sm ${badgeClassName}`}>
                <Icon className="absolute size-5 opacity-20" />
                {badgeText}
              </span>
              <span>{label} {extension && <span className="font-medium text-slate-500">({extension})</span>}</span>
            </button>
          ))}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3 text-center">
            <p className="text-[11px] font-medium leading-5 text-slate-500">
              Se exportaran los resultados
              <br />
              {filtersActive ? "con los filtros actuales" : "sin filtros aplicados"}
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {typeof resultCount === "number" ? `${resultCount.toLocaleString()} registros` : "Registros filtrados"}
              {updatedAtLabel ? ` · ${updatedAtLabel}` : ""}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <FileText className="size-4 shrink-0 text-teal-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-slate-400">Nombre del archivo sugerido</p>
              <p className="truncate text-[12px] font-bold text-slate-700">{suggestedFileName}</p>
            </div>
            <Clipboard className="size-4 shrink-0 text-teal-600" />
          </div>
        </div>
      )}
    </div>
  );
}

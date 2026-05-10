import { useEffect, useRef, useState, type JSX } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import type { ExportFormat } from "@/components/export/exportUtils";

type ExportMenuProps = {
  disabled?: boolean;
  loading?: boolean;
  onExport: (format: ExportFormat) => void | Promise<void>;
};

const OPTIONS: Array<{ format: ExportFormat; label: string; Icon: typeof FileText }> = [
  { format: "excel", label: "Exportar Excel", Icon: FileSpreadsheet },
  { format: "csv", label: "Exportar CSV", Icon: FileText },
  { format: "pdf", label: "Exportar PDF", Icon: FileText },
  { format: "print", label: "Imprimir", Icon: Printer },
];

export function ExportMenu({ disabled = false, loading = false, onExport }: ExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
      >
        <Download className="size-4 text-slate-500" />
        {loading ? "Exportando..." : "Exportar"}
        <ChevronDown className={`size-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10">
          {OPTIONS.map(({ format, label, Icon }) => (
            <button
              key={format}
              type="button"
              onClick={() => void select(format)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <Icon className="size-4 text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

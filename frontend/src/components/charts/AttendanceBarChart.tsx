type DailyBar = {
  date: string;
  present: number;
  late: number;
  absent: number;
};

type AttendanceBarChartProps = {
  data: DailyBar[];
};

export function AttendanceBarChart({ data }: AttendanceBarChartProps): JSX.Element {
  const maxTotal = Math.max(...data.map((d) => d.present + d.late + d.absent), 1);
  const midTotal = Math.ceil(maxTotal / 2);
  const plotMinWidth = Math.max(data.length * 36, 260);

  const formatLabel = (isoDate: string): string => {
    const [year, month, day] = isoDate.split("-");
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-brand-400" /> Presentes</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-amber-300" /> Tardanzas</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-rose-300" /> Faltas</span>
      </div>

      <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 sm:grid-cols-[2rem_minmax(0,1fr)]">
        <div className="flex h-32 sm:h-36 flex-col justify-between text-right text-[10px] font-semibold tabular-nums text-slate-400">
          <span>{maxTotal}</span>
          <span>{midTotal}</span>
          <span>0</span>
        </div>

        <div className="relative min-w-0">
          <div className="pointer-events-none absolute inset-0 flex h-32 sm:h-36 flex-col justify-between">
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-dashed border-slate-200" />
            <div className="border-t border-dashed border-slate-200" />
          </div>

          <div className="overflow-x-auto">
            <div className="flex h-32 sm:h-36 items-end gap-1" style={{ minWidth: `${plotMinWidth}px` }}>
              {data.map((bar) => {
                const total = bar.present + bar.late + bar.absent;
                const presentPct = (bar.present / maxTotal) * 100;
                const latePct = (bar.late / maxTotal) * 100;
                const absentPct = (bar.absent / maxTotal) * 100;

                return (
                  <div key={bar.date} className="group relative flex min-w-8 flex-1 max-w-10 flex-col items-center gap-0.5">
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border bg-white px-2 py-1 text-[11px] opacity-0 shadow-panel transition-opacity group-hover:opacity-100 md:block">
                      <span className="font-bold">{total}</span> reg. ({formatLabel(bar.date)})
                    </div>

                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-sm" style={{ height: "8rem" }}>
                      <div style={{ height: `${absentPct}%` }} className="w-full bg-rose-300 transition-all" />
                      <div style={{ height: `${latePct}%` }} className="w-full bg-amber-300 transition-all" />
                      <div style={{ height: `${presentPct}%` }} className="w-full bg-brand-400 transition-all" />
                    </div>

                    <span className="w-full truncate text-center text-[10px] text-slate-400">
                      {formatLabel(bar.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex justify-center sm:justify-end text-[10px] text-slate-400">
            Cantidad de registros
          </div>
        </div>
      </div>
    </div>
  );
}

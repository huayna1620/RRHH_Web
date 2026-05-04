import type { JSX } from "react";
export type DataTableColumn = Record<string, unknown>;
export function DataTable(): JSX.Element {
  return <section className="p-4 text-sm text-slate-600">DataTable</section>;
}

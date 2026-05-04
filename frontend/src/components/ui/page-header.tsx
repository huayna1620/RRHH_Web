import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps): JSX.Element {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pb-1 sm:gap-4">
      <div className="relative min-w-0 flex-1 space-y-1 pl-3.5">
        <span aria-hidden className="absolute left-0 top-1.5 h-[26px] w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
        <h1 className="text-[18px] font-extrabold tracking-tight text-slate-900 sm:text-[20px] lg:text-[22px]">{title}</h1>
        {description ? <p className="max-w-2xl text-[13px] text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{action}</div> : null}
    </header>
  );
}

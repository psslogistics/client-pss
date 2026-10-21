import type { ReactNode } from "react";
import { HelpCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared client-side visual language for the provider-inspired operational
 * screens. It intentionally contains no provider logic: it only standardises
 * the dense header, action treatment, panels, and table surfaces.
 */
export function DelhiverySurface({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-4", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-2 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Live
          </span>
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold hover:bg-accent">
            <HelpCircle className="size-3.5" /> How it works
          </button>
          {action}
          <button type="button" aria-label="More options" className="grid size-9 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

export function DelhiveryPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>{children}</section>;
}

export function DelhiveryTabs({ tabs, active, onChange }: { tabs: string[]; active?: string; onChange?: (tab: string) => void }) {
  return <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-border bg-muted/20 px-2 pt-2">{tabs.map((tab) => <button type="button" key={tab} onClick={() => onChange?.(tab)} className={cn("whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-semibold", tab === active ? "border border-b-0 border-border bg-card text-foreground" : "text-muted-foreground hover:bg-accent")}>{tab}</button>)}</div>;
}

export const delhiveryToolbar = "flex flex-wrap items-center gap-2 border-b border-border/70 bg-card p-3";
export const delhiveryInput = "h-9 min-w-0 rounded-md border border-input bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

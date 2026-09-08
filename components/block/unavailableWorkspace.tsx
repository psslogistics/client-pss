import { Info } from "lucide-react";

export function UnavailableWorkspace({ title, description }: { title: string; description: string }) {
  return <section className="rounded-xl border border-border bg-card p-6 shadow-xs"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Info className="size-5" /></div><h1 className="mt-4 text-xl font-semibold">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p><p className="mt-5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">This workspace is ready for the operational integration; no records are being simulated here.</p></section>;
}

"use client";

import { ClipboardCheck, CreditCard, KeyRound, ShieldCheck } from "lucide-react";

const cards = [
  { icon: ShieldCheck, title: "Verification", detail: "KYC review and approval are managed by PSS.", status: "Support review" },
  { icon: CreditCard, title: "Bank accounts", detail: "Bank details are never displayed after secure submission.", status: "Secure setup" },
  { icon: KeyRound, title: "API & webhooks", detail: "Secrets remain server-side and are shown only as masked status.", status: "Master managed" },
  { icon: ClipboardCheck, title: "Integrations", detail: "Courier capability and health come from the production Worker.", status: "Live status" },
] as const;

export default function ProfileWorkspaceSummary() {
  return <section aria-label="Account workspace capabilities" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {cards.map(({ icon: Icon, title, detail, status }) => <article key={title} className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">{status}</span></div>
      <h2 className="mt-3 text-xs font-semibold">{title}</h2><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{detail}</p>
    </article>)}
  </section>;
}

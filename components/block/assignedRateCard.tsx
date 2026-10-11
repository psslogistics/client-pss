"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatINR, publicCourierName } from "@/lib/client-pricing-data";
import { cn } from "@/lib/utils";
import { pssApi } from "@/lib/pss-api";

type ClientRateCard = {
  version: { status: string; effective_at?: string; minimum_weight_kg?: number; gst_percent?: number };
  rate_matrices: Record<string, Array<{ origin_zone: string; destination_zone: string; rate_per_kg: number }>>;
  charge_rules: Array<{ code: string; label: string; calculation_type: string; value: number; basis?: string; minimum_value?: number | null; maximum_value?: number | null; enabled?: number; marker?: string | null }>;
};
type Provider = { name: string; enabled: boolean; configured: boolean; health?: string; lastError?: string | null };

const money = (value: number | null | undefined) => value == null ? "—" : formatINR(Number(value));

export function AssignedRateCard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rateCard, setRateCard] = useState<ClientRateCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      pssApi<{ data: Record<string, { enabled?: boolean; configured?: boolean; health?: string; last_error_code?: string | null }> }>("/v1/provider-capabilities"),
      pssApi<{ data: ClientRateCard }>("/v1/pricing/assigned"),
    ]).then(([providerResponse, cardResponse]) => {
      if (cancelled) return;
      setProviders(Object.entries(providerResponse.data).map(([name, value]) => ({ name, enabled: value.enabled === true, configured: value.configured === true, health: value.health, lastError: value.last_error_code })));
      setRateCard(cardResponse.data);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load your assigned rate card."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const matrix = useMemo(() => rateCard?.rate_matrices?.other ?? [], [rateCard]);
  const origins = useMemo(() => [...new Set(matrix.map((row) => row.origin_zone))].sort(), [matrix]);
  const destinations = useMemo(() => [...new Set(matrix.map((row) => row.destination_zone))].sort(), [matrix]);
  const rates = useMemo(() => new Map(matrix.map((row) => [`${row.origin_zone}->${row.destination_zone}`, row.rate_per_kg])), [matrix]);
  const rules = (rateCard?.charge_rules ?? []).filter((rule) => rule.enabled !== 0);

  return <div className="w-full space-y-5"><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Information Center</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Rate Card</h1><p className="mt-1 text-sm text-muted-foreground">View the PSS rate card assigned to your client account.</p></header><section className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Assigned PSS rate card</h2><p className="mt-1 text-xs text-muted-foreground">These client-facing PSS charges are used for quotes and bookings. Courier rates and provider responses are not shown.</p></div>{rateCard && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Active</span>}</div>{error && <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}{loading ? <div className="grid min-h-[180px] place-items-center text-sm text-muted-foreground"><RefreshCw className="mr-2 inline size-4 animate-spin" />Loading your assigned rate card…</div> : !rateCard ? <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">No active PSS rate card is assigned to this client account.</div> : <div className="mt-4 space-y-4"><div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">Effective from</p><p className="mt-1 text-sm font-medium">{rateCard.version.effective_at ? new Date(rateCard.version.effective_at).toLocaleDateString("en-IN") : "Current"}</p></div><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">Minimum chargeable weight</p><p className="mt-1 text-sm font-medium">{Number(rateCard.version.minimum_weight_kg ?? 0)} kg</p></div><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">GST</p><p className="mt-1 text-sm font-medium">{Number(rateCard.version.gst_percent ?? 0)}%</p></div></div><div className="overflow-hidden rounded-lg border border-border/70"><div className="overflow-x-auto"><div className="min-w-[680px]"><div className="bg-muted/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PSS zone rate matrix · ₹ per kg</div><div className="grid" style={{ gridTemplateColumns: `minmax(120px, 0.8fr) repeat(${Math.max(destinations.length, 1)}, minmax(96px, 1fr))` }}><div className="border-t border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Origin \ Destination</div>{destinations.map((destination) => <div className="border-l border-t border-border/70 bg-muted/30 px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground" key={destination}>{destination}</div>)}{origins.map((origin) => <div className="contents" key={origin}><div className="border-t border-border/70 bg-muted/20 px-3 py-3 text-xs font-semibold">{origin}</div>{destinations.map((destination) => { const rate = rates.get(`${origin}->${destination}`); return <div className={cn("border-l border-t border-border/70 px-3 py-3 text-center text-xs font-semibold", rate == null ? "text-muted-foreground" : "text-primary")} key={`${origin}-${destination}`}>{rate == null ? "—" : money(rate)}</div>; })}</div>)}</div>{!origins.length || !destinations.length ? <p className="border-t border-border/70 px-3 py-4 text-xs text-muted-foreground">No zone rates are configured.</p> : null}</div></div></div><div><h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Additional PSS charges</h3>{rules.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rules.map((rule) => <div className="rounded-lg border border-border/70 bg-muted/20 p-3" key={rule.code}><p className="text-xs font-semibold">{rule.label}{rule.marker ?? ""}</p><p className="mt-1 text-sm font-medium">{Number(rule.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">{rule.basis ?? rule.calculation_type}</span></p><p className="mt-1 text-[11px] text-muted-foreground">Min {money(rule.minimum_value)} · Max {money(rule.maximum_value)}</p></div>)}</div> : <p className="mt-2 text-xs text-muted-foreground">No additional charges are configured.</p>}</div></div>}</section><section className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Courier configuration</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{providers.map((provider) => { const degraded = provider.health === "degraded"; const checking = provider.health === "pending"; const label = degraded ? "Degraded" : checking ? "Checking" : provider.enabled ? "Enabled" : provider.configured ? "Configured, disabled" : "Not configured"; return <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3" key={provider.name}><div><span className="text-sm font-medium">{publicCourierName(provider.name)}</span>{degraded && provider.lastError ? <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">{provider.lastError}</p> : null}</div><span className={cn("rounded-full px-2 py-1 text-[11px]", degraded ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : checking ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : provider.enabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{label}</span></div>; })}{!providers.length && !error && <p className="text-sm text-muted-foreground">Loading provider configuration…</p>}</div></section></div>;
}

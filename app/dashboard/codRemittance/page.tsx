"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, WalletCards } from "lucide-react";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";
import { formatDate } from "@/lib/date-format";
import { clientShipmentReference } from "@/lib/client-shipment-reference";
import { SkeletonKpi, SkeletonTable } from "@/components/ui/skeleton";

type Remittance = { id: string; shipment_id?: string | null; shipment_pss_reference?: string | null; lr_number?: string | null; master_awb?: string | null; tracking_number?: string | null; amount?: number; status?: string; expected_at?: string | null; settled_at?: string | null; created_at?: string };

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const statusKey = (value: unknown) => String(value ?? "pending").toLowerCase().replaceAll(" ", "_");
const statusText = (value: unknown) => String(value ?? "pending").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const amount = (row: Remittance) => Math.abs(Number(row.amount ?? 0));

export default function CodRemittancePage() {
  const [rows, setRows] = useState<Remittance[]>([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true); setLoadError("");
    void pssApi<{ data: Remittance[] }>("/v1/cod-remittances").then((result) => { setRows(result.data ?? []); setNotice(""); }).catch((error) => { const details = getPssErrorDetails(error, "COD remittance records are temporarily unavailable."); setLoadError(details.message); setNotice(details.message); }).finally(() => setLoading(false));
  };
  // The initial request updates loading state before the async fetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  const summary = useMemo(() => rows.reduce((result, row) => { const key = statusKey(row.status); const value = amount(row); result.total += value; if (["paid", "settled", "completed"].includes(key)) result.paid += value; else if (["failed", "rejected", "cancelled", "canceled"].includes(key)) result.failed += value; else result.pending += value; return result; }, { total: 0, pending: 0, paid: 0, failed: 0 }), [rows]);
  return <div className="w-full space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finance</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">COD remittance</h1><p className="mt-1 text-sm text-muted-foreground">View your COD settlement history and payment status.</p></div><button type="button" onClick={load} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-xs font-semibold disabled:opacity-50"><RefreshCw className="size-3.5" />Refresh</button></header><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? <><SkeletonKpi /><SkeletonKpi /><SkeletonKpi /><SkeletonKpi /></> : <><Kpi label="Total COD" value={loadError ? "—" : money(summary.total)} /><Kpi label="Pending" value={loadError ? "—" : money(summary.pending)} /><Kpi label="Paid" value={loadError ? "—" : money(summary.paid)} /><Kpi label="Failed" value={loadError ? "—" : money(summary.failed)} /></>}</div><section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-4"><div className="flex items-center gap-2"><WalletCards className="size-4 text-primary" /><div><h2 className="text-sm font-semibold">Remittance ledger</h2><p className="mt-1 text-xs text-muted-foreground">Settlement totals are grouped from the records currently returned for this client.</p></div></div></div>{loading ? <SkeletonTable rows={6} columns={6} /> : loadError ? <div className="grid min-h-[220px] place-items-center gap-3 p-6 text-center"><p className="text-sm text-destructive">We could not load the settlement ledger. Please try again.</p><button type="button" onClick={load} className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive">Retry COD remittance</button></div> : rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Reference", "Shipment", "Amount", "Status", "Expected", "Settled"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{rows.map((row) => { const reference = clientShipmentReference(row, "Pending reference"); return <tr key={row.id}><td className="px-4 py-3 font-mono font-semibold">{`COD-${reference}`}</td><td className="px-4 py-3">{reference}</td><td className="px-4 py-3 font-semibold">{money(amount(row))}</td><td className="px-4 py-3">{statusText(row.status)}</td><td className="px-4 py-3">{formatDate(row.expected_at, "—")}</td><td className="px-4 py-3">{formatDate(row.settled_at, "Pending")}</td></tr>; })}</tbody></table></div> : <div className="grid min-h-[220px] place-items-center p-6 text-center text-sm text-muted-foreground">No COD settlements found.</div>}</section>{notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}</div>;
}
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>; }

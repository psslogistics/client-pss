"use client";

import Link from "next/link";
import { ArrowRight, PackageSearch, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";
import { publicCourierName } from "@/lib/client-pricing-data";

type ShipmentStatus = "All" | "Active" | "Booked" | "Picked Up" | "In Transit" | "Out for Delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
type ShipmentRow = { id: string; pssTracking: string; courierTracking: string; courierReferenceLabel: string; pur?: string; lr?: string; masterAwb?: string; boxAwbs: string[]; providerBookingId?: string; providerPickupId?: string; providerSyncStatus?: string; client: string; origin: string; destination: string; courier: string; status: Exclude<ShipmentStatus, "All" | "Active">; nextAction: string; pieces: number; weight: string; eta: string; booked: string };

const statuses: ShipmentStatus[] = ["All", "Active", "Booked", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Delayed", "Exception", "Returned", "Cancelled"];
const activeStatuses = new Set(["Booked", "Picked Up", "In Transit", "Out for Delivery", "Delayed", "Exception"]);
const searchable = (row: ShipmentRow) => [row.pssTracking, row.courierTracking, row.pur, row.lr, row.masterAwb, ...row.boxAwbs, row.providerBookingId, row.providerPickupId, row.client, row.origin, row.destination, row.courier].filter(Boolean).join(" ").toLowerCase();
const mapStatus = (value: unknown): ShipmentRow["status"] => { const status = String(value ?? "booked").toLowerCase().replaceAll("_", " "); if (status === "picked up") return "Picked Up"; if (status === "in transit") return "In Transit"; if (status === "out for delivery") return "Out for Delivery"; if (status === "delivered") return "Delivered"; if (status === "exception") return "Exception"; if (status === "rto" || status === "returned") return "Returned"; if (status === "cancelled" || status === "canceled") return "Cancelled"; return "Booked"; };
const textValue = (value: unknown) => String(value ?? "").trim();
const parseBoxAwbs = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(textValue).filter(Boolean) : [];
  } catch {
    return [];
  }
};
const shipmentReferences = (row: Record<string, unknown>) => {
  const lr = textValue(row.lr_number || row.pss_reference);
  const masterAwb = textValue(row.master_awb);
  const pur = textValue(row.pickup_reference);
  const legacy = textValue(row.tracking_number || row.provider_reference);
  return { lr, masterAwb, pur, legacy, value: lr || masterAwb || pur || legacy || "Provider reference unavailable", label: lr ? "LR" : masterAwb ? "Master AWB" : pur ? "PUR" : legacy ? "Provider reference" : "Provider reference" };
};
const nextActionFor = (status: ShipmentRow["status"], providerSyncStatus: string | undefined, hasProviderReference: boolean) => {
  const sync = providerSyncStatus?.toLowerCase();
  if (sync === "failed" || sync === "error") return "Retry provider sync";
  if (sync === "pending" || sync === "provider_pending") return "Provider confirmation pending";
  if (status === "Exception") return "Review exception";
  if (status === "Delayed") return "Review delivery delay";
  if (status === "Booked" && !hasProviderReference) return "Awaiting provider reference";
  if (status === "Booked") return "Schedule pickup";
  if (status === "Picked Up") return "Monitor transit";
  if (status === "In Transit" || status === "Out for Delivery") return "Monitor tracking";
  if (status === "Returned") return "Review return movement";
  return status === "Delivered" ? "No action required" : "Review shipment";
};

const statusStyles: Record<ShipmentRow["status"], string> = {
  Booked: "bg-blue-500/10 text-blue-700 dark:text-blue-300", "Picked Up": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "In Transit": "bg-sky-500/10 text-sky-700 dark:text-sky-300", "Out for Delivery": "bg-amber-500/10 text-amber-700 dark:text-amber-300", Delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Delayed: "bg-amber-500/10 text-amber-700 dark:text-amber-300", Exception: "bg-destructive/10 text-destructive", Returned: "bg-violet-500/10 text-violet-700 dark:text-violet-300", Cancelled: "bg-muted text-muted-foreground",
};
const mapShipmentRow = (row: Record<string, unknown>): ShipmentRow => { const reference = shipmentReferences(row); const status = mapStatus(row.status); const providerSyncStatus = textValue(row.provider_sync_status) || undefined; return { id: String(row.id), pssTracking: String(row.pss_reference ?? row.id), courierTracking: reference.value, courierReferenceLabel: reference.label, pur: reference.pur || undefined, lr: reference.lr || undefined, masterAwb: reference.masterAwb || undefined, boxAwbs: parseBoxAwbs(row.box_awbs_json), providerBookingId: textValue(row.provider_booking_id) || undefined, providerPickupId: textValue(row.provider_pickup_id) || undefined, providerSyncStatus, client: String(row.client_name || row.client_id || "Assigned client"), origin: String(row.origin ?? "Not provided"), destination: String(row.destination ?? "Not provided"), courier: publicCourierName(row.provider, row.account_name), status, nextAction: nextActionFor(status, providerSyncStatus, Boolean(reference.lr || reference.masterAwb || reference.pur || reference.legacy)), pieces: Number(row.pieces ?? 1), weight: `${Number(row.total_weight_kg ?? 0)} kg`, eta: String(row.edd ?? "Not provided"), booked: String(row.created_at ?? "Not provided").slice(0, 10) }; };

export default function AllShipments() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ShipmentStatus>("All");
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staleData, setStaleData] = useState(false);
  const [offset, setOffset] = useState(0); const [hasMore, setHasMore] = useState(false); const [loadingMore, setLoadingMore] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null); const [serverStatusCounts, setServerStatusCounts] = useState<Record<string, number>>({});
  const hadRowsRef = useRef(false);
  // This effect owns the remote shipment fetch and its loading lifecycle.
  useEffect(() => {
    let cancelled = false;
    // The fetch lifecycle intentionally resets these flags before the request starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError("");
    const statusQuery = status === "All" ? "" : `&status=${encodeURIComponent(status)}`;
    void pssApi<{ data: Array<Record<string, unknown>>; stale_data?: boolean; pagination?: { next_offset?: number; has_more?: boolean; total?: number; status_counts?: Record<string, number> } }>(`/v1/shipments?limit=50&offset=0${statusQuery}`)
      .then((result) => {
        if (cancelled) return;
        hadRowsRef.current = (result.data ?? []).length > 0;
        setRows((result.data ?? []).map(mapShipmentRow)); setOffset(Number(result.pagination?.next_offset ?? (result.data ?? []).length)); setHasMore(Boolean(result.pagination?.has_more)); setServerTotal(typeof result.pagination?.total === "number" ? result.pagination.total : null); setServerStatusCounts(result.pagination?.status_counts ?? {});
        setStaleData(result.stale_data === true);
        setNotice(result.stale_data ? "Showing the last successful shipment list. Refresh when production data is available." : "");
      })
      .catch((error) => {
        if (cancelled) return;
        const details = getPssErrorDetails(error, "Shipment list is temporarily unavailable. Existing records are unchanged.");
        setLoadError(details.message);
        setStaleData(hadRowsRef.current);
        setNotice(hadRowsRef.current ? `Shipment refresh failed: ${details.message}` : details.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey, status]);
  const loadMore = async () => { if (loadingMore || !hasMore) return; setLoadingMore(true); try { const statusQuery = status === "All" ? "" : `&status=${encodeURIComponent(status)}`; const result = await pssApi<{ data: Array<Record<string, unknown>>; pagination?: { next_offset?: number; has_more?: boolean } }>(`/v1/shipments?limit=50&offset=${offset}${statusQuery}`); const nextRows = (result.data ?? []).map(mapShipmentRow); setRows((current) => [...current, ...nextRows.filter((next) => !current.some((existing) => existing.id === next.id))]); setOffset(Number(result.pagination?.next_offset ?? offset + nextRows.length)); setHasMore(Boolean(result.pagination?.has_more)); } catch (error) { setNotice(getPssErrorDetails(error, "More shipments could not be loaded.").message); } finally { setLoadingMore(false); } };
  const statusCount = (statusName: ShipmentStatus) => { if (!Object.keys(serverStatusCounts).length) return statusName === "All" ? rows.length : statusName === "Active" ? rows.filter((row) => activeStatuses.has(row.status)).length : rows.filter((row) => row.status === statusName).length; const key = statusName.toLowerCase().replaceAll(" ", "_"); if (statusName === "All") return serverTotal ?? rows.length; if (statusName === "Active") return ["booked", "picked_up", "in_transit", "out_for_delivery", "delayed", "exception"].reduce((sum, keyName) => sum + Number(serverStatusCounts[keyName] ?? 0), 0); if (statusName === "Returned") return Number(serverStatusCounts.rto ?? 0) + Number(serverStatusCounts.returned ?? 0); return Number(serverStatusCounts[key] ?? 0); };
  const counts = statuses.reduce<Record<ShipmentStatus, number>>((result, item) => { result[item] = statusCount(item); return result; }, {} as Record<ShipmentStatus, number>);
  const filtered = rows.filter((row) => (!query.trim() || searchable(row).includes(query.trim().toLowerCase())) && (status === "All" || status === "Active" ? status === "All" || activeStatuses.has(row.status) : row.status === status));

  return <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 w-full flex-col gap-3 overflow-hidden">
    <div className="relative flex min-w-0 items-center rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"><Search className="ml-3 size-4 shrink-0 text-muted-foreground" /><input aria-label="Search all shipments" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments, references, customers, or cities…" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/70" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="mr-2 rounded p-1 text-muted-foreground hover:bg-accent"><X className="size-3.5" /></button>}</div>
    <div className="flex min-h-0 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Shipment status filters">{statuses.map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => setStatus(item)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition", status === item ? "bg-background text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-background/70 hover:text-foreground")}><span>{item}</span><span className={cn("text-[11px] tabular-nums", status === item ? "text-primary" : "text-muted-foreground/80")}>{counts[item]}</span></button>)}</div>
    <p className="-mt-1 px-1 text-[11px] text-muted-foreground">Active is a rollup of open statuses and overlaps with Booked, In Transit, Exception, and other active categories; use All for the mutually exclusive total.</p>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs"><div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 text-xs text-muted-foreground"><span className="hidden sm:inline">Select a shipment to open tracking · Showing {rows.length}{hasMore ? "+" : ""}</span>{notice && <span role={staleData ? "status" : "alert"} className={staleData ? "text-amber-700 dark:text-amber-300" : "text-destructive"}>{notice}</span>}</div>{filtered.length ? <div className="min-h-0 flex-1 overflow-auto" onScroll={(event) => { const element = event.currentTarget; if (element.scrollTop + element.clientHeight >= element.scrollHeight - 180) void loadMore(); }}><table className="w-full min-w-[920px] text-left text-xs"><thead className="sticky top-0 z-10 bg-muted/95 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur"><tr>{["PSS tracking", "Courier references", "Client / route", "Courier", "Status / next action", "Pieces", "Weight", "ETA", "Booked"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border/70">{filtered.map((row) => <tr key={`${row.id}-${row.courierTracking}`} className="transition hover:bg-accent/30"><td className="px-4 py-3 font-mono font-semibold"><Link href={`/dashboard/shipmentTracking?id=${encodeURIComponent(row.pssTracking)}`} className="inline-flex items-center gap-1.5 hover:text-primary">{row.pssTracking}<PackageSearch className="size-3.5" /></Link></td><td className="px-4 py-3 font-mono text-muted-foreground"><div className="space-y-0.5 text-[11px]">{row.pur ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">PUR</span>{row.pur}</p> : null}{row.lr ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">LRN</span>{row.lr}</p> : null}{row.masterAwb ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">Master AWB</span>{row.masterAwb}</p> : null}{row.providerBookingId ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">Provider booking ID</span>{row.providerBookingId}</p> : null}{row.providerPickupId ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">Provider pickup ID</span>{row.providerPickupId}</p> : null}{row.boxAwbs.length ? <p><span className="mr-1.5 text-[10px] uppercase tracking-wide">Box AWB{row.boxAwbs.length === 1 ? "" : "s"}</span>{row.boxAwbs.join(", ")}</p> : null}{!row.pur && !row.lr && !row.masterAwb && !row.providerBookingId && !row.providerPickupId && !row.boxAwbs.length ? <><p><span className="mr-1.5 text-[10px] uppercase tracking-wide">{row.courierReferenceLabel}</span>{row.courierTracking}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">Awaiting provider confirmation before a provider reference is assigned.</p></> : null}{row.providerSyncStatus && row.providerSyncStatus !== "confirmed" ? <p className="text-[10px] text-amber-700 dark:text-amber-300">Provider sync: {row.providerSyncStatus}</p> : null}</div></td><td className="px-4 py-3"><p className="font-medium">{row.client}</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">{row.origin}<ArrowRight className="size-3" />{row.destination}</p></td><td className="px-4 py-3">{row.courier}</td><td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", statusStyles[row.status])}>{row.status}</span><span className="mt-1 block text-[10px] text-muted-foreground">Next: {row.nextAction}</span></td><td className="px-4 py-3">{row.pieces}</td><td className="px-4 py-3">{row.weight}</td><td className="px-4 py-3">{row.eta}</td><td className="px-4 py-3 text-muted-foreground">{row.booked}</td></tr>)}</tbody></table>{hasMore && <div className="flex flex-col items-center gap-2 border-t border-border p-4"><p className="text-xs text-muted-foreground">More shipments are available.</p><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{loadingMore ? "Loading…" : "Load more shipments"}</button></div>}</div> : <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 text-center"><Search className="mb-2 size-5 text-muted-foreground/60" /><p className="text-sm font-semibold">{loading ? "Loading production shipments…" : loadError ? "Production shipments unavailable" : "No shipments found"}</p>{loading ? <p className="mt-1 text-xs text-muted-foreground">Retrieving records from the authenticated Worker.</p> : loadError ? <><p className="mt-1 max-w-md text-xs text-muted-foreground">{loadError}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">Retry shipments</button></> : <p className="mt-1 text-xs text-muted-foreground">Try another search or status.</p>}</div>}</div>
  </div>;
}

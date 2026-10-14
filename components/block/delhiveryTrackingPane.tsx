"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Loader2,
  Download,
  FileCheck2,
  LifeBuoy,
  MapPin,
  Package,
  Printer,
  ReceiptText,
  RefreshCw,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";

type Status = "Booked" | "Picked up" | "In transit" | "Out for delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
type TrackingEvent = { title: string; description: string; location: string; eventTime: string; status: Status };
type Shipment = {
  id: string;
  reference: string;
  referenceLabel: string;
  lrNumber?: string;
  masterAwb?: string;
  boxAwbs: string[];
  provider: string;
  status: Status;
  pieces: number;
  weight: string;
  origin: string;
  destination: string;
  consignee: string;
  createdAt: string;
  updatedAt: string;
  edd: string;
  dimensions: string;
  productDescription: string;
  paymentMode: string;
  invoiceValue: string;
  ewayBills: string;
  events: TrackingEvent[];
  providerSyncStatus?: string;
  pickupReference?: string;
  providerBookingId?: string;
  providerPickupId?: string;
};

const normalizeStatus = (value: unknown): Status => {
  const key = String(value ?? "booked").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const map: Record<string, Status> = { booked: "Booked", pending: "Booked", manifested: "Booked", picked_up: "Picked up", pickedup: "Picked up", in_transit: "In transit", intransit: "In transit", out_for_delivery: "Out for delivery", delivered: "Delivered", delayed: "Delayed", exception: "Exception", returned: "Returned", cancelled: "Cancelled", canceled: "Cancelled" };
  return map[key] ?? "Booked";
};

const parseBoxAwbs = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : []; } catch { return []; }
};

const formatDimensions = (value: unknown) => {
  let parsed = value;
  if (typeof value === "string" && value.trim()) {
    try { parsed = JSON.parse(value) as unknown; } catch { return value; }
  }
  if (!Array.isArray(parsed)) return "Not provided";
  const groups = parsed.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const group = item as Record<string, unknown>;
    const length = Number(group.length);
    const width = Number(group.width ?? group.breadth);
    const height = Number(group.height);
    const quantity = Number(group.quantity ?? group.boxCount ?? group.box_count ?? 1);
    if (![length, width, height, quantity].every((number) => Number.isFinite(number) && number > 0)) return [];
    return [`${length} × ${width} × ${height} cm${quantity > 1 ? ` · ${quantity} boxes` : ""}`];
  });
  return groups.join(" · ") || "Not provided";
};

const formatDate = (value: string) => {
  if (!value || value === "Not provided") return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const formatDateTime = (value: string) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};

function mapShipment(row: Record<string, unknown>): Shipment {
  const status = normalizeStatus(row.status);
  const id = String(row.id ?? "unknown");
  const lrNumber = String(row.lr_number ?? "").trim() || undefined;
  const masterAwb = String(row.master_awb ?? row.provider_awb ?? "").trim() || undefined;
  const pickupReference = String(row.pickup_reference ?? "").trim() || undefined;
  const legacyReference = String(row.tracking_number ?? row.provider_reference ?? "").trim() || undefined;
  const reference = lrNumber || masterAwb || pickupReference || legacyReference || String(row.pss_reference ?? id);
  const referenceLabel = lrNumber ? "LRN" : masterAwb ? "Master AWB" : pickupReference ? "PUR" : legacyReference ? "Provider reference" : "PSS shipment ID";
  const createdAt = String(row.created_at ?? "");
  const events = Array.isArray(row.tracking_events) ? (row.tracking_events as Array<Record<string, unknown>>).map((event) => ({
    title: normalizeStatus(event.status),
    description: String(event.description ?? "Tracking event received from production API"),
    location: String(event.location ?? "Not provided"),
    eventTime: String(event.event_time ?? event.created_at ?? createdAt),
    status: normalizeStatus(event.status),
  })) : [];
  return {
    id,
    reference,
    referenceLabel,
    lrNumber,
    masterAwb,
    pickupReference,
    boxAwbs: parseBoxAwbs(row.box_awbs_json),
    provider: String(row.provider ?? "Delhivery"),
    status,
    pieces: Number(row.pieces ?? 1),
    weight: `${Number(row.total_weight_kg ?? 0).toFixed(2)} kg`,
    origin: String(row.origin ?? "Not provided"),
    destination: String(row.destination ?? "Not provided"),
    consignee: String(row.consignee ?? "Not provided"),
    createdAt,
    updatedAt: String(row.updated_at ?? createdAt),
    edd: String(row.edd ?? "Awaiting provider estimate"),
    dimensions: formatDimensions(row.dimensions_json ?? row.dimensions),
    productDescription: String(row.description ?? row.product_description ?? "Not provided"),
    paymentMode: String(row.payment_mode ?? "Not provided"),
    invoiceValue: String(row.declared_value ?? "Not provided"),
    ewayBills: String(row.eway_bills ?? "0"),
    events: events.length ? events : [{ title: status, description: "Shipment persisted in the production operations API", location: String(row.origin ?? "Not provided"), eventTime: createdAt, status }],
    providerSyncStatus: String(row.provider_sync_status ?? "").trim() || undefined,
    providerBookingId: String(row.provider_booking_id ?? "").trim() || undefined,
    providerPickupId: String(row.provider_pickup_id ?? "").trim() || undefined,
  };
}

const statusLabel = (shipment: Shipment) => {
  if (shipment.status === "Exception" || shipment.providerSyncStatus?.toLowerCase() === "failed") return "Provider booking failed";
  if (shipment.status === "Booked") return "Ready to Ship";
  return shipment.status;
};

const statusTone = (status: Status) => status === "Exception" ? "danger" : status === "Delivered" ? "success" : status === "Delayed" ? "warning" : "info";

function StatusChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "purple" | "blue" | "green" | "amber" }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", tone === "purple" && "border-purple-200 bg-purple-50 text-purple-700", tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700", tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700", tone === "amber" && "border-amber-200 bg-amber-50 text-amber-700", tone === "neutral" && "border-slate-200 bg-white text-slate-600")}>{children}</span>;
}

function SectionHeader({ icon, title, open, onClick }: { icon: React.ReactNode; title: string; open: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900">{icon}{title}</span>{open ? <ChevronUp className="size-4 text-slate-500" /> : <ChevronDown className="size-4 text-slate-500" />}</button>;
}

function ShipmentActions({ onNotice, onInvoice }: { onNotice: (message: string) => void; onInvoice: () => void }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onNotice("Raise ticket is available through the PSS support workflow.")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><LifeBuoy className="size-3.5" />Raise ticket</button><button type="button" onClick={() => onNotice("The LR document is not available for this shipment yet.")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><Download className="size-3.5" />Download LR</button><button type="button" onClick={() => onNotice("POD is available after delivery confirmation.")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><FileCheck2 className="size-3.5" />POD</button><button type="button" onClick={onInvoice} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><ReceiptText className="size-3.5" />View invoice</button><button type="button" onClick={() => onNotice("Print label action is ready for the provider document workflow.")} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><Printer className="size-3.5" />Print label</button></div>;
}

function TrackingTimeline({ shipment, scanOpen, setScanOpen, onNotice, onInvoice }: { shipment: Shipment; scanOpen: boolean; setScanOpen: (value: boolean) => void; onNotice: (message: string) => void; onInvoice: () => void }) {
  const stages: Status[] = ["Booked", "In transit", "Out for delivery", "Delivered"];
  const current = shipment.status === "Exception" || shipment.status === "Delayed" ? 1 : Math.max(0, stages.indexOf(shipment.status));
  const latest = shipment.events.at(-1);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 sm:px-5"><div className="grid size-7 place-items-center rounded-md bg-rose-50 text-rose-600"><Truck className="size-4" /></div><h2 className="text-base font-semibold text-slate-900">Shipment tracking</h2></div><div className="px-4 py-5 sm:px-6"><ol aria-label="Shipment tracking" className="space-y-0">{stages.map((stage, index) => { const complete = index <= current; const active = index === current; const event = index === current ? latest : undefined; return <li key={stage} className="relative flex gap-3"><div className="flex w-4 shrink-0 flex-col items-center"><span className={cn("z-10 mt-0.5 grid size-4 place-items-center rounded-full border-2 bg-white", complete ? "border-emerald-500" : "border-slate-300")}>{complete && <span className="size-2 rounded-full bg-emerald-500" />}</span>{index < stages.length - 1 && <span className={cn("w-0.5 flex-1", index < current ? "bg-emerald-500" : "bg-slate-200")} />}</div><div className={cn("min-w-0 flex-1", index < stages.length - 1 ? "pb-7" : "pb-1")}><div className={cn("text-sm font-semibold", active ? "text-slate-900" : "text-slate-400")}>{stage === "Booked" ? "Manifested" : stage}</div>{active && event?.eventTime && <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.eventTime)}</p>}{active && index === 0 && <div className="mt-3 space-y-2"><ShipmentActions onNotice={onNotice} onInvoice={onInvoice} /><button type="button" onClick={() => setScanOpen(!scanOpen)} className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-blue-600 hover:text-blue-700">{scanOpen ? "Show less" : "View scan details"}<ChevronDown className={cn("size-3.5 transition", scanOpen && "rotate-180")} /></button></div>}{active && scanOpen && latest && <div className="mt-3 grid gap-1.5 border-l-2 border-blue-100 pl-3 text-xs"><span className="text-slate-500">{formatDateTime(latest.eventTime)}</span><span className="font-medium text-slate-700">{latest.description}{latest.location !== "Not provided" ? ` at ${latest.location}` : ""}</span></div>}</div></li>; })}</ol></div></section>;
}

function DetailRow({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"><span className="text-xs text-slate-500">{label}</span><span className="flex min-w-0 items-center gap-1 text-right text-xs font-medium text-slate-800">{value}{action}</span></div>;
}

export default function DelhiveryTrackingPane() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("id") ?? "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [addressesOpen, setAddressesOpen] = useState(true);
  const [fullAddress, setFullAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (showNotice = false) => {
    setLoading(true); setLoadError("");
    try {
      const result = await pssApi<{ data: Record<string, unknown>[] }>("/v1/shipments?limit=50&offset=0&include_tracking=1");
      const rows = (result.data ?? []).map(mapShipment);
      setShipments(rows);
      if (showNotice) setNotice("Tracking data refreshed from production.");
    } catch (error) {
      const message = getPssErrorDetails(error, "Shipment data is temporarily unavailable.").message;
      setLoadError(message); setNotice(message);
    } finally { setLoading(false); }
  };

  // The initial fetch synchronizes the component with the authenticated shipment API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const selected = useMemo(() => shipments.find((shipment) => shipment.id === selectedId || shipment.reference === selectedId) ?? shipments[0], [shipments, selectedId]);

  const refreshTracking = async () => {
    if (!selected) return;
    setRefreshing(true); setNotice("");
    try {
      const result = await pssApi<{ data?: Array<Record<string, unknown>>; provider_status?: string }>(`/v1/shipments/${encodeURIComponent(selected.id)}/tracking`);
      const events = (result.data ?? []).map((event) => ({ title: normalizeStatus(event.status), description: String(event.description ?? "Tracking event received from Delhivery"), location: String(event.location ?? "Not provided"), eventTime: String(event.event_time ?? selected.updatedAt), status: normalizeStatus(event.status) }));
      setShipments((current) => current.map((shipment) => shipment.id === selected.id ? { ...shipment, events: events.length ? events : shipment.events, status: events.at(-1)?.status ?? shipment.status, updatedAt: events.at(-1)?.eventTime ?? shipment.updatedAt } : shipment));
      setNotice(`Live tracking loaded${result.provider_status ? ` · ${result.provider_status}` : ""}.`);
    } catch (error) { setNotice(getPssErrorDetails(error, "Live tracking could not be loaded.").message); } finally { setRefreshing(false); }
  };

  if (loading && !shipments.length) return <div className="tracking-pane w-full min-w-0 bg-background p-4 text-foreground sm:p-6"><div className="mx-auto grid w-full max-w-[1400px] gap-4"><div className="h-44 animate-pulse rounded-xl border border-border bg-card" /><div className="h-64 animate-pulse rounded-xl border border-border bg-card" /><div className="h-52 animate-pulse rounded-xl border border-border bg-card" /><div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading production tracking…</div></div></div>;
  if (!selected) return <div className="tracking-pane grid min-h-[420px] w-full min-w-0 place-items-center rounded-xl border border-border bg-card p-8 text-center text-foreground"><div><Package className="mx-auto size-7 text-muted-foreground" /><h1 className="mt-3 text-base font-semibold">{loadError ? "Shipment data is unavailable" : "No shipments yet"}</h1><p className="mt-1 text-sm text-muted-foreground">{loadError || "Shipment tracking will appear here once a shipment is available."}</p><button type="button" onClick={() => void load(true)} className="mt-4 rounded-md border border-input px-3 py-2 text-xs font-semibold">Retry</button></div></div>;

  const tone = statusTone(selected.status);
  const latest = selected.events.at(-1);
  const copyReference = async () => { try { await navigator.clipboard.writeText(selected.reference); } catch { /* clipboard may be unavailable */ } setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const isReadyToShip = selected.status === "Booked";
  const fullDeliveryAddress = selected.destination;

  const showInvoice = () => {
    setSummaryOpen(true);
    setNotice("Invoice details are shown in Order summary.");
  };

  return <div className="tracking-pane relative min-h-full w-full min-w-0 bg-background pb-20 text-foreground">
    <main className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center px-4 pt-4 sm:px-5"><nav aria-label="Page breadcrumb" className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><span>Orders</span><ChevronRight className="size-3" /><span>B2B Orders</span><ChevronRight className="size-3" /><span className="truncate font-medium text-slate-800">{selected.referenceLabel} {selected.reference}</span></nav></div><div className="px-4 pb-4 pt-5 sm:px-6"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600"><Truck className="size-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight">{selected.referenceLabel} {selected.reference}</h1><button type="button" aria-label="Copy shipment reference" onClick={() => void copyReference()} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Copy className="size-3.5" /></button></div><p className="mt-1 text-sm text-slate-600">{selected.masterAwb ? `Master AWB: ${selected.masterAwb} · ` : ""}{selected.pieces} {selected.pieces === 1 ? "Box" : "Boxes"}</p><p className="mt-1 text-sm text-slate-600">· Created on: {formatDate(selected.createdAt)}</p></div></div><button type="button" onClick={() => void refreshTracking()} disabled={refreshing} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />Refresh</button></div><div className="mt-4 border-t border-slate-200 pt-4"><div className="flex flex-wrap gap-2"><StatusChip tone={tone === "danger" ? "purple" : "neutral"}>{selected.status === "Exception" ? "Exception" : selected.status}</StatusChip><StatusChip tone="blue">{selected.provider}</StatusChip><StatusChip tone="blue">BTC</StatusChip><StatusChip tone="blue">{selected.paymentMode === "Not provided" ? "Prepaid" : selected.paymentMode}</StatusChip></div><div className={cn("mt-4 flex items-start gap-3 rounded-md px-3 py-3", tone === "danger" ? "bg-rose-50" : "bg-emerald-50/70")}><Truck className={cn("mt-0.5 size-4 shrink-0", tone === "danger" ? "text-rose-600" : "text-emerald-600")} /><div><p className="text-sm font-medium">{statusLabel(selected)}</p><p className="mt-0.5 text-xs text-slate-600">{isReadyToShip ? "Print shipping label and schedule pickup to get it delivered without any delays" : latest?.description ?? "Shipment movement is being tracked from the provider."}</p></div></div></div></div></section>
      <TrackingTimeline shipment={selected} scanOpen={scanOpen} setScanOpen={setScanOpen} onNotice={setNotice} onInvoice={showInvoice} />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={<ReceiptText className="size-4 text-rose-600" />} title="Order summary" open={summaryOpen} onClick={() => setSummaryOpen(!summaryOpen)} />{summaryOpen && <div className="border-t border-slate-200 px-4 pb-4 sm:px-5"><div className="mt-4 rounded-lg bg-slate-50 p-3"><h3 className="mb-3 text-sm font-semibold">Box details</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500">Box count</p><p className="mt-1 text-xs font-semibold">{selected.pieces}</p></div><div><p className="text-xs text-slate-500">Dimensions</p><p className="mt-1 text-xs font-semibold">{selected.dimensions}</p></div></div></div><div className="mt-4 space-y-1"><DetailRow label="Chargeable weight" value={selected.weight} /><DetailRow label="Actual weight" value={selected.weight} /></div><div className="mt-4 rounded-lg bg-slate-50 p-3"><h3 className="mb-3 text-sm font-semibold">Invoice details</h3><DetailRow label="Payment mode" value={selected.paymentMode === "Not provided" ? "Prepaid" : selected.paymentMode} /><DetailRow label="Product description" value={selected.productDescription} /><DetailRow label="PO number" value="NIL" action={<button type="button" onClick={() => setNotice("PO editing is available from the shipment workflow.")} className="ml-1 text-blue-600">Add</button>} /><DetailRow label="PO expiry date" value="NIL" action={<button type="button" onClick={() => setNotice("PO expiry editing is available from the shipment workflow.")} className="ml-1 text-blue-600">Add</button>} /><DetailRow label="Invoices" value="1" /><DetailRow label="Total invoice value" value={selected.invoiceValue} /><DetailRow label="E-way bills" value={selected.ewayBills} /></div></div>}</section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={<MapPin className="size-4 text-rose-600" />} title="Addresses" open={addressesOpen} onClick={() => setAddressesOpen(!addressesOpen)} />{addressesOpen && <div className="border-t border-slate-200 px-4 pb-4 sm:px-5"><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Pickup Address</p><p className="mt-1 text-sm font-semibold">PSS Logistics</p><p className="text-xs text-slate-600">{selected.origin}</p></div><div><p className="text-xs text-slate-500">Delivery Address</p><p className="mt-1 text-sm font-semibold">{selected.consignee}</p><p className="text-xs text-slate-600">{fullAddress ? fullDeliveryAddress : fullDeliveryAddress.length > 44 ? `${fullDeliveryAddress.slice(0, 44)}…` : fullDeliveryAddress}</p>{fullDeliveryAddress.length > 44 && <button type="button" onClick={() => setFullAddress(!fullAddress)} className="mt-1 text-xs font-medium text-blue-600">{fullAddress ? "Show less" : "View Address"}</button>}</div></div></div>}</section>
    </main>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:bottom-4 sm:left-6 sm:right-6 sm:mx-auto sm:max-w-[1400px] sm:rounded-lg sm:border sm:shadow-lg"><div className="grid grid-cols-6 gap-2 sm:grid-cols-5"><button type="button" onClick={() => setNotice("Raise ticket is available through the PSS support workflow.")} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-1"><LifeBuoy className="size-3.5" />Raise ticket</button><button type="button" onClick={() => setNotice("The LR document is not available for this shipment yet.")} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-1"><Download className="size-3.5" />Download LR</button><button type="button" onClick={() => setNotice("POD is available after delivery confirmation.")} className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-1"><FileCheck2 className="size-3.5" />POD</button><button type="button" onClick={showInvoice} className="col-span-2 col-start-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-start-auto"><ReceiptText className="size-3.5" />Invoice</button><button type="button" onClick={() => setNotice("Print label action is ready for the provider document workflow.")} className="col-span-2 col-start-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-start-auto"><Printer className="size-3.5" />Print label</button></div></div>
    {notice && <div role="status" className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg"><CheckCircle2 className="size-3.5 text-emerald-600" />{notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X className="size-3.5" /></button></div>}
    {copied && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white">Copied</div>}
  </div>;
}

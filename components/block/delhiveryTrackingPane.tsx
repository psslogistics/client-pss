"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
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
  Search,
  Truck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPssErrorDetails, pssApi } from "@/lib/pss-api";
import { jsPDF } from "jspdf";
import { Skeleton, SkeletonBadge, SkeletonCard, SkeletonHeading, SkeletonInput, SkeletonText, SkeletonTimeline } from "@/components/ui/skeleton";

type Status = "Booked" | "Picked up" | "In transit" | "Out for delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
type TrackingEvent = { title: string; description: string; location: string; eventTime: string; status: Status };
type Shipment = {
  id: string;
  pssReference: string;
  reference: string;
  referenceLabel: string;
  lrNumber?: string;
  masterAwb?: string;
  trackingNumber?: string;
  providerReference?: string;
  boxAwbs: string[];
  provider: string;
  status: Status;
  pieces: number;
  weight: string;
  origin: string;
  consignor: string;
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
  invoiceNumber?: string;
};

const addressName = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "object" && !Array.isArray(value)) return String((value as Record<string, unknown>).name ?? "").trim();
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? String((parsed as Record<string, unknown>).name ?? "").trim() : "";
  } catch { return ""; }
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

const podBase64 = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(podBase64);
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const direct = ["content_base64", "base64", "data"].flatMap((key) => typeof record[key] === "string" ? [record[key] as string] : []);
  return direct.length ? direct : Object.values(record).flatMap(podBase64);
};

const podUrl = (value: unknown): string | undefined => {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : undefined;
  if (Array.isArray(value)) return value.map(podUrl).find(Boolean);
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["download_url", "downloadUrl", "file_url", "fileUrl", "url", "link"]) {
    const found = podUrl(record[key]);
    if (found) return found;
  }
  return Object.values(record).map(podUrl).find(Boolean);
};

const savePod = (name: string, value: string, contentType: string) => {
  const normalized = value.replace(/^data:[^;]+;base64,/, "");
  const bytes = Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([bytes], { type: contentType }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
};

type LabelOption = { size: string; contentType: string; artifact: unknown; copies: number };

const artifactContentType = (value: unknown): string => {
  if (!value || typeof value !== "object") return "application/octet-stream";
  const record = value as Record<string, unknown>;
  for (const key of ["content_type", "contentType", "mime_type", "mimeType"]) {
    if (typeof record[key] === "string" && record[key]) return String(record[key]);
  }
  for (const child of Object.values(record)) {
    const found = artifactContentType(child);
    if (found !== "application/octet-stream") return found;
  }
  return "application/octet-stream";
};

const artifactCopies = (value: unknown) => {
  if (!value || typeof value !== "object") return 1;
  const record = value as Record<string, unknown>;
  const copies = Number(record.copies);
  return Number.isFinite(copies) && copies > 0 ? copies : Array.isArray(record.artifacts) ? record.artifacts.length : 1;
};

const labelImage = (base64: string, contentType: string) => new Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" }>((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const normalizedType = contentType.toLowerCase();
    if (normalizedType.includes("png") || normalizedType.includes("jpeg") || normalizedType.includes("jpg")) {
      resolve({ dataUrl: `data:${contentType};base64,${base64}`, width: image.naturalWidth, height: image.naturalHeight, format: normalizedType.includes("jpeg") || normalizedType.includes("jpg") ? "JPEG" : "PNG" });
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) { reject(new Error("Unable to prepare the Delhivery label image.")); return; }
    context.drawImage(image, 0, 0);
    resolve({ dataUrl: canvas.toDataURL("image/png"), width: image.naturalWidth, height: image.naturalHeight, format: "PNG" });
  };
  image.onerror = () => reject(new Error("Unable to read the Delhivery label image."));
  image.src = `data:${contentType};base64,${base64}`;
});

const downloadLabelPdf = async (name: string, base64s: string[], contentType: string, size: string) => {
  const images = await Promise.all(base64s.map((value) => labelImage(value, contentType)));
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const pageWidth = 210; const pageHeight = 297; const margin = 6; const gap = 4;
  const grid = size === "sm" ? { columns: 2, rows: 3 } : size === "md" || size === "a4" ? { columns: 2, rows: 2 } : size === "std" ? { columns: 1, rows: 2 } : { columns: 1, rows: 1 };
  const perPage = grid.columns * grid.rows;
  images.forEach((image, index) => {
    if (index > 0 && index % perPage === 0) pdf.addPage("a4", "portrait");
    const pageIndex = index % perPage;
    const cellWidth = (pageWidth - margin * 2 - gap * (grid.columns - 1)) / grid.columns;
    const cellHeight = (pageHeight - margin * 2 - gap * (grid.rows - 1)) / grid.rows;
    const column = pageIndex % grid.columns; const row = Math.floor(pageIndex / grid.columns);
    // Treat provider pixels at their native 96-DPI physical size. Never
    // enlarge a Delhivery image; upscaling is what made small labels blur.
    const nativeWidth = image.width * 25.4 / 96;
    const nativeHeight = image.height * 25.4 / 96;
    const scale = Math.min(1, cellWidth / nativeWidth, cellHeight / nativeHeight);
    const width = nativeWidth * scale; const height = nativeHeight * scale;
    const x = margin + column * (cellWidth + gap) + (cellWidth - width) / 2;
    const y = margin + row * (cellHeight + gap) + (cellHeight - height) / 2;
    pdf.addImage(image.dataUrl, image.format, x, y, width, height, undefined, "NONE");
  });
  pdf.save(name);
};

function mapShipment(row: Record<string, unknown>): Shipment {
  const status = normalizeStatus(row.status);
  const id = String(row.id ?? "unknown");
  const pssReference = id;
  const lrNumber = String(row.lr_number ?? "").trim() || undefined;
  const masterAwb = String(row.master_awb ?? row.provider_awb ?? "").trim() || undefined;
  const trackingNumber = String(row.tracking_number ?? "").trim() || undefined;
  const providerReference = String(row.provider_reference ?? "").trim() || undefined;
  const pickupReference = String(row.pickup_reference ?? "").trim() || undefined;
  const invoiceNumber = String(row.invoice_number ?? "").trim() || undefined;
  const consignor = addressName(row.origin_address_json) || String(row.consignor ?? "").trim() || "Not provided";
  const consignee = addressName(row.destination_address_json) || String(row.consignee ?? "").trim() || "Not provided";
  const legacyReference = trackingNumber || providerReference;
  const reference = lrNumber || masterAwb || pickupReference || legacyReference || "Courier reference unavailable";
  const referenceLabel = lrNumber ? "LRN" : masterAwb ? "Master AWB" : pickupReference ? "PUR" : legacyReference ? "Provider reference" : "Courier reference";
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
    pssReference,
    reference,
    referenceLabel,
    lrNumber,
    masterAwb,
    trackingNumber,
    providerReference,
    pickupReference,
    boxAwbs: parseBoxAwbs(row.box_awbs_json),
    provider: String(row.provider ?? "Delhivery"),
    status,
    pieces: Number(row.pieces ?? 1),
    weight: `${Number(row.total_weight_kg ?? 0).toFixed(2)} kg`,
    origin: String(row.origin ?? "Not provided"),
    destination: String(row.destination ?? "Not provided"),
    consignor,
    consignee,
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
    invoiceNumber,
  };
}

const statusLabel = (shipment: Shipment) => {
  if (shipment.status === "Exception" || shipment.providerSyncStatus?.toLowerCase() === "failed") return "Provider booking failed";
  if (shipment.status === "Booked" && !(shipment.lrNumber || shipment.masterAwb || shipment.trackingNumber || shipment.providerReference)) return "Awaiting LR/AWB confirmation";
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

function ShipmentActions({ onNotice, onInvoice, onPod, onLr, onLabel }: { onNotice: (message: string) => void; onInvoice: () => void; onPod: () => void; onLr: () => void; onLabel: () => void }) {
  const actionClass = "inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
  return <div className="grid grid-cols-6 gap-2 sm:grid-cols-5"><button type="button" onClick={() => onNotice("Raise ticket is available through the PSS support workflow.")} className={cn(actionClass, "col-span-2 sm:col-span-1")}><LifeBuoy className="size-3.5" />Raise ticket</button><button type="button" onClick={onLr} className={cn(actionClass, "col-span-2 sm:col-span-1")}><Download className="size-3.5" />Download WayBill</button><button type="button" onClick={onPod} className={cn(actionClass, "col-span-2 sm:col-span-1")}><FileCheck2 className="size-3.5" />POD</button><button type="button" onClick={onInvoice} className={cn(actionClass, "col-span-2 col-start-2 sm:col-start-auto sm:col-span-1")}><ReceiptText className="size-3.5" />Invoice</button><button type="button" onClick={onLabel} className={cn(actionClass, "col-span-2 col-start-4 sm:col-start-auto sm:col-span-1")}><Printer className="size-3.5" />Print label</button></div>;
}

function TrackingTimeline({ shipment, scanOpen, setScanOpen }: { shipment: Shipment; scanOpen: boolean; setScanOpen: (value: boolean) => void }) {
  const stages: Status[] = ["Booked", "In transit", "Out for delivery", "Delivered"];
  const current = shipment.status === "Exception" || shipment.status === "Delayed" ? 1 : Math.max(0, stages.indexOf(shipment.status));
  const latest = shipment.events.at(-1);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 sm:px-5"><div className="grid size-7 place-items-center rounded-md bg-rose-50 text-rose-600"><Truck className="size-4" /></div><h2 className="text-base font-semibold text-slate-900">Shipment tracking</h2></div><div className="px-4 py-5 sm:px-6"><ol aria-label="Shipment tracking" className="space-y-0">{stages.map((stage, index) => { const complete = index <= current; const active = index === current; const event = index === current ? latest : undefined; return <li key={stage} className="relative flex gap-3"><div className="flex w-4 shrink-0 flex-col items-center"><span className={cn("z-10 mt-0.5 grid size-4 place-items-center rounded-full border-2 bg-white", complete ? "border-emerald-500" : "border-slate-300")}>{complete && <span className="size-2 rounded-full bg-emerald-500" />}</span>{index < stages.length - 1 && <span className={cn("w-0.5 flex-1", index < current ? "bg-emerald-500" : "bg-slate-200")} />}</div><div className={cn("min-w-0 flex-1", index < stages.length - 1 ? "pb-7" : "pb-1")}><div className={cn("text-sm font-semibold", active ? "text-slate-900" : "text-slate-400")}>{stage === "Booked" ? "Manifested" : stage}</div>{active && event?.eventTime && <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.eventTime)}</p>}{active && index === 0 && <div className="mt-3"><button type="button" onClick={() => setScanOpen(!scanOpen)} className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-blue-600 hover:text-blue-700">{scanOpen ? "Show less" : "View scan details"}<ChevronDown className={cn("size-3.5 transition", scanOpen && "rotate-180")} /></button></div>}{active && scanOpen && latest && <div className="mt-3 grid gap-1.5 border-l-2 border-blue-100 pl-3 text-xs"><span className="text-slate-500">{formatDateTime(latest.eventTime)}</span><span className="font-medium text-slate-700">{latest.description}{latest.location !== "Not provided" ? ` at ${latest.location}` : ""}</span></div>}</div></li>; })}</ol></div></section>;
}

function DetailRow({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0"><span className="text-xs text-slate-500">{label}</span><span className="flex min-w-0 items-center gap-1 text-right text-xs font-medium text-slate-800">{value}{action}</span></div>;
}

function Identifier({ label, value }: { label: string; value?: string }) {
  return <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-xs font-semibold text-slate-800" title={value || "Not available"}>{value || "Not available"}</p></div>;
}

export default function DelhiveryTrackingPane() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId, setSelectedId] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("id") ?? "");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [addressesOpen, setAddressesOpen] = useState(true);
  const [fullAddress, setFullAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Shipment[]>([]);
  const [searching, setSearching] = useState(false);
  const [routeShipmentLoaded, setRouteShipmentLoaded] = useState(false);
  const [labelOptions, setLabelOptions] = useState<LabelOption[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const routeRefreshId = useRef<string | null>(null);

  const load = async (showNotice = false) => {
    setLoading(true); setLoadError("");
    try {
      const result = await pssApi<{ data: Record<string, unknown>[] }>("/v1/shipments?limit=50&offset=0&include_tracking=1");
      const rows = (result.data ?? []).map(mapShipment);
      setShipments(rows);
      if (selectedId && !rows.some((shipment) => shipment.id === selectedId || shipment.pssReference === selectedId)) {
        const detail = await pssApi<{ data?: Record<string, unknown> }>(`/v1/shipments/${encodeURIComponent(selectedId)}`);
        if (detail.data) {
          const linkedShipment = mapShipment(detail.data);
          setShipments((current) => [linkedShipment, ...current.filter((shipment) => shipment.id !== linkedShipment.id)]);
        }
      }
      setRouteShipmentLoaded(true);
      if (showNotice) setNotice("Tracking data refreshed from production.");
    } catch (error) {
      const message = getPssErrorDetails(error, "Shipment data is temporarily unavailable.").message;
      setLoadError(message); setNotice(message); setRouteShipmentLoaded(true);
    } finally { setLoading(false); }
  };

  // The initial fetch synchronizes the component with the authenticated shipment API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setSearchResults([]); setSearching(false); return; }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void pssApi<{ data?: Record<string, unknown>[] }>(`/v1/shipments?limit=50&offset=0&include_tracking=1&search=${encodeURIComponent(term)}`)
        .then((result) => setSearchResults((result.data ?? []).map(mapShipment)))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selected = useMemo(() => {
    const linked = selectedId ? shipments.find((shipment) => shipment.id === selectedId || shipment.pssReference === selectedId || shipment.reference === selectedId) : undefined;
    return linked ?? (selectedId ? undefined : shipments[0]);
  }, [shipments, selectedId]);
  const visibleSearchResults = query.trim() ? searchResults : [];

  const refreshTracking = async (shipment: Shipment = selected as Shipment) => {
    if (!shipment) return;
    setRefreshing(true); setNotice("");
    try {
      const result = await pssApi<{ data?: Array<Record<string, unknown>>; provider_status?: string }>(`/v1/shipments/${encodeURIComponent(shipment.id)}/tracking`);
      const events = (result.data ?? []).map((event) => ({ title: normalizeStatus(event.status), description: String(event.description ?? "Tracking event received from Delhivery"), location: String(event.location ?? "Not provided"), eventTime: String(event.event_time ?? shipment.updatedAt), status: normalizeStatus(event.status) }));
      let refreshedShipment: Shipment | undefined;
      try {
        const detail = await pssApi<{ data?: Record<string, unknown> }>(`/v1/shipments/${encodeURIComponent(shipment.id)}`);
        if (detail.data) refreshedShipment = mapShipment(detail.data);
      } catch {
        // Tracking status can still be displayed if the follow-up record read fails.
      }
      setShipments((current) => current.map((currentShipment) => {
        if (currentShipment.id !== shipment.id) return currentShipment;
        const latestEvent = events.at(-1);
        return {
          ...(refreshedShipment ? { ...currentShipment, ...refreshedShipment } : currentShipment),
          events: events.length ? events : currentShipment.events,
          status: latestEvent?.status ?? refreshedShipment?.status ?? currentShipment.status,
          updatedAt: latestEvent?.eventTime ?? refreshedShipment?.updatedAt ?? currentShipment.updatedAt,
        };
      }));
      const providerStatus = String(result.provider_status ?? "").toLowerCase();
      const providerFailed = ["invalid_request", "error", "failed"].includes(providerStatus);
      setNotice(providerFailed
        ? `Live tracking could not be loaded${result.provider_status ? ` · ${result.provider_status}` : ""}.`
        : `Live tracking loaded${result.provider_status ? ` · ${result.provider_status}` : ""}.`);
    } catch (error) { setNotice(getPssErrorDetails(error, "Live tracking could not be loaded.").message); } finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (!routeShipmentLoaded || !selected || routeRefreshId.current === selected.id) return;
    routeRefreshId.current = selected.id;
    void refreshTracking(selected);
  }, [routeShipmentLoaded, selected]);

  if (loading && !shipments.length) return <div className="tracking-pane w-full min-w-0 bg-background p-4 text-foreground sm:p-6" role="status" aria-label="Loading production tracking" aria-busy="true"><div className="mx-auto grid w-full max-w-[1400px] gap-4"><div className="flex flex-wrap items-center gap-3"><SkeletonInput className="min-w-[240px] flex-1" /><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-24 rounded-lg" /></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><SkeletonCard className="min-h-[260px] p-5"><div className="flex items-start justify-between gap-3"><div><SkeletonHeading className="w-44" /><SkeletonText className="mt-2 w-64" /></div><SkeletonBadge /></div><div className="mt-6 grid grid-cols-2 gap-3"><SkeletonText /><SkeletonText /><SkeletonText /><SkeletonText /></div></SkeletonCard><SkeletonCard className="min-h-[260px] p-5"><SkeletonHeading className="w-36" /><SkeletonTimeline className="mt-6" items={4} /></SkeletonCard></div><SkeletonCard className="min-h-[360px] p-5"><div className="flex items-center justify-between"><SkeletonHeading className="w-40" /><SkeletonBadge /></div><SkeletonTimeline className="mt-6" items={5} /></SkeletonCard></div></div>;
  if (!selected) return <div className="tracking-pane grid min-h-[420px] w-full min-w-0 place-items-center rounded-xl border border-border bg-card p-8 text-center text-foreground"><div><Package className="mx-auto size-7 text-muted-foreground" /><h1 className="mt-3 text-base font-semibold">{loadError ? "Shipment data is unavailable" : selectedId ? "Shipment not found" : "No shipments yet"}</h1><p className="mt-1 text-sm text-muted-foreground">{loadError || (selectedId ? `The linked shipment ${selectedId} could not be loaded.` : "Shipment tracking will appear here once a shipment is available.")}</p><button type="button" onClick={() => void load(true)} className="mt-4 rounded-md border border-input px-3 py-2 text-xs font-semibold">Retry</button></div></div>;

  const tone = statusTone(selected.status);
  const latest = selected.events.at(-1);
  const copyReference = async () => { try { await navigator.clipboard.writeText(selected.reference); } catch { /* clipboard may be unavailable */ } setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  const hasProviderReference = Boolean(selected.lrNumber || selected.masterAwb || selected.trackingNumber || selected.providerReference);
  const isReadyToShip = selected.status === "Booked" && hasProviderReference;
  const fullDeliveryAddress = selected.destination;

  const showInvoice = () => {
    setSummaryOpen(true);
    setNotice("Invoice details are shown in Order summary.");
  };

  const downloadPod = async () => {
    setNotice("Requesting POD from Delhivery…");
    try {
      const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(selected.id)}/document?doc_type=LM_POD`);
      const artifact = result.data?.artifact;
      const base64 = podBase64(artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).find((value) => value.length > 100);
      const directUrl = podUrl(artifact);
      if (base64) {
        const type = typeof (artifact as Record<string, unknown> | undefined)?.content_type === "string" ? String((artifact as Record<string, unknown>).content_type) : "image/jpeg";
        savePod(`delhivery-pod-${selected.reference}.${type.includes("pdf") ? "pdf" : "jpg"}`, base64, type);
        setNotice("POD downloaded from Delhivery.");
        return;
      }
      if (directUrl) {
        window.open(directUrl, "_blank", "noopener,noreferrer");
        setNotice("POD opened from Delhivery.");
        return;
      }
      setNotice("POD is pending Delhivery publication; please retry shortly.");
    } catch (error) {
      setNotice(`POD download failed: ${getPssErrorDetails(error, "The POD could not be retrieved from Delhivery.").message}`);
    }
  };

  const downloadLr = async () => {
    setNotice("Requesting LR from Delhivery…");
    try {
      const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(selected.id)}/lr-copy?lr_copy_type=SHIPPER%20COPY`);
      const artifact = result.data?.artifact;
      const base64 = podBase64(artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).find((value) => value.length > 100);
      const directUrl = podUrl(artifact);
      if (base64) {
        const type = typeof (artifact as Record<string, unknown> | undefined)?.content_type === "string" ? String((artifact as Record<string, unknown>).content_type) : "application/pdf";
        savePod(`lr-${selected.reference}.pdf`, base64, type);
        setNotice("LR downloaded from Delhivery.");
        return;
      }
      if (directUrl) {
        const link = document.createElement("a"); link.href = directUrl; link.download = `lr-${selected.reference}.pdf`; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
        setNotice("LR download started.");
        return;
      }
      setNotice("LR is pending Delhivery publication; please retry shortly.");
    } catch (error) {
      setNotice(`LR download failed: ${getPssErrorDetails(error, "The LR could not be retrieved from Delhivery.").message}`);
    }
  };

  const downloadLabel = (option: LabelOption) => {
    const base64s = podBase64(option.artifact).map((value) => value.replace(/^data:[^;]+;base64,/, "")).filter((value) => value.length > 100);
    const directUrl = podUrl(option.artifact);
    const contentType = option.contentType || artifactContentType(option.artifact);
    if (base64s.length && contentType.includes("pdf")) {
      if (option.size === "a4") {
        // Delhivery's A4 PDF already contains its authoritative four-up box
        // layout and the separate MPS document page. Preserve it byte-for-byte
        // so the MPS document and provider box numbering are not flattened.
        savePod(`delhivery-label-${selected.reference}-${option.size}.pdf`, base64s[0], contentType);
        setNotice(`Delhivery ${option.size} PDF downloaded.`);
        return;
      }
      savePod(`delhivery-label-${selected.reference}-${option.size}.pdf`, base64s[0], contentType);
      setNotice(`Delhivery ${option.size} label downloaded${option.copies > 1 ? ` (${option.copies} copies returned)` : ""}.`);
      return;
    }
    if (base64s.length) {
      const returnedStickerCount = Math.max(1, option.copies);
      const stickers = base64s.slice(0, returnedStickerCount);
      void downloadLabelPdf(`delhivery-label-${selected.reference}-${option.size}.pdf`, stickers, contentType, option.size)
        .then(() => setNotice(`Delhivery ${option.size} PDF downloaded${option.copies > 1 ? ` (${option.copies} assets)` : ""}.`))
        .catch((error) => setNotice(`Label PDF generation failed: ${error instanceof Error ? error.message : "Unable to generate the label PDF."}`));
      return;
    }
    if (directUrl) {
      const link = document.createElement("a"); link.href = directUrl; link.download = `delhivery-label-${selected.reference}-${option.size}`; link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
      setNotice(`Delhivery ${option.size} label download started.`);
      return;
    }
    setNotice(`Delhivery returned no downloadable content for ${option.size}.`);
  };

  const loadLabelOptions = async () => {
    if (labelLoading) return;
    setLabelLoading(true); setNotice("Checking label formats with Delhivery…");
    const sizes = ["sm", "md", "a4", "std"];
    try {
      const results = await Promise.all(sizes.map(async (size) => {
        try {
          const result = await pssApi<{ data?: { artifact?: unknown } }>(`/v1/shipments/${encodeURIComponent(selected.id)}/label?size=${size}`);
          const artifact = result.data?.artifact;
          if (!artifact || (!podBase64(artifact).length && !podUrl(artifact))) return undefined;
          const option: LabelOption = { size, contentType: artifactContentType(artifact), artifact, copies: artifactCopies(artifact) };
          return option;
        } catch {
          return undefined;
        }
      }));
      const available = results.filter((option: LabelOption | undefined): option is LabelOption => Boolean(option));
      setLabelOptions(available);
      setNotice(available.length ? "Delhivery label formats are ready to download." : "Delhivery has not published a label for this shipment yet.");
    } finally {
      setLabelLoading(false);
    }
  };

  return <div className="tracking-pane relative min-h-full w-full min-w-0 bg-background text-foreground">
    <main className="mx-auto w-full max-w-[1400px] space-y-4 p-4 sm:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search shipments in tracking" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments, LR / LRN, AWB, PUR, or PSS reference…" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />{query && <button type="button" aria-label="Clear shipment search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"><X className="size-4" /></button>}</label>{query.trim() && <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200">{searching ? <p className="p-3 text-xs text-slate-500">Searching production shipments…</p> : visibleSearchResults.length ? visibleSearchResults.map((shipment) => <button type="button" key={shipment.id} onClick={() => { setShipments((current) => [shipment, ...current.filter((item) => item.id !== shipment.id)]); setSelectedId(shipment.pssReference); router.replace(`/dashboard/shipmentTracking?id=${encodeURIComponent(shipment.pssReference)}`); setQuery(""); }} className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-900">{shipment.referenceLabel} {shipment.reference}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{shipment.origin} → {shipment.destination}</span></span><StatusChip tone="blue">{shipment.status}</StatusChip></button>) : <p className="p-3 text-xs text-slate-500">No shipment matched that PSS reference, LR/LRN, AWB, or PUR.</p>}</div>}</section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="px-4 pb-4 pt-5 sm:px-6"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600"><Truck className="size-5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight">{selected.referenceLabel} {selected.reference}</h1><button type="button" aria-label="Copy shipment reference" onClick={() => void copyReference()} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Copy className="size-3.5" /></button></div><p className="mt-1 text-sm text-slate-600">{selected.masterAwb ? `Master AWB: ${selected.masterAwb} · ` : ""}{selected.pieces} {selected.pieces === 1 ? "Box" : "Boxes"}</p><p className="mt-1 text-sm text-slate-600">· Created on: {formatDate(selected.createdAt)}</p></div></div><button type="button" onClick={() => void refreshTracking()} disabled={refreshing} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />Refresh</button></div><div className="mt-4 border-t border-slate-200 pt-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"><Identifier label="PSS shipment ID" value={selected.pssReference} /><Identifier label="LR / LRN" value={selected.lrNumber} /><Identifier label="AWB / waybill" value={selected.masterAwb || selected.trackingNumber || selected.providerReference} /><Identifier label="Box AWB(s)" value={selected.boxAwbs.length ? selected.boxAwbs.join(", ") : undefined} /><Identifier label="Invoice number" value={selected.invoiceNumber} /><Identifier label="Pickup reference" value={selected.pickupReference} /><Identifier label="Provider booking ID" value={selected.providerBookingId} /><Identifier label="Provider pickup ID" value={selected.providerPickupId} /></div><div className="mt-3 flex flex-wrap gap-2"><StatusChip tone={tone === "danger" ? "purple" : "neutral"}>{selected.status === "Exception" ? "Exception" : selected.status}</StatusChip><StatusChip tone="blue">{selected.provider}</StatusChip><StatusChip tone="blue">BTC</StatusChip><StatusChip tone="blue">{selected.paymentMode === "Not provided" ? "Prepaid" : selected.paymentMode}</StatusChip></div><div className={cn("mt-4 flex items-start gap-3 rounded-md px-3 py-3", tone === "danger" ? "bg-rose-50" : "bg-emerald-50/70")}><Truck className={cn("mt-0.5 size-4 shrink-0", tone === "danger" ? "text-rose-600" : "text-emerald-600")} /><div><p className="text-sm font-medium">{statusLabel(selected)}</p><p className="mt-0.5 text-xs text-slate-600">{isReadyToShip ? "Print shipping label and schedule pickup to get it delivered without any delays" : latest?.description ?? "Shipment movement is being tracked from the provider."}</p></div></div></div></div></section>
      <TrackingTimeline shipment={selected} scanOpen={scanOpen} setScanOpen={setScanOpen} />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={<ReceiptText className="size-4 text-rose-600" />} title="Order summary" open={summaryOpen} onClick={() => setSummaryOpen(!summaryOpen)} />{summaryOpen && <div className="border-t border-slate-200 px-4 pb-4 sm:px-5"><div className="mt-4 rounded-lg bg-slate-50 p-3"><h3 className="mb-3 text-sm font-semibold">Box details</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500">Box count</p><p className="mt-1 text-xs font-semibold">{selected.pieces}</p></div><div><p className="text-xs text-slate-500">Dimensions</p><p className="mt-1 text-xs font-semibold">{selected.dimensions}</p></div></div></div><div className="mt-4 space-y-1"><DetailRow label="Chargeable weight" value={selected.weight} /><DetailRow label="Actual weight" value={selected.weight} /></div><div className="mt-4 rounded-lg bg-slate-50 p-3"><h3 className="mb-3 text-sm font-semibold">Invoice details</h3><DetailRow label="Payment mode" value={selected.paymentMode === "Not provided" ? "Prepaid" : selected.paymentMode} /><DetailRow label="Product description" value={selected.productDescription} /><DetailRow label="PO number" value="NIL" action={<button type="button" onClick={() => setNotice("PO editing is available from the shipment workflow.")} className="ml-1 text-blue-600">Add</button>} /><DetailRow label="PO expiry date" value="NIL" action={<button type="button" onClick={() => setNotice("PO expiry editing is available from the shipment workflow.")} className="ml-1 text-blue-600">Add</button>} /><DetailRow label="Invoices" value="1" /><DetailRow label="Total invoice value" value={selected.invoiceValue} /><DetailRow label="E-way bills" value={selected.ewayBills} /></div></div>}</section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><SectionHeader icon={<MapPin className="size-4 text-rose-600" />} title="Addresses" open={addressesOpen} onClick={() => setAddressesOpen(!addressesOpen)} />{addressesOpen && <div className="border-t border-slate-200 px-4 pb-4 sm:px-5"><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-slate-500">Pickup Address</p><p className="mt-1 text-sm font-semibold">{selected.consignor}</p><p className="text-xs text-slate-600">{selected.origin}</p></div><div><p className="text-xs text-slate-500">Delivery Address</p><p className="mt-1 text-sm font-semibold">{selected.consignee}</p><p className="text-xs text-slate-600">{fullAddress ? fullDeliveryAddress : fullDeliveryAddress.length > 44 ? `${fullDeliveryAddress.slice(0, 44)}…` : fullDeliveryAddress}</p>{fullDeliveryAddress.length > 44 && <button type="button" onClick={() => setFullAddress(!fullAddress)} className="mt-1 text-xs font-medium text-blue-600">{fullAddress ? "Show less" : "View Address"}</button>}</div></div></div>}</section>
      <section aria-label="Shipment actions" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><div className="grid size-7 place-items-center rounded-md bg-rose-50 text-rose-600"><ReceiptText className="size-4" /></div><div><h2 className="text-sm font-semibold text-slate-900">Shipment actions</h2><p className="text-xs text-slate-500">Documents and support for this shipment</p></div></div><ShipmentActions onNotice={setNotice} onInvoice={showInvoice} onPod={() => void downloadPod()} onLr={() => void downloadLr()} onLabel={() => void loadLabelOptions()} />{labelLoading && <p className="mt-3 text-xs text-slate-500">Fetching available label formats from Delhivery…</p>}{labelOptions.length > 0 && <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/50 p-3"><p className="text-xs font-semibold text-slate-800">Delhivery label formats</p><div className="mt-2 flex flex-wrap gap-2">{labelOptions.map((option) => <button key={option.size} type="button" onClick={() => downloadLabel(option)} className="rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Download {option.size}{option.copies > 1 ? ` · ${option.copies} copies` : ""}</button>)}</div></div>}</section>
    </main>
    {notice && <div role="status" className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-lg"><CheckCircle2 className="size-3.5 text-emerald-600" />{notice}<button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X className="size-3.5" /></button></div>}
    {copied && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-xs font-medium text-white">Copied</div>}
  </div>;
}

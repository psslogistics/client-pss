"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Clock3,
  Copy, Download, FilePlus2, FileSpreadsheet, FileText, Filter, History, MapPin,
  MessageSquare, Package, RefreshCw, Search, Truck, Upload, X,
} from "lucide-react";
import Dropdown from "@/components/ui/dropdown";

type RtoStatus = "Documents pending" | "Ready for return" | "In transit" | "Received at origin" | "Closed";
type DocumentMode = "invoice" | "dc";
type Tone = "primary" | "success" | "warning" | "error";
type TimelineEvent = { title: string; description: string; location: string; date: string; time: string; tone: Tone };
type DocumentPack = {
  mode: DocumentMode;
  invoiceName: string;
  dcNumber: string;
  dcDate: string;
  dcValue: string;
  dcReason: string;
  ewayRequired: boolean;
  ewayName: string;
  ewayNumber: string;
};
type Rto = {
  id: string;
  shipment: string;
  customer: string;
  reason: string;
  status: RtoStatus;
  courier: string;
  tracking: string;
  origin: string;
  destination: string;
  ageing: string;
  ageingDays: number;
  pieces: number;
  weight: string;
  value: string;
  lastUpdated: string;
  receiver: string;
  condition: string;
  nextAction: string;
  documents: DocumentPack;
  events: TimelineEvent[];
  notes: string[];
};

const emptyDocuments = (): DocumentPack => ({
  mode: "invoice", invoiceName: "", dcNumber: "", dcDate: new Date().toISOString().slice(0, 10),
  dcValue: "", dcReason: "Return to origin movement", ewayRequired: false, ewayName: "", ewayNumber: "",
});

const documentReady = (documents: DocumentPack) => {
  const primaryReady = documents.mode === "invoice" ? Boolean(documents.invoiceName) : Boolean(documents.dcNumber && documents.dcDate && documents.dcValue && documents.dcReason);
  const ewayReady = !documents.ewayRequired || Boolean(documents.ewayName && documents.ewayNumber);
  return primaryReady && ewayReady;
};

const statusList: RtoStatus[] = ["Documents pending", "Ready for return", "In transit", "Received at origin", "Closed"];
const reasonList = ["Customer unavailable", "Address issue", "Delivery refused", "Damaged in transit", "Incorrect address"];
const statusStyles: Record<RtoStatus, string> = {
  "Documents pending": "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Ready for return": "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "In transit": "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "Received at origin": "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Closed: "border-border bg-muted text-muted-foreground",
};
const toneStyles: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary", success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600", error: "bg-destructive/10 text-destructive",
};
const createEvent = (title: string, description: string, location: string, date: string, time: string, tone: Tone): TimelineEvent => ({ title, description, location, date, time, tone });

const initialRtos: Rto[] = [
  {
    id: "RTO-2026-0041", shipment: "PSS20260041", customer: "Northstar Retail Pvt Ltd", reason: "Customer unavailable",
    status: "Documents pending", courier: "Delhivery", tracking: "DLV-88310421", origin: "Bengaluru", destination: "Pune",
    ageing: "3 days", ageingDays: 3, pieces: 2, weight: "18 kg", value: "₹18,200", lastUpdated: "Today, 09:42 AM",
    receiver: "Ravi Kumar · Warehouse lead", condition: "Awaiting return", nextAction: "Upload the updated invoice to release the return",
    documents: { ...emptyDocuments(), ewayRequired: false },
    events: [createEvent("Shipment marked for RTO", "Return movement initiated after delivery could not be completed", "Pune", "2026-08-04", "09:15 AM", "warning"), createEvent("Documents requested", "Updated Invoice or Delivery Challan is required", "PSS Operations", "2026-08-04", "09:16 AM", "primary")],
    notes: ["Customer asked the courier to call before any future delivery attempt."],
  },
  {
    id: "RTO-2026-0038", shipment: "PSS20260027", customer: "Atlas Manufacturing", reason: "Delivery refused",
    status: "Ready for return", courier: "Blue Dart", tracking: "BD-44219810", origin: "Mumbai", destination: "Delhi",
    ageing: "2 days", ageingDays: 2, pieces: 5, weight: "64 kg", value: "₹42,600", lastUpdated: "Yesterday, 06:20 PM",
    receiver: "Meera Shah · Receiving desk", condition: "Sealed", nextAction: "Documents complete · return movement is automatic",
    documents: { ...emptyDocuments(), mode: "invoice", invoiceName: "RTO-Invoice-PSS20260027.pdf" },
    events: [createEvent("Shipment marked for RTO", "Recipient refused delivery at destination", "Delhi", "2026-08-05", "11:30 AM", "warning"), createEvent("Documents verified", "Updated return invoice validated successfully", "PSS Operations", "2026-08-06", "06:20 PM", "success")], notes: [],
  },
  {
    id: "RTO-2026-0033", shipment: "PSS20260033", customer: "Meridian Foods", reason: "Damaged in transit",
    status: "In transit", courier: "FedEx", tracking: "FDX-99274101", origin: "Chennai", destination: "Hyderabad",
    ageing: "5 days", ageingDays: 5, pieces: 6, weight: "36 kg", value: "₹55,100", lastUpdated: "Aug 6, 03:18 PM",
    receiver: "Arjun Menon · QA desk", condition: "Outer carton damaged", nextAction: "Await receipt at origin",
    documents: { ...emptyDocuments(), mode: "dc", dcNumber: "DC-RTO-0033", dcValue: "55100", dcReason: "Damaged goods returned to origin", ewayRequired: true, ewayName: "EWAY-PSS20260033.pdf", ewayNumber: "EWB-881042193" },
    events: [createEvent("Shipment marked for RTO", "Damage reported at the destination facility", "Hyderabad", "2026-08-02", "10:10 AM", "warning"), createEvent("Documents verified", "Delivery Challan and E-Way Bill validated", "PSS Operations", "2026-08-03", "01:35 PM", "success"), createEvent("Return in transit", "Automatic return movement is underway", "Bengaluru Hub", "2026-08-06", "03:18 PM", "primary")], notes: ["Photographic evidence requested from the destination team."],
  },
  {
    id: "RTO-2026-0029", shipment: "PSS20260009", customer: "Coastal Exports Ltd", reason: "Address issue",
    status: "Received at origin", courier: "Maersk Logistics", tracking: "ML-77120488", origin: "Mumbai", destination: "Kochi",
    ageing: "7 days", ageingDays: 7, pieces: 2, weight: "9 kg", value: "₹7,800", lastUpdated: "Aug 5, 02:45 PM",
    receiver: "Nikhil Rao · Origin dock", condition: "Received sealed", nextAction: "Review receipt and close after reconciliation",
    documents: { ...emptyDocuments(), mode: "dc", dcNumber: "DC-RTO-0029", dcValue: "7800", dcReason: "Address issue return" },
    events: [createEvent("Shipment marked for RTO", "Address could not be verified at destination", "Kochi", "2026-07-30", "08:45 AM", "warning"), createEvent("Documents verified", "Generated Delivery Challan attached", "PSS Operations", "2026-07-30", "09:10 AM", "success"), createEvent("Received at origin", "Origin team confirmed receipt", "Mumbai", "2026-08-05", "02:45 PM", "success")], notes: [],
  },
  {
    id: "RTO-2026-0024", shipment: "PSS20260015", customer: "Avacada Badara Clint", reason: "Incorrect address",
    status: "Closed", courier: "DTDC", tracking: "DTC-56110234", origin: "Delhi", destination: "Jaipur",
    ageing: "10 days", ageingDays: 10, pieces: 1, weight: "4 kg", value: "₹6,100", lastUpdated: "Aug 3, 11:20 AM",
    receiver: "Karan Singh · Origin desk", condition: "Received sealed", nextAction: "No action required",
    documents: { ...emptyDocuments(), mode: "invoice", invoiceName: "RTO-Invoice-PSS20260015.pdf" },
    events: [createEvent("Shipment marked for RTO", "Address rejected by destination facility", "Jaipur", "2026-07-28", "01:05 PM", "warning"), createEvent("Received at origin", "Origin team received the sealed shipment", "Delhi", "2026-08-01", "09:15 AM", "success"), createEvent("RTO closed", "Return reconciled against original shipment", "Delhi", "2026-08-03", "11:20 AM", "success")], notes: ["Reconciled with the original shipment manifest."],
  },
  {
    id: "RTO-2026-0044", shipment: "PSS20260045", customer: "Helix Components", reason: "Customer unavailable",
    status: "Documents pending", courier: "Delhivery", tracking: "DLV-88310477", origin: "Noida", destination: "Lucknow",
    ageing: "1 day", ageingDays: 1, pieces: 3, weight: "27 kg", value: "₹62,500", lastUpdated: "Today, 08:30 AM",
    receiver: "Asha Verma · Dispatch desk", condition: "Awaiting return", nextAction: "Generate DC and upload the required E-Way Bill",
    documents: { ...emptyDocuments(), mode: "dc", dcValue: "62500", ewayRequired: true },
    events: [createEvent("Shipment marked for RTO", "Delivery window expired without customer confirmation", "Lucknow", "2026-08-06", "08:30 AM", "warning"), createEvent("Documents requested", "Delivery Challan and E-Way Bill are pending", "PSS Operations", "2026-08-06", "08:31 AM", "primary")], notes: [],
  },
];

const normalize = (value: string) => value.trim().toLowerCase();
const matches = (rto: Rto, query: string) => !query || [rto.id, rto.shipment, rto.customer, rto.reason, rto.status, rto.courier, rto.tracking].some((value) => normalize(value).includes(normalize(query)));
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const downloadFile = (name: string, content: string, type: string) => { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500); };
const downloadDc = (rto: Rto, documents: DocumentPack) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(documents.dcNumber)}</title><style>body{font-family:Arial,sans-serif;color:#172033;margin:48px}header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:20px}h1{font-size:26px}section{margin-top:28px;border:1px solid #d7dee8;border-radius:12px;padding:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.label{font-size:11px;text-transform:uppercase;color:#64748b}.value{font-size:15px;font-weight:600;margin-top:5px}.note{margin-top:32px;color:#64748b;font-size:12px}</style></head><body><header><div><strong>PSS Logistics</strong><div>Return documentation</div></div><h1>DELIVERY CHALLAN</h1></header><section class="grid"><div><div class="label">Challan number</div><div class="value">${escapeHtml(documents.dcNumber)}</div></div><div><div class="label">Date</div><div class="value">${escapeHtml(documents.dcDate)}</div></div><div><div class="label">Original shipment</div><div class="value">${escapeHtml(rto.shipment)}</div></div><div><div class="label">RTO reference</div><div class="value">${escapeHtml(rto.id)}</div></div><div><div class="label">From</div><div class="value">${escapeHtml(rto.destination)}</div></div><div><div class="label">Return to origin</div><div class="value">${escapeHtml(rto.origin)}</div></div><div><div class="label">Customer</div><div class="value">${escapeHtml(rto.customer)}</div></div><div><div class="label">Shipment value</div><div class="value">₹${escapeHtml(documents.dcValue)}</div></div></section><section><div class="label">Reason for movement</div><div class="value">${escapeHtml(documents.dcReason)}</div></section><p class="note">This Delivery Challan was generated by PSS Logistics for return-to-origin movement and is not a tax invoice.</p></body></html>`;
  downloadFile(`${documents.dcNumber || "RTO-Delivery-Challan"}.html`, html, "text/html;charset=utf-8");
};

function Badge({ status }: { status: RtoStatus }) { return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusStyles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>; }
function DocumentBadge({ rto }: { rto: Rto }) { const ready = documentReady(rto.documents); return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold", ready ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{ready ? "Documents ready" : "Documents pending"}</span>; }
function Metric({ label, value, tone = "default", onClick, active }: { label: string; value: string; tone?: "default" | "warning" | "primary"; onClick?: () => void; active?: boolean }) { const style = tone === "warning" ? "text-amber-600" : tone === "primary" ? "text-primary" : "text-foreground"; return <button type="button" onClick={onClick} className={cn("flex h-10 min-w-[116px] flex-1 items-center justify-between gap-3 rounded-xl border bg-card px-3 text-left shadow-xs transition hover:border-primary/40", active ? "border-primary/40 bg-primary/5" : "border-border")}><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("shrink-0 text-sm font-bold", style)}>{value}</p></button>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium text-foreground">{value}</span></div>; }
function LocationCard({ label, city, icon }: { label: string; city: string; icon: React.ReactNode }) { return <div className="min-w-0 rounded-lg border border-border bg-background p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{icon}{label}</p><p className="mt-1 truncate text-sm font-semibold">{city}</p></div>; }
function MetricInfo({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p></div>; }
function TimelineItem({ event, last }: { event: TimelineEvent; last: boolean }) { const Icon = event.tone === "error" ? AlertTriangle : event.tone === "success" ? CheckCircle2 : event.tone === "warning" ? Clock3 : Truck; return <li className="relative flex gap-3 pb-5 last:pb-0"><div className="relative flex w-7 shrink-0 justify-center"><span className={cn("z-10 grid h-7 w-7 place-items-center rounded-full", toneStyles[event.tone])}><Icon className="h-3.5 w-3.5" /></span>{!last && <span className="absolute top-7 h-full w-px bg-border" />}</div><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><p className="text-sm font-medium">{event.title}</p><span className="shrink-0 text-[11px] text-muted-foreground">{event.date} · {event.time}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.description}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{event.location}</p></div></li>; }

export default function ReturnShipments() {
  const [rtos, setRtos] = useState(initialRtos);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialRtos[0].id);
  const [filters, setFilters] = useState({ status: "" as RtoStatus | "", reason: "", pending: false, ageing: false });
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const [activeKpi, setActiveKpi] = useState("");
  const [documentTarget, setDocumentTarget] = useState<Rto | null>(null);
  const [creatingRto, setCreatingRto] = useState(false);

  const filtered = useMemo(() => rtos.filter((rto) => matches(rto, query) && (!filters.status || rto.status === filters.status) && (!filters.reason || rto.reason === filters.reason) && (!filters.pending || !documentReady(rto.documents)) && (!filters.ageing || rto.ageingDays >= 3)), [rtos, query, filters]);
  const selected = rtos.find((rto) => rto.id === selectedId) || filtered[0] || rtos[0];
  const counts = {
    action: rtos.filter((rto) => rto.status === "Documents pending" || rto.status === "Received at origin").length,
    pending: rtos.filter((rto) => !documentReady(rto.documents)).length,
    ready: rtos.filter((rto) => rto.status === "Ready for return").length,
    transit: rtos.filter((rto) => rto.status === "In transit").length,
    ageing: rtos.filter((rto) => rto.ageingDays >= 3 && rto.status !== "Closed").length,
    received: rtos.filter((rto) => rto.status === "Received at origin").length,
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const resetFilters = () => { setFilters({ status: "", reason: "", pending: false, ageing: false }); setActiveKpi(""); };
  const applyKpi = (key: string, next: Partial<typeof filters>) => { if (activeKpi === key) return resetFilters(); setActiveKpi(key); setFilters({ status: "", reason: "", pending: false, ageing: false, ...next }); };
  const selectRto = (id: string) => { setSelectedId(id); setMobileDetail(true); setNotice(""); };
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); } catch { /* demo clipboard fallback */ } setCopied(label); window.setTimeout(() => setCopied(""), 1600); };
  const refresh = () => { setRefreshing(true); setNotice("RTO data refreshed from the demo feed."); window.setTimeout(() => setRefreshing(false), 700); };
  const addNote = () => { if (!note.trim()) return; setRtos((current) => current.map((rto) => rto.id === selected.id ? { ...rto, notes: [...rto.notes, note.trim()], lastUpdated: "Just now" } : rto)); setNote(""); setNotice("Internal note added."); };
  const saveDocuments = (target: Rto, documents: DocumentPack) => { const ready = documentReady(documents); setRtos((current) => current.map((rto) => rto.id === target.id ? { ...rto, documents, status: ready && rto.status === "Documents pending" ? "Ready for return" : rto.status, nextAction: ready ? "Documents complete · return movement is automatic" : rto.nextAction, lastUpdated: "Just now", events: ready && !documentReady(rto.documents) ? [...rto.events, createEvent("Documents verified", `${documents.mode === "invoice" ? "Updated invoice" : "Generated Delivery Challan"}${documents.ewayRequired ? " and E-Way Bill" : ""} validated`, "PSS Operations", new Date().toISOString().slice(0, 10), "Just now", "success")] : rto.events } : rto)); setDocumentTarget(null); setNotice(ready ? "Documents verified. Return movement will continue automatically." : "Document draft saved."); };
  const createRto = (draft: { shipment: string; customer: string; reason: string; origin: string; destination: string; value: string; documents: DocumentPack }) => { const sequence = 45 + rtos.length; const id = `RTO-2026-${String(sequence).padStart(4, "0")}`; const next: Rto = { id, shipment: draft.shipment, customer: draft.customer, reason: draft.reason, status: documentReady(draft.documents) ? "Ready for return" : "Documents pending", courier: "Assigned automatically", tracking: "Generated after document validation", origin: draft.origin, destination: draft.destination, ageing: "Just marked", ageingDays: 0, pieces: 1, weight: "Pending manifest", value: draft.value || "—", lastUpdated: "Just now", receiver: "Pending", condition: "Awaiting return", nextAction: documentReady(draft.documents) ? "Documents complete · return movement is automatic" : "Complete the required return documents", documents: draft.documents, events: [createEvent("Shipment marked for RTO", "Return-to-origin movement initiated", draft.destination, new Date().toISOString().slice(0, 10), "Just now", "warning"), ...(documentReady(draft.documents) ? [createEvent("Documents verified", "Return documents validated successfully", "PSS Operations", new Date().toISOString().slice(0, 10), "Just now", "success") as TimelineEvent] : [createEvent("Documents requested", "Updated Invoice or Delivery Challan is required", "PSS Operations", new Date().toISOString().slice(0, 10), "Just now", "primary") as TimelineEvent])], notes: [] }; setRtos((current) => [next, ...current]); setSelectedId(id); setCreatingRto(false); setMobileDetail(true); setNotice(`${id} created. ${documentReady(draft.documents) ? "Return movement is automatic." : "Documents are still required."}`); };
  const exportCsv = () => { const rows = filtered.map((rto) => [rto.id, rto.shipment, rto.customer, rto.reason, rto.status, documentReady(rto.documents) ? "Ready" : "Pending", rto.documents.mode === "invoice" ? rto.documents.invoiceName : rto.documents.dcNumber, rto.documents.ewayRequired ? rto.documents.ewayNumber : "Not required", rto.ageing].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")); downloadFile(`PSS-RTO-${new Date().toISOString().slice(0, 10)}.csv`, ["RTO,Shipment,Customer,Reason,Status,Documents,Invoice or DC,E-Way Bill,Ageing", ...rows].join("\n"), "text/csv;charset=utf-8"); setNotice(`CSV export ready with ${filtered.length} RTOs.`); };

  return <div className="w-full space-y-3">
    <div className="relative flex flex-wrap items-center gap-2">
      <Metric label="Needs action" value={String(counts.action)} tone="primary" active={activeKpi === "action"} onClick={() => applyKpi("action", { pending: true })} />
      <Metric label="Documents pending" value={String(counts.pending)} tone="warning" active={activeKpi === "pending"} onClick={() => applyKpi("pending", { pending: true })} />
      <Metric label="Ready for return" value={String(counts.ready)} tone="primary" active={activeKpi === "ready"} onClick={() => applyKpi("ready", { status: "Ready for return" })} />
      <Metric label="In transit" value={String(counts.transit)} tone="primary" active={activeKpi === "transit"} onClick={() => applyKpi("transit", { status: "In transit" })} />
      <Metric label="Ageing RTOs" value={String(counts.ageing)} tone="warning" active={activeKpi === "ageing"} onClick={() => applyKpi("ageing", { ageing: true })} />
      <Metric label="Received" value={String(counts.received)} active={activeKpi === "received"} onClick={() => applyKpi("received", { status: "Received at origin" })} />
      <button type="button" onClick={refresh} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:bg-accent"><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />Refresh</button>
      <button type="button" onClick={() => setFilterOpen((open) => !open)} className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-accent", activeFilterCount ? "border-primary/30 bg-primary/5 text-primary" : "border-input text-muted-foreground")}><Filter className="h-3.5 w-3.5" />Filters{activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeFilterCount}</span>}</button>
      <button type="button" onClick={() => setCreatingRto(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><FilePlus2 className="h-3.5 w-3.5" />Mark RTO</button>
      <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:bg-accent"><Download className="h-3.5 w-3.5" />Export</button>
      {filterOpen && <FilterPanel filters={filters} setFilters={setFilters} reset={resetFilters} close={() => setFilterOpen(false)} />}
    </div>
    {notice && <div role="status" className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><span>{notice}</span><button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X className="h-3.5 w-3.5" /></button></div>}
    <div className="grid min-h-0 grid-cols-1 gap-5 lg:h-[calc(100vh-10rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:flex lg:min-h-0 lg:flex-col", mobileDetail && "hidden lg:flex")}>
        <div className="border-b border-border px-3 py-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search RTOs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this RTO queue…" className="h-9 w-full rounded-lg border border-input bg-background px-3 pl-9 pr-8 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"><X className="h-3.5 w-3.5" /></button>}</div><p className="mt-2 text-[11px] text-muted-foreground">{filtered.length} matching RTOs · document priority</p></div>
        <div className="max-h-[55vh] divide-y divide-border/70 overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1">{filtered.length ? filtered.map((rto) => <button type="button" key={rto.id} onClick={() => selectRto(rto.id)} className={cn("w-full px-4 py-3.5 text-left transition hover:bg-accent/60", selected.id === rto.id && "bg-primary/5 ring-inset ring-1 ring-primary/10")}><div className="flex items-start justify-between gap-2"><span className="font-mono text-[11px] font-bold">{rto.id}</span><Badge status={rto.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{rto.customer} · {rto.destination} <ArrowRight className="mx-0.5 inline h-3 w-3" /> {rto.origin}</p><div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-[10px] text-muted-foreground">{rto.reason} · {rto.ageing}</span><DocumentBadge rto={rto} /></div></button>) : <div className="p-8 text-center text-sm text-muted-foreground"><Search className="mx-auto mb-2 h-5 w-5 opacity-50" />No RTOs match these filters.</div>}</div>
      </section>
      <section className={cn("space-y-4", !mobileDetail && "hidden lg:block", "lg:flex lg:min-h-0 lg:flex-col")}>
        <div className="flex shrink-0 items-center justify-between lg:hidden"><button type="button" onClick={() => setMobileDetail(false)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><ArrowLeft className="h-3.5 w-3.5" />All RTOs</button></div>
        <div className="shrink-0 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-lg font-bold">{selected.id}</h2><button type="button" aria-label="Copy RTO reference" onClick={() => copy(selected.id, "RTO reference copied")} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button><Badge status={selected.status} /><DocumentBadge rto={selected} /></div><p className="mt-1 text-sm text-muted-foreground">Original shipment <span className="font-mono font-semibold text-foreground">{selected.shipment}</span> · {selected.customer}</p><p className="mt-1 text-xs text-muted-foreground">Courier movement: <span className="font-medium text-foreground">automatic</span> · {selected.courier} · {selected.tracking}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Updated {selected.lastUpdated}</span></div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><LocationCard label="Destination" city={selected.destination} icon={<MapPin className="h-3.5 w-3.5" />} /><span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary"><ArrowLeft className="h-4 w-4" /></span><LocationCard label="Return to origin" city={selected.origin} icon={<Package className="h-3.5 w-3.5" />} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><MetricInfo label="RTO reason" value={selected.reason} /><MetricInfo label="Documents" value={documentReady(selected.documents) ? "Ready" : "Pending"} /><MetricInfo label="Ageing" value={selected.ageing} /><MetricInfo label="Shipment value" value={selected.value} /></div>
          <div className={cn("mt-4 rounded-lg border p-3", documentReady(selected.documents) ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5")}><p className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide", documentReady(selected.documents) ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}><Clock3 className="h-3.5 w-3.5" />Next recommended action</p><p className="mt-1 text-sm font-semibold">{selected.nextAction}</p></div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs"><div className="shrink-0 border-b border-border/70 px-4 py-4 sm:px-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-primary" />RTO timeline</h3><p className="mt-0.5 text-xs text-muted-foreground">Automatic movement and document events</p></div><ol className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-4 sm:px-5">{selected.events.map((event, index) => <TimelineItem key={`${event.date}-${event.time}-${event.title}`} event={event} last={index === selected.events.length - 1} />)}</ol></div>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" />Documentation</h3><span className="text-[10px] text-muted-foreground">Required to release RTO</span></div><div className="mt-3 space-y-2"><InfoRow label="Primary document" value={selected.documents.mode === "invoice" ? "Updated Invoice" : "Delivery Challan"} /><InfoRow label="Document reference" value={selected.documents.mode === "invoice" ? selected.documents.invoiceName || "Pending" : selected.documents.dcNumber || "Pending"} /><InfoRow label="E-Way Bill" value={selected.documents.ewayRequired ? selected.documents.ewayNumber || "Required · pending" : "Not required"} /></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setDocumentTarget(selected)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Upload className="h-3.5 w-3.5" />{documentReady(selected.documents) ? "Review documents" : "Complete documents"}</button>{selected.documents.mode === "dc" && selected.documents.dcNumber && <button type="button" onClick={() => downloadDc(selected, selected.documents)} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"><Download className="h-3.5 w-3.5" />Download DC</button>}</div></div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary" />Internal notes</h3><div className="mt-3 space-y-2">{selected.notes.length ? selected.notes.map((item) => <div key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{item}</div>) : <p className="text-xs text-muted-foreground">No internal notes recorded yet.</p>}<div className="flex gap-2"><input aria-label="Internal note" value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addNote(); }} placeholder="Add an operator note…" className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><button type="button" onClick={addNote} className="rounded-lg border border-input px-3 text-xs font-semibold hover:bg-accent">Add</button></div></div></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs lg:mt-auto"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{selected.pieces} pieces</span><span>·</span><span>{selected.weight}</span><span>·</span><span>Movement handled automatically</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setNotice(`Original shipment ${selected.shipment} opened in demo mode.`)} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"><Truck className="h-3.5 w-3.5" />Open shipment</button><button type="button" onClick={() => setDocumentTarget(selected)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><FileText className="h-3.5 w-3.5" />Documents</button><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold hover:bg-accent"><FileSpreadsheet className="h-3.5 w-3.5" />Export RTOs</button></div></div>
      </section>
    </div>
    {copied && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-lg dark:text-emerald-300"><Check className="mr-1 inline h-3.5 w-3.5" />{copied}</div>}
    {documentTarget && <DocumentDialog rto={documentTarget} close={() => setDocumentTarget(null)} save={(documents) => saveDocuments(documentTarget, documents)} />}
    {creatingRto && <CreateRtoDialog close={() => setCreatingRto(false)} create={createRto} />}
  </div>;
}

function FilterPanel({ filters, setFilters, reset, close }: { filters: { status: RtoStatus | ""; reason: string; pending: boolean; ageing: boolean }; setFilters: React.Dispatch<React.SetStateAction<{ status: RtoStatus | ""; reason: string; pending: boolean; ageing: boolean }>>; reset: () => void; close: () => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null); const panelRef = useRef<HTMLDivElement>(null); const update = (key: keyof typeof filters, value: string | boolean) => setFilters((current) => ({ ...current, [key]: value }));
  useEffect(() => { const outside = (event: PointerEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node)) close(); }; const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); }; document.addEventListener("pointerdown", outside); window.addEventListener("keydown", escape); return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape); }; }, [close]);
  const select = (key: "status" | "reason", label: string, value: string, options: string[]) => <Dropdown label={label} value={value} options={options} open={openKey === key} onOpenChange={(open) => setOpenKey(open ? key : null)} onChange={(next) => { update(key, next); setOpenKey(null); }} />;
  return <div ref={panelRef} className="absolute right-0 top-full z-50 mt-2 w-[min(100%,28rem)] space-y-3 rounded-xl border border-border bg-popover p-3 shadow-lg"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Filter RTOs</p><button type="button" aria-label="Close filters" onClick={close}><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div><div className="grid gap-2 sm:grid-cols-2">{select("status", "All statuses", filters.status, ["", ...statusList])}{select("reason", "All reasons", filters.reason, ["", ...reasonList])}</div><div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><label className="flex items-center gap-2"><input type="checkbox" checked={filters.pending} onChange={(event) => update("pending", event.target.checked)} className="accent-primary" />Documents pending</label><label className="flex items-center gap-2"><input type="checkbox" checked={filters.ageing} onChange={(event) => update("ageing", event.target.checked)} className="accent-primary" />Ageing 3+ days</label></div><div className="flex justify-between"><button type="button" onClick={reset} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Clear all</button><button type="button" onClick={close} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Apply filters</button></div></div>;
}

function DocumentFields({ documents, setDocuments, rto }: { documents: DocumentPack; setDocuments: React.Dispatch<React.SetStateAction<DocumentPack>>; rto: Pick<Rto, "id" | "shipment" | "customer" | "origin" | "destination"> }) {
  const update = <K extends keyof DocumentPack>(key: K, value: DocumentPack[K]) => setDocuments((current) => ({ ...current, [key]: value }));
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-1"><button type="button" onClick={() => update("mode", "invoice")} className={cn("rounded-md px-3 py-2 text-xs font-semibold", documents.mode === "invoice" ? "bg-background shadow-sm" : "text-muted-foreground")}>Upload updated invoice</button><button type="button" onClick={() => update("mode", "dc")} className={cn("rounded-md px-3 py-2 text-xs font-semibold", documents.mode === "dc" ? "bg-background shadow-sm" : "text-muted-foreground")}>Generate Delivery Challan</button></div>{documents.mode === "invoice" ? <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3"><span className="flex items-center gap-3"><Upload className="h-4 w-4 text-primary" /><span><span className="block text-sm font-medium">{documents.invoiceName || "Choose updated Invoice"}</span><span className="block text-xs text-muted-foreground">PDF, JPG or PNG</span></span></span><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => update("invoiceName", event.target.files?.[0]?.name || "")} /></label> : <div className="grid grid-cols-2 gap-3"><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Challan number" value={documents.dcNumber} onChange={(event) => update("dcNumber", event.target.value)} /><input type="date" className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" value={documents.dcDate} onChange={(event) => update("dcDate", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Shipment value (₹)" value={documents.dcValue} onChange={(event) => update("dcValue", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Reason for movement" value={documents.dcReason} onChange={(event) => update("dcReason", event.target.value)} /><div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">DC will be generated by PSS for {rto.shipment} · {rto.destination} → {rto.origin}.</div></div>}<label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"><span><span className="font-medium">E-Way Bill required</span><span className="mt-0.5 block text-xs text-muted-foreground">Enable only when required for this return movement.</span></span><input type="checkbox" checked={documents.ewayRequired} onChange={(event) => update("ewayRequired", event.target.checked)} className="h-4 w-4 accent-primary" /></label>{documents.ewayRequired && <div className="grid gap-3 sm:grid-cols-2"><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="E-Way Bill number" value={documents.ewayNumber} onChange={(event) => update("ewayNumber", event.target.value)} /><label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:bg-accent"><Upload className="h-3.5 w-3.5 text-primary" />{documents.ewayName || "Upload E-Way Bill"}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => update("ewayName", event.target.files?.[0]?.name || "")} /></label></div>}</div>;
}

function DocumentDialog({ rto, close, save }: { rto: Rto; close: () => void; save: (documents: DocumentPack) => void }) {
  const [documents, setDocuments] = useState(rto.documents); const ready = documentReady(documents);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="documents-title" className="w-full max-w-xl rounded-2xl border border-border bg-popover p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><h2 id="documents-title" className="text-base font-semibold">RTO documentation</h2><p className="mt-1 text-xs text-muted-foreground">{rto.id} · {rto.shipment}</p></div><button type="button" aria-label="Close documentation" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button></div><div className="max-h-[65vh] overflow-y-auto pr-1"><DocumentFields documents={documents} setDocuments={setDocuments} rto={rto} /></div><div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4"><span className={cn("text-xs font-semibold", ready ? "text-emerald-600" : "text-amber-600")}>{ready ? "All required documents are ready" : "Complete the required document fields"}</span><div className="flex gap-2">{documents.mode === "dc" && documents.dcNumber && <button type="button" onClick={() => downloadDc(rto, documents)} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent"><Download className="h-3.5 w-3.5" />Download DC</button>}<button type="button" disabled={!ready} onClick={() => save(documents)} className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">Verify documents</button></div></div></div></div>;
}

function CreateRtoDialog({ close, create }: { close: () => void; create: (draft: { shipment: string; customer: string; reason: string; origin: string; destination: string; value: string; documents: DocumentPack }) => void }) {
  const [draft, setDraft] = useState({ shipment: "", customer: "", reason: "", origin: "", destination: "", value: "" }); const [documents, setDocuments] = useState(emptyDocuments()); const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value })); const baseReady = Boolean(draft.shipment && draft.customer && draft.reason && draft.origin && draft.destination);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="create-rto-title" className="w-full max-w-2xl rounded-2xl border border-border bg-popover p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><h2 id="create-rto-title" className="text-base font-semibold">Mark shipment for RTO</h2><p className="mt-1 text-xs text-muted-foreground">Return movement is automatic after required documents are verified.</p></div><button type="button" aria-label="Close" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button></div><div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1"><div className="grid gap-3 sm:grid-cols-2"><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Original shipment reference" value={draft.shipment} onChange={(event) => update("shipment", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Customer / consignee" value={draft.customer} onChange={(event) => update("customer", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="RTO reason" value={draft.reason} onChange={(event) => update("reason", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Shipment value" value={draft.value} onChange={(event) => update("value", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Return from / destination" value={draft.destination} onChange={(event) => update("destination", event.target.value)} /><input className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary" placeholder="Return to origin" value={draft.origin} onChange={(event) => update("origin", event.target.value)} /></div><DocumentFields documents={documents} setDocuments={setDocuments} rto={{ id: "New RTO", shipment: draft.shipment || "Shipment", customer: draft.customer, origin: draft.origin || "Origin", destination: draft.destination || "Destination" }} /></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><p className="text-xs text-muted-foreground">Invoice or DC is mandatory. E-Way Bill is conditional.</p><button type="button" disabled={!baseReady || !documentReady(documents)} onClick={() => create({ ...draft, documents })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-3.5 w-3.5" />Mark as RTO</button></div></div></div>;
}

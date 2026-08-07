"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/dropdown";

type PickupStatus = "Scheduled" | "Driver Assigned" | "En Route" | "Completed" | "Failed" | "Cancelled";
type SortKey = "reference" | "customer" | "status" | "date" | "location" | "driver" | "pieces" | "weight";

type Pickup = {
  id: string;
  reference: string;
  customer: string;
  status: PickupStatus;
  date: string;
  window: string;
  location: string;
  country: string;
  driver: string;
  pieces: number;
  weight: string;
  contact: string;
  address: string;
  notes: string;
  createdFrom: "Shipment booking" | "Standalone request";
};

type NewPickup = {
  customer: string;
  contact: string;
  address: string;
  city: string;
  country: string;
  date: string;
  window: string;
  pieces: string;
  weight: string;
  notes: string;
};

const initialPickups: Pickup[] = [
  { id: "1", reference: "PKU20260011", customer: "Brightline Distributors", status: "Cancelled", date: "Aug 5", window: "8:30 PM – 10:30 PM", location: "New York", country: "United States", driver: "Not assigned", pieces: 44, weight: "851 kg", contact: "+1 (133) 681-9354", address: "227 Madison Avenue", notes: "Customer cancelled after the booking window changed.", createdFrom: "Shipment booking" },
  { id: "2", reference: "PKU20260013", customer: "Brightline Distributors", status: "En Route", date: "Aug 5", window: "8:30 PM – 10:30 PM", location: "Singapore", country: "Singapore", driver: "Elena Petrov", pieces: 25, weight: "659 kg", contact: "+1 (841) 316-6066", address: "18 Robinson Road", notes: "Driver is heading to the loading dock.", createdFrom: "Shipment booking" },
  { id: "3", reference: "PKU20260016", customer: "Summit Retail Group", status: "Scheduled", date: "Aug 6", window: "1:30 PM – 3:30 PM", location: "Los Angeles", country: "United States", driver: "Not assigned", pieces: 6, weight: "816 kg", contact: "+1 (295) 374-3844", address: "540 South Spring Street", notes: "Call the receiving desk on arrival.", createdFrom: "Shipment booking" },
  { id: "4", reference: "PKU20260009", customer: "Atlas Manufacturing", status: "Scheduled", date: "Aug 6", window: "2:30 PM – 4:30 PM", location: "Rotterdam", country: "Netherlands", driver: "Not assigned", pieces: 30, weight: "1.15 t", contact: "+1 (771) 851-1207", address: "Waalhaven Zuidzijde 19", notes: "Pallet pickup; loading bay 3.", createdFrom: "Shipment booking" },
  { id: "5", reference: "PKU20260015", customer: "Meridian Traders", status: "Driver Assigned", date: "Aug 6", window: "5:30 PM – 7:30 PM", location: "Toronto", country: "Canada", driver: "Maria Santos", pieces: 7, weight: "176 kg", contact: "+1 (796) 354-6344", address: "120 Front Street East", notes: "Fragile cartons, keep upright.", createdFrom: "Shipment booking" },
  { id: "6", reference: "PKU20260007", customer: "Atlas Manufacturing", status: "Failed", date: "Aug 7", window: "2:30 PM – 4:30 PM", location: "Frankfurt", country: "Germany", driver: "Elena Petrov", pieces: 32, weight: "562 kg", contact: "+1 (213) 497-2677", address: "Cargo City Süd, Building 539", notes: "Pickup failed because the cargo was not ready.", createdFrom: "Shipment booking" },
  { id: "7", reference: "PKU20260008", customer: "Meridian Traders", status: "Scheduled", date: "Aug 7", window: "2:30 PM – 4:30 PM", location: "Sydney", country: "Australia", driver: "Not assigned", pieces: 4, weight: "1.09 t", contact: "+1 (862) 446-3102", address: "44 Market Street", notes: "Warehouse access code is available in the customer profile.", createdFrom: "Shipment booking" },
  { id: "8", reference: "PKU20260004", customer: "Summit Retail Group", status: "Completed", date: "Aug 7", window: "3:30 PM – 5:30 PM", location: "Frankfurt", country: "Germany", driver: "Omar Hassan", pieces: 40, weight: "1.15 t", contact: "+1 (297) 552-6498", address: "Kaiserstrasse 14", notes: "Signed proof of pickup received.", createdFrom: "Shipment booking" },
  { id: "9", reference: "PKU20260003", customer: "Brightline Distributors", status: "En Route", date: "Aug 7", window: "4:30 PM – 6:30 PM", location: "Hamburg", country: "Germany", driver: "David Liu", pieces: 42, weight: "591 kg", contact: "+1 (626) 693-8942", address: "Am Sandtorkai 50", notes: "Driver has confirmed the pickup location.", createdFrom: "Shipment booking" },
  { id: "10", reference: "PKU20260005", customer: "Coastal Exports Ltd", status: "Cancelled", date: "Aug 7", window: "5:30 PM – 7:30 PM", location: "Shanghai", country: "China", driver: "Not assigned", pieces: 50, weight: "114 kg", contact: "+1 (222) 866-5663", address: "88 Pudong Avenue", notes: "Pickup cancelled by customer.", createdFrom: "Shipment booking" },
];

const emptyForm: NewPickup = { customer: "", contact: "", address: "", city: "", country: "", date: "2026-08-08", window: "9:00 AM – 11:00 AM", pieces: "1", weight: "", notes: "" };

const statusStyles: Record<PickupStatus, string> = {
  Scheduled: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Driver Assigned": "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "En Route": "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Failed: "border-destructive/20 bg-destructive/10 text-destructive",
  Cancelled: "border-border bg-muted text-muted-foreground",
};

const columns: { key: SortKey; label: string }[] = [
  { key: "reference", label: "Reference" }, { key: "customer", label: "Customer" }, { key: "status", label: "Status" },
  { key: "date", label: "Window" }, { key: "location", label: "Location" }, { key: "driver", label: "Driver" },
  { key: "pieces", label: "Pieces" }, { key: "weight", label: "Weight" },
];

export default function PickupRequests() {
  const [pickups, setPickups] = useState<Pickup[]>(initialPickups);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PickupStatus | "">("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "asc" });
  const [visibleColumns, setVisibleColumns] = useState<SortKey[]>(columns.map((column) => column.key));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<NewPickup>(emptyForm);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setStatusOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [statusOpen]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = pickups.filter((pickup) => {
      const matchesQuery = !normalized || [pickup.reference, pickup.customer, pickup.location, pickup.country, pickup.driver, pickup.contact].some((value) => value.toLowerCase().includes(normalized));
      return matchesQuery && (!statusFilter || pickup.status === statusFilter);
    });
    return result.sort((a, b) => {
      const first = String(a[sort.key]);
      const second = String(b[sort.key]);
      const comparison = sort.key === "pieces" ? a.pieces - b.pieces : first.localeCompare(second);
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [pickups, query, sort, statusFilter]);

  const metrics = useMemo(() => ({
    today: pickups.filter((pickup) => pickup.date === "Aug 7" && pickup.status !== "Cancelled").length,
    scheduled: pickups.filter((pickup) => pickup.status === "Scheduled" || pickup.status === "Driver Assigned").length,
    completed: pickups.filter((pickup) => pickup.status === "Completed").length,
    failed: pickups.filter((pickup) => pickup.status === "Failed").length,
  }), [pickups]);

  const updateForm = (key: keyof NewPickup, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const toggleSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });

  const toggleSelected = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((pickup) => selectedIds.includes(pickup.id));
  const toggleAllVisible = () => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !filtered.some((pickup) => pickup.id === id)) : Array.from(new Set([...current, ...filtered.map((pickup) => pickup.id)])));

  const toggleColumn = (key: SortKey) => setVisibleColumns((current) => current.includes(key) ? (current.length === 1 ? current : current.filter((item) => item !== key)) : [...current, key]);

  const exportCsv = () => {
    const exportRows = selectedIds.length ? filtered.filter((pickup) => selectedIds.includes(pickup.id)) : filtered;
    const headers = ["Reference", "Customer", "Status", "Date", "Pickup window", "Location", "Driver", "Pieces", "Weight", "Contact", "Created from"];
    const values = exportRows.map((pickup) => [pickup.reference, pickup.customer, pickup.status, pickup.date, pickup.window, `${pickup.location}, ${pickup.country}`, pickup.driver, pickup.pieces, pickup.weight, pickup.contact, pickup.createdFrom]);
    const csv = [headers, ...values].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pickup-requests.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${exportRows.length} pickup${exportRows.length === 1 ? "" : "s"} exported.`);
  };

  const schedulePickup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = String(pickups.length + 1);
    const pickup: Pickup = {
      id,
      reference: `PKU2026${String(pickups.length + 17).padStart(4, "0")}`,
      customer: form.customer.trim(),
      status: "Scheduled",
      date: new Date(`${form.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      window: form.window,
      location: form.city.trim(),
      country: form.country.trim(),
      driver: "Not assigned",
      pieces: Number(form.pieces),
      weight: `${form.weight.trim()} kg`,
      contact: form.contact.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || "Standalone pickup request created without an existing shipment.",
      createdFrom: "Standalone request",
    };
    setPickups((current) => [pickup, ...current]);
    setForm(emptyForm);
    setScheduleOpen(false);
    setSelectedPickup(pickup);
    setNotice(`${pickup.reference} scheduled successfully.`);
  };

  return (
    <div className="w-full space-y-4 pb-10">
      <div className="flex flex-wrap items-stretch gap-2">
        <MetricCard label="Today's Pickups" value={metrics.today} change="5.2%" positive icon={<Truck className="h-4 w-4" />} />
        <MetricCard label="Scheduled" value={metrics.scheduled} change="3.1%" positive icon={<Clock3 className="h-4 w-4" />} />
        <MetricCard label="Completed (7d)" value={metrics.completed} change="12.4%" positive icon={<Check className="h-4 w-4" />} />
        <MetricCard label="Failed (7d)" value={metrics.failed} change="1.8%" icon={<FileText className="h-4 w-4" />} />
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button type="button" onClick={() => setCalendarOpen((current) => !current)} className={cn(buttonSecondary, "flex-1 sm:flex-none")}><CalendarDays className="h-4 w-4" /> Calendar View</button>
          <button type="button" onClick={() => setScheduleOpen(true)} className={cn(buttonPrimary, "flex-1 sm:flex-none")}><Plus className="h-4 w-4" /> Schedule Pickup</button>
        </div>
      </div>

      {calendarOpen && <CalendarPanel pickups={pickups} close={() => setCalendarOpen(false)} />}

      <div className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search pickup requests" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by reference, customer, or city…" className={cn(inputClass, "w-full pl-9 pr-3")} /></div>
          <div className="flex flex-wrap gap-2">
            <Dropdown label="All statuses" value={statusFilter} options={Object.keys(statusStyles)} open={statusOpen} onOpenChange={setStatusOpen} onChange={(value) => setStatusFilter(value as PickupStatus | "")} className="min-w-36" />
            <div className="relative"><button type="button" onClick={() => setColumnsOpen((current) => !current)} className={buttonSecondary}><SlidersHorizontal className="h-3.5 w-3.5" /> Columns</button>{columnsOpen && <ColumnPanel visibleColumns={visibleColumns} toggleColumn={toggleColumn} close={() => setColumnsOpen(false)} />}</div>
            <button type="button" onClick={exportCsv} className={buttonSecondary}><Download className="h-3.5 w-3.5" /> Export</button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-muted-foreground"><span>{filtered.length} of {pickups.length} pickup requests</span><span>{selectedIds.length} selected</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground"><tr className="border-y border-border/70"><th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all visible pickup requests" checked={allVisibleSelected} onChange={toggleAllVisible} className="accent-primary" /></th>{columns.filter((column) => visibleColumns.includes(column.key)).map((column) => <th key={column.key} className="px-3 py-3 font-semibold"><button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-foreground">{column.label}{sort.key === column.key ? sort.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <span className="text-muted-foreground/50">↕</span>}</button></th>)}<th className="px-3 py-3 font-semibold">Contact</th></tr></thead>
            <tbody className="divide-y divide-border/70">{filtered.map((pickup) => <PickupRow key={pickup.id} pickup={pickup} visibleColumns={visibleColumns} selected={selectedIds.includes(pickup.id)} toggleSelected={() => toggleSelected(pickup.id)} open={() => setSelectedPickup(pickup)} />)}</tbody>
          </table>
          {!filtered.length && <div className="px-5 py-14 text-center text-sm text-muted-foreground"><Package className="mx-auto mb-2 h-6 w-6 opacity-50" />No pickup requests match these filters.</div>}
        </div>
      </div>

      {notice && <div role="status" className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><X className="h-3.5 w-3.5" /></button></div>}
      {selectedPickup && <PickupDetail pickup={selectedPickup} close={() => setSelectedPickup(null)} />}
      {scheduleOpen && <ScheduleModal form={form} updateForm={updateForm} submit={schedulePickup} close={() => { setScheduleOpen(false); setForm(emptyForm); }} />}
    </div>
  );
}

const inputClass = "h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";
const buttonSecondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-accent";
const buttonPrimary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90";

function MetricCard({ label, value, change, positive, icon }: { label: string; value: number; change: string; positive?: boolean; icon: React.ReactNode }) {
  return <div className="flex h-9 min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 shadow-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span><p className="min-w-0 truncate text-[11px] font-semibold text-muted-foreground">{label}</p><p className="text-base font-bold leading-none tracking-tight tabular-nums">{value}</p><p className={cn("ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-medium", positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{change}</p></div>;
}

function PickupRow({ pickup, visibleColumns, selected, toggleSelected, open }: { pickup: Pickup; visibleColumns: SortKey[]; selected: boolean; toggleSelected: () => void; open: () => void }) {
  return <tr className={cn("group transition hover:bg-accent/40", selected && "bg-primary/5")}><td className="px-4 py-4 align-top"><input type="checkbox" aria-label={`Select ${pickup.reference}`} checked={selected} onChange={toggleSelected} className="accent-primary" /></td>{visibleColumns.includes("reference") && <td className="px-3 py-4 align-top"><button type="button" onClick={open} className="font-mono text-[11px] font-bold text-foreground hover:text-primary">{pickup.reference}</button><p className="mt-1 text-[10px] text-muted-foreground">{pickup.createdFrom}</p></td>}{visibleColumns.includes("customer") && <td className="max-w-[170px] px-3 py-4 align-top font-medium text-foreground">{pickup.customer}</td>}{visibleColumns.includes("status") && <td className="px-3 py-4 align-top"><StatusBadge status={pickup.status} /></td>}{visibleColumns.includes("date") && <td className="whitespace-nowrap px-3 py-4 align-top"><p className="font-medium text-foreground">{pickup.date}</p><p className="mt-1 text-[11px] text-muted-foreground">{pickup.window}</p></td>}{visibleColumns.includes("location") && <td className="max-w-[170px] px-3 py-4 align-top"><p className="flex items-start gap-1.5 text-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{pickup.location}, {pickup.country}</p></td>}{visibleColumns.includes("driver") && <td className="px-3 py-4 align-top"><p className="flex items-start gap-1.5 text-foreground"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{pickup.driver}</p></td>}{visibleColumns.includes("pieces") && <td className="px-3 py-4 align-top font-medium tabular-nums">{pickup.pieces}</td>}{visibleColumns.includes("weight") && <td className="px-3 py-4 align-top font-medium tabular-nums">{pickup.weight}</td>}<td className="px-3 py-4 align-top"><button type="button" onClick={open} className="text-left text-muted-foreground hover:text-primary">{pickup.contact}</button></td></tr>;
}

function StatusBadge({ status }: { status: PickupStatus }) { return <span className={cn("inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold", statusStyles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>; }

function StatusOption({ label, value, selected, select }: { label: string; value: PickupStatus | ""; selected: boolean; select: () => void }) {
  return <button type="button" role="option" aria-selected={selected} onClick={select} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition", selected ? "bg-primary/10 font-semibold text-primary" : "hover:bg-accent")}><span className="flex items-center gap-2">{value && <span className={cn("h-1.5 w-1.5 rounded-full", statusStyles[value].split(" ").find((token) => token.startsWith("bg-")) || "bg-muted-foreground")} />}{label}</span>{selected && <Check className="h-3.5 w-3.5" />}</button>;
}

function ColumnPanel({ visibleColumns, toggleColumn, close }: { visibleColumns: SortKey[]; toggleColumn: (key: SortKey) => void; close: () => void }) {
  return <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"><div className="mb-2 flex items-center justify-between border-b border-border pb-2"><p className="text-xs font-semibold">Visible columns</p><button type="button" onClick={close} aria-label="Close column controls"><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div><div className="space-y-1">{columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="accent-primary" />{column.label}</label>)}</div></div>;
}

function CalendarPanel({ pickups, close }: { pickups: Pickup[]; close: () => void }) {
  const grouped = pickups.reduce<Record<string, Pickup[]>>((groups, pickup) => { groups[pickup.date] = [...(groups[pickup.date] || []), pickup]; return groups; }, {});
  return <section className="rounded-xl border border-border bg-card p-4 shadow-xs"><div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Pickup calendar</h2><p className="mt-1 text-xs text-muted-foreground">Upcoming pickup windows grouped by day.</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close calendar"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(grouped).slice(0, 8).map(([date, items]) => <div key={date} className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-semibold">{date}</p><div className="mt-2 space-y-2">{items.slice(0, 3).map((pickup) => <button type="button" key={pickup.id} onClick={close} className="block w-full text-left"><p className="truncate text-[11px] font-medium">{pickup.window}</p><p className="truncate text-[10px] text-muted-foreground">{pickup.location} · {pickup.status}</p></button>)}</div></div>)}</div></section>;
}

function PickupDetail({ pickup, close }: { pickup: Pickup; close: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="pickup-detail-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-border/70 pb-4"><div><div className="flex flex-wrap items-center gap-2"><h2 id="pickup-detail-title" className="font-mono text-lg font-bold tracking-tight">{pickup.reference}</h2><StatusBadge status={pickup.status} /></div><p className="mt-1 text-xs text-muted-foreground">{pickup.createdFrom} · pickup request details</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close pickup details"><X className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-2"><Detail label="Customer" value={pickup.customer} /><Detail label="Contact" value={pickup.contact} /><Detail label="Pickup date" value={`${pickup.date} · ${pickup.window}`} /><Detail label="Driver" value={pickup.driver} /><Detail label="Pieces" value={String(pickup.pieces)} /><Detail label="Weight" value={pickup.weight} /></div><div className="mt-3 rounded-lg border border-border bg-background p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Pickup location</p><p className="mt-1 text-sm font-semibold">{pickup.location}, {pickup.country}</p><p className="mt-0.5 text-xs text-muted-foreground">{pickup.address}</p></div><div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">Pickup notes</p><p className="mt-1">{pickup.notes}</p></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className={buttonSecondary}>Close</button><button type="button" onClick={() => { navigator.clipboard?.writeText(pickup.reference); close(); }} className={buttonPrimary}><Check className="h-3.5 w-3.5" /> Copy reference</button></div></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-semibold" title={value}>{value}</p></div>; }

function ScheduleModal({ form, updateForm, submit, close }: { form: NewPickup; updateForm: (key: keyof NewPickup, value: string) => void; submit: (event: React.FormEvent<HTMLFormElement>) => void; close: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="schedule-pickup-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><h2 id="schedule-pickup-title" className="text-base font-semibold">Schedule a pickup</h2></div><p className="text-xs text-muted-foreground">Create a pickup request directly from a location, even when no shipment has been booked.</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close schedule pickup dialog"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="mt-5 space-y-5"><div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Pickup location</h3></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Customer or business name" value={form.customer} onChange={(value) => updateForm("customer", value)} placeholder="e.g. Northstar Supplies" required /><Field label="Contact phone" value={form.contact} onChange={(value) => updateForm("contact", value)} placeholder="+91 98765 43210" required /><Field label="Address" value={form.address} onChange={(value) => updateForm("address", value)} placeholder="Building, street, or warehouse" required className="sm:col-span-2" /><Field label="City" value={form.city} onChange={(value) => updateForm("city", value)} placeholder="Mumbai" required /><Field label="Country" value={form.country} onChange={(value) => updateForm("country", value)} placeholder="India" required /></div></div><div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600"><CalendarDays className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Pickup window</h3></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Pickup date" type="date" value={form.date} onChange={(value) => updateForm("date", value)} required /><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Preferred time window<select value={form.window} onChange={(event) => updateForm("window", event.target.value)} className={cn(inputClass, "w-full")}><option>9:00 AM – 11:00 AM</option><option>11:30 AM – 1:30 PM</option><option>2:00 PM – 4:00 PM</option><option>4:30 PM – 6:30 PM</option><option>6:30 PM – 8:30 PM</option></select></label></div></div><div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600"><Package className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Package details</h3></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Pieces" type="number" min="1" value={form.pieces} onChange={(value) => updateForm("pieces", value)} required /><Field label="Total weight (kg)" type="number" min="0.1" step="0.1" value={form.weight} onChange={(value) => updateForm("weight", value)} placeholder="e.g. 25" required /><Field label="Notes (optional)" value={form.notes} onChange={(value) => updateForm("notes", value)} placeholder="Loading instructions, access notes…" className="sm:col-span-2" /></div></div><div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />This request is independent of shipment booking and can be assigned to a driver later.</p><div className="flex justify-end gap-2"><button type="button" onClick={close} className={buttonSecondary}>Cancel</button><button type="submit" className={buttonPrimary}><Check className="h-3.5 w-3.5" /> Schedule pickup</button></div></div></form></div></div>;
}

function Field({ label, value, onChange, placeholder, required, type = "text", min, step, className }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; min?: string; step?: string; className?: string }) { return <label className={cn("grid gap-1.5 text-xs font-medium text-muted-foreground", className)}>{label}<input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cn(inputClass, "w-full")} /></label>; }

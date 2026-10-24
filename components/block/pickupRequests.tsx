"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Clock3,
  Download,
  FileText,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Dropdown from "@/components/ui/dropdown";
import { getPssErrorDetails, pssApi, subscribePssDataSync } from "@/lib/pss-api";
import { SkeletonTable } from "@/components/ui/skeleton";
import WarehousePicker from "@/components/ui/warehouse-picker";

type PickupStatus = "Draft" | "Requested" | "Provider Pending" | "Scheduled" | "Rescheduled" | "Not Picked" | "Driver Assigned" | "Out for Pickup" | "Picked Up" | "Completed" | "Failed" | "Cancelled";
type NoticeTone = "info" | "success" | "pending" | "error";
type SortKey = "reference" | "customer" | "status" | "date" | "location" | "driver" | "pieces" | "weight" | "createdAt";
type PickupSlotOption = { date: string; slots: string[]; reason?: string };
type ScheduleConfirmation = { providerReference: string; date: string; window: string; status: PickupStatus; providerStatus: string };

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
  contactEmail: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  provider: string;
  providerAccountId: string;
  warehouseId: string;
  providerReference: string;
  providerStatus: string;
  providerPickedCount: number | null;
  providerExpectedCount: number | null;
  providerStatusSyncedAt: string;
  providerStatusDetail: string;
  providerErrorCode: string;
  failureReason: string;
  notes: string;
  createdFrom: "Shipment booking" | "Standalone request";
  shipmentCount: number;
  createdAt: string;
};

type PickupCandidate = { id: string; pss_reference?: string | null; order_id?: string | null; tracking_number?: string | null; lr_number?: string | null; provider_reference?: string | null; awb?: string | null; origin?: string | null; total_weight_kg?: number | null; pieces?: number | null };

type NewPickup = {
  customer: string;
  contact: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  provider: string;
  providerAccountId: string;
  warehouseId: string;
  date: string;
  window: string;
  pieces: string;
  weight: string;
  awbNumber: string;
  notes: string;
};

const initialPickups: Pickup[] = [];

const todayIso = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const current = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${current.year}-${current.month}-${current.day}`;
};
type ProviderAccount = { id: string; provider: string; account_name: string; enabled?: boolean; status?: string };
type SavedWarehouse = { id: string; source?: "warehouse" | "address"; name?: string; label?: string; address_kind?: string; address?: string; city?: string; state?: string; pincode?: string; contact_name?: string; phone?: string; contact?: string; provider_account_id?: string };

function savedWarehouseIdentity(row: SavedWarehouse) {
  return [row.provider_account_id, row.address, row.city, row.state, row.pincode, row.contact, row.contact_name].map((value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}

function dedupeSavedWarehouses(rows: SavedWarehouse[]) {
  const seen = new Set<string>();
  return rows.filter((row) => { const key = savedWarehouseIdentity(row); if (seen.has(key)) return false; seen.add(key); return true; });
}

const emptyForm: NewPickup = { customer: "", contact: "", email: "", address: "", city: "", state: "", pincode: "", country: "India", provider: "", providerAccountId: "", warehouseId: "", date: todayIso(), window: "", pieces: "1", weight: "", awbNumber: "", notes: "" };

const statusStyles: Record<PickupStatus, string> = {
  Scheduled: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Rescheduled: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Not Picked": "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "Driver Assigned": "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "Out for Pickup": "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Failed: "border-destructive/20 bg-destructive/10 text-destructive",
  Cancelled: "border-border bg-muted text-muted-foreground",
  Draft: "border-border bg-muted text-muted-foreground",
  Requested: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Provider Pending": "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Picked Up": "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const columns: { key: SortKey; label: string }[] = [
  { key: "reference", label: "Reference" }, { key: "customer", label: "Customer" }, { key: "status", label: "Status" },
  { key: "date", label: "Window" }, { key: "location", label: "Location" },
  { key: "pieces", label: "Pieces" }, { key: "weight", label: "Weight" },
];

function normalizePickupStatus(value: unknown): PickupStatus {
  const normalized = String(value ?? "requested").trim().toLowerCase();
  const labels: Record<string, PickupStatus> = { draft: "Draft", requested: "Requested", provider_pending: "Provider Pending", scheduled: "Scheduled", rescheduled: "Rescheduled", not_picked: "Not Picked", assigned: "Driver Assigned", driver_assigned: "Driver Assigned", in_transit: "Out for Pickup", en_route: "Out for Pickup", picked_up: "Picked Up", completed: "Completed", failed: "Failed", cancelled: "Cancelled" };
  return labels[normalized] ?? "Requested";
}

export default function PickupRequests() {
  const [pickups, setPickups] = useState<Pickup[]>(initialPickups);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PickupStatus | "">("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "createdAt", direction: "desc" });
  const [visibleColumns, setVisibleColumns] = useState<SortKey[]>(columns.map((column) => column.key));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Pickup | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleConfirmation, setScheduleConfirmation] = useState<ScheduleConfirmation | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [configurationError, setConfigurationError] = useState("");
  const [configurationRetry, setConfigurationRetry] = useState(0);
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");
  const [form, setForm] = useState<NewPickup>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [providerAccounts, setProviderAccounts] = useState<ProviderAccount[]>([]);
  const [warehouses, setWarehouses] = useState<SavedWarehouse[]>([]);
  const [prefillLocationId, setPrefillLocationId] = useState("");
  const [pickupSlotOptions, setPickupSlotOptions] = useState<PickupSlotOption[]>([]);
  const [rescheduleSlotOptions, setRescheduleSlotOptions] = useState<PickupSlotOption[]>([]);
  const [pickupSlotError, setPickupSlotError] = useState("");
  const [pickupCandidates, setPickupCandidates] = useState<PickupCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [rescheduleSlotError, setRescheduleSlotError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const pickupsCountRef = useRef(0);
  useEffect(() => { pickupsCountRef.current = pickups.length; }, [pickups.length]);
  const updateForm = (key: keyof NewPickup, value: string) => { if (["provider", "providerAccountId", "pincode", "warehouseId"].includes(key)) { setPickupSlotOptions([]); setPickupSlotError(""); } setForm((current) => ({ ...current, [key]: value })); };
  const notify = (message: string, tone: NoticeTone = "info") => { setNotice(message); setNoticeTone(tone); };

  const loadPickups = useCallback(async (showNotice = false) => {
    setRefreshing(true);
    setLoadError("");
    try {
      const result = await pssApi<{ data?: Array<Record<string, unknown>> }>("/v1/pickups");
      setPickups((result.data ?? []).map((row) => {
        const address = String(row.pickup_address ?? "").trim();
        const date = String(row.requested_date ?? "").slice(0, 10);
        const rawProviderReference = String(row.provider_reference ?? "").trim();
        const provider = String(row.provider ?? "").trim().toLowerCase();
        const providerReference = rawProviderReference && /^\d+$/.test(rawProviderReference) ? rawProviderReference : "";
        return { id: String(row.id), reference: providerReference || "Not scheduled", customer: String(row.contact_name ?? "Not provided"), status: normalizePickupStatus(row.status), date: date || "Not provided", window: String(row.requested_time_slot ?? "Not provided"), location: address || "Not provided", country: String(row.country ?? "India"), driver: String(row.assigned_to_user_id ?? "Unassigned"), pieces: Math.max(1, Number(row.pieces ?? 1)), weight: row.total_weight_kg ? `${row.total_weight_kg} kg` : "Not provided", contact: String(row.contact_phone ?? "Not provided"), contactEmail: String(row.contact_email ?? ""), address, city: String(row.city ?? ""), state: String(row.state ?? ""), pincode: String(row.pincode ?? ""), provider, providerAccountId: String(row.provider_account_id ?? ""), warehouseId: String(row.warehouse_id ?? ""), providerReference, providerStatus: String(row.provider_status ?? ""), providerPickedCount: row.provider_picked_count == null ? null : Math.max(0, Number(row.provider_picked_count)), providerExpectedCount: row.provider_expected_count == null ? null : Math.max(0, Number(row.provider_expected_count)), providerStatusSyncedAt: String(row.provider_status_synced_at ?? ""), providerStatusDetail: String(row.provider_status_detail ?? ""), providerErrorCode: String(row.provider_error_code ?? ""), failureReason: String(row.failure_reason ?? ""), notes: String(row.notes ?? ""), createdFrom: row.shipment_id ? "Shipment booking" : "Standalone request", shipmentCount: Math.max(0, Number(row.shipment_count ?? (row.shipment_id ? 1 : 0))), createdAt: String(row.created_at ?? "") };
      }));
      setLoadError("");
      notify(showNotice ? "Pickup statuses refreshed from production." : "");
    } catch (error) { const message = getPssErrorDetails(error, "Pickup data is temporarily unavailable. Your existing requests are unchanged.").message; setLoadError(message); notify(pickupsCountRef.current ? `Showing last successful pickup data. Refresh failed: ${message}` : message, "error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => loadPickups()); }, [loadPickups]);

  useEffect(() => {
    const interval = window.setInterval(() => { void loadPickups(); }, 30000);
    return () => window.clearInterval(interval);
  }, [loadPickups]);
  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void loadPickups(); };
    const unsubscribe = subscribePssDataSync(refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { unsubscribe(); window.removeEventListener("focus", refreshWhenVisible); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [loadPickups]);

  useEffect(() => {
    if (!scheduleOpen || !form.providerAccountId || !/^\d{6}$/.test(form.pincode)) return;
    const query = new URLSearchParams({ provider: form.provider || "delhivery", provider_account_id: form.providerAccountId, pincode: form.pincode, ...(form.warehouseId ? { warehouse_id: form.warehouseId } : {}) });
    void pssApi<{ data?: { dates?: PickupSlotOption[] } }>(`/v1/pickup-slots?${query.toString()}`).then((result) => {
      const dates = result.data?.dates ?? [];
      setPickupSlotOptions(dates);
      setForm((current) => {
        const currentDate = dates.find((option) => option.date === current.date);
        if (currentDate && currentDate.slots.includes(current.window)) return current;
        const first = dates[0];
        return first ? { ...current, date: first.date, window: first.slots[0] ?? "" } : current;
      });
    }).catch((error) => { const details = getPssErrorDetails(error, "Pickup availability could not be loaded."); setPickupSlotError(details.message); notify(details.message, "error"); });
  }, [scheduleOpen, form.provider, form.providerAccountId, form.pincode, form.warehouseId]);

  useEffect(() => {
    if (!scheduleOpen || !form.provider || !form.providerAccountId) return;
    const query = new URLSearchParams({ provider: form.provider, provider_account_id: form.providerAccountId, ...(form.pincode ? { pincode: form.pincode } : {}) });
    setCandidateLoading(true); setCandidateError("");
    void pssApi<{ data?: PickupCandidate[] }>(`/v1/pickup-candidates?${query.toString()}`).then((result) => { setPickupCandidates(result.data ?? []); setSelectedCandidateIds([]); }).catch((error) => { const details = getPssErrorDetails(error, "Manifested shipments could not be loaded."); setCandidateError(details.message); }).finally(() => setCandidateLoading(false));
  }, [scheduleOpen, form.provider, form.providerAccountId, form.pincode]);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      pssApi<{ data?: ProviderAccount[] }>("/v1/provider-account-policies"),
      pssApi<{ data?: SavedWarehouse[] }>("/v1/warehouses"),
      pssApi<{ data?: SavedWarehouse[] }>("/v1/addresses"),
    ]).then(([accountsResult, warehouseResult, addressResult]) => {
      if (cancelled) return;
      const failures: string[] = [];
      if (accountsResult.status === "fulfilled") {
        setProviderAccounts((accountsResult.value.data ?? []).filter((account) => account.enabled !== false && account.status !== "inactive"));
      } else {
        failures.push(`courier accounts: ${getPssErrorDetails(accountsResult.reason, "temporarily unavailable").message}`);
      }
      const warehouses = warehouseResult.status === "fulfilled" ? (warehouseResult.value.data ?? []).map((warehouse) => ({ ...warehouse, source: "warehouse" as const })) : [];
      if (warehouseResult.status === "rejected") failures.push(`warehouses: ${getPssErrorDetails(warehouseResult.reason, "temporarily unavailable").message}`);
      const addresses = addressResult.status === "fulfilled" ? (addressResult.value.data ?? []) : [];
      if (addressResult.status === "rejected") failures.push(`saved pickup locations: ${getPssErrorDetails(addressResult.reason, "temporarily unavailable").message}`);
      const savedAddresses = addresses.filter((address) => address.address_kind !== "consignee").map((address) => ({ ...address, source: "address" as const, name: address.label ?? address.contact_name ?? address.id }));
      setWarehouses([...dedupeSavedWarehouses(warehouses), ...savedAddresses]);
      setConfigurationError(failures.join("; "));
      if (failures.length) notify(`Some pickup configuration could not be loaded — ${failures.join("; ")}`, "error");
    });
    return () => { cancelled = true; };
  }, [configurationRetry]);

  useEffect(() => {
    const locationId = new URLSearchParams(window.location.search).get("pickup_location_id") ?? "";
    if (locationId) setPrefillLocationId(locationId);
  }, []);

  useEffect(() => {
    if (!prefillLocationId || !warehouses.length || scheduleOpen) return;
    const location = warehouses.find((warehouse) => warehouse.id === prefillLocationId);
    if (!location) return;
    setForm((current) => ({
      ...current,
      warehouseId: location.source === "warehouse" ? location.id : "",
      customer: location.contact_name ?? location.name ?? current.customer,
      contact: location.phone ?? location.contact ?? current.contact,
      address: location.address ?? current.address,
      city: location.city ?? current.city,
      state: location.state ?? current.state,
      pincode: location.pincode ?? current.pincode,
    }));
    setPrefillLocationId("");
    setScheduleOpen(true);
    window.history.replaceState({}, "", "/dashboard/pickupRequests");
  }, [prefillLocationId, warehouses, scheduleOpen]);

  useEffect(() => {
    if (!rescheduleTarget?.providerAccountId || !/^\d{6}$/.test(rescheduleTarget.pincode)) return;
    const query = new URLSearchParams({ provider: rescheduleTarget.provider || "delhivery", provider_account_id: rescheduleTarget.providerAccountId, pincode: rescheduleTarget.pincode, ...(rescheduleTarget.warehouseId ? { warehouse_id: rescheduleTarget.warehouseId } : {}) });
    void pssApi<{ data?: { dates?: PickupSlotOption[] } }>(`/v1/pickup-slots?${query.toString()}`).then((result) => setRescheduleSlotOptions(result.data?.dates ?? [])).catch((error) => { const details = getPssErrorDetails(error, "Reschedule availability could not be loaded."); setRescheduleSlotError(details.message); notify(details.message, "error"); });
  }, [rescheduleTarget]);

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
      const comparison = sort.key === "pieces" ? a.pieces - b.pieces : sort.key === "createdAt" ? (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0) : first.localeCompare(second);
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [pickups, query, sort, statusFilter]);

  const metrics = useMemo(() => ({
    today: pickups.filter((pickup) => pickup.date === todayIso() && pickup.status !== "Cancelled").length,
    scheduled: pickups.filter((pickup) => pickup.status === "Scheduled" || pickup.status === "Driver Assigned" || pickup.status === "Out for Pickup").length,
    completed: pickups.filter((pickup) => pickup.status === "Completed").length,
    failed: pickups.filter((pickup) => pickup.status === "Failed").length,
  }), [pickups]);

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
    notify(`${exportRows.length} pickup${exportRows.length === 1 ? "" : "s"} exported.`, "success");
  };

  const schedulePickup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (scheduleSubmitting) return;
    if (!pickupSlotOptions.some((option) => option.date === form.date && option.slots.includes(form.window))) {
      notify("Select a pickup date and time window returned by Delhivery before scheduling.", "error");
      return;
    }
    setScheduleSubmitting(true);
    setScheduleError("");
    try {
      const availabilityQuery = new URLSearchParams({ provider: form.provider || "delhivery", provider_account_id: form.providerAccountId, pincode: form.pincode, ...(form.warehouseId ? { warehouse_id: form.warehouseId } : {}) });
      const latestAvailability = await pssApi<{ data?: { dates?: PickupSlotOption[] } }>(`/v1/pickup-slots?${availabilityQuery.toString()}`);
      const latestSlots = latestAvailability.data?.dates ?? [];
      setPickupSlotOptions(latestSlots);
      if (!latestSlots.some((option) => option.date === form.date && option.slots.includes(form.window))) {
        notify("That pickup window is no longer available. Select the latest provider window and try again.", "error");
        return;
      }
      const location = `${form.address}, ${form.city}, ${form.state}, ${form.pincode}, ${form.country}`;
      const selectedCandidates = pickupCandidates.filter((candidate) => selectedCandidateIds.includes(candidate.id));
      const manifested = selectedCandidates.length > 0;
      const result = await pssApi<{ data: { id: string; status?: string; provider_status?: string; provider_reference?: string | null; requested_date?: string; requested_time_slot?: string } }>("/v1/pickups", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ requested_date: form.date, requested_time_slot: form.window, pickup_address: location, contact_name: form.customer, contact_phone: form.contact, contact_email: form.email || undefined, city: form.city, state: form.state, pincode: form.pincode, country: form.country, provider: form.provider, provider_account_id: form.providerAccountId, warehouse_id: form.warehouseId || undefined, selection_mode: manifested ? "manifested" : "blind", shipment_ids: manifested ? selectedCandidateIds : undefined, awb_number: manifested ? undefined : form.awbNumber.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean), pieces: manifested ? undefined : Number(form.pieces), total_weight_kg: manifested ? undefined : Number(form.weight), notes: form.notes }) });
      const pieces = manifested ? selectedCandidates.reduce((sum, item) => sum + Math.max(1, Number(item.pieces ?? 1)), 0) : Number(form.pieces) || 1;
      const weight = manifested ? selectedCandidates.reduce((sum, item) => sum + Math.max(0, Number(item.total_weight_kg ?? 0)), 0) : Number(form.weight);
      const providerReference = String(result.data.provider_reference ?? "").trim();
      const displayReference = providerReference || "Not scheduled";
      const created: Pickup = { id: result.data.id, reference: displayReference, customer: form.customer, status: normalizePickupStatus(result.data.status || "scheduled"), date: form.date, window: form.window, location, country: form.country, driver: "Unassigned", pieces, weight: `${weight} kg`, contact: form.contact, contactEmail: form.email, address: form.address, city: form.city, state: form.state, pincode: form.pincode, provider: form.provider, providerAccountId: form.providerAccountId, warehouseId: form.warehouseId, providerReference, providerStatus: String(result.data.provider_status ?? "pending"), providerPickedCount: null, providerExpectedCount: null, providerStatusSyncedAt: "", providerStatusDetail: "", providerErrorCode: "", failureReason: "", notes: form.notes, createdFrom: manifested ? "Shipment booking" : "Standalone request", shipmentCount: manifested ? selectedCandidates.length : 0, createdAt: new Date().toISOString() };
      setPickups((current) => [created, ...current]);
      notify(`Pickup ${displayReference} was saved to production.`, created.status === "Provider Pending" ? "pending" : "success");
      setScheduleOpen(false);
      setForm({ ...emptyForm, date: todayIso() });
      setScheduleConfirmation({ providerReference: providerReference || "Not yet returned by provider", date: result.data.requested_date || form.date, window: result.data.requested_time_slot || form.window, status: created.status, providerStatus: String(result.data.provider_status ?? "pending") });
    } catch (error) {
      const details = getPssErrorDetails(error, "Pickup request failed. The request was not confirmed.");
      const message = `${details.message}${details.requestId ? ` · Request ID ${details.requestId}` : ""}`;
      setScheduleError(message);
      notify(message, "error");
    } finally {
      setScheduleSubmitting(false);
    }
  };
  const cancelPickup = async (pickup: Pickup) => { try { await pssApi(`/v1/pickups/${encodeURIComponent(pickup.id)}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ status: "cancelled" }) }); setPickups((current) => current.map((item) => item.id === pickup.id ? { ...item, status: "Cancelled" } : item)); setSelectedPickup((current) => current?.id === pickup.id ? { ...current, status: "Cancelled" } : current); notify(`Pickup ${pickup.reference} was cancelled in production.`, "success"); } catch (error) { const details = getPssErrorDetails(error, "Unable to cancel pickup."); notify(`${details.message}${details.requestId ? ` · Request ID ${details.requestId}` : ""}`, "error"); } };
  const retryPickup = async (pickup: Pickup) => { try { const result = await pssApi<{ data?: { status?: string; requested_date?: string; requested_time_slot?: string; provider_status?: string } }>(`/v1/pickups/${encodeURIComponent(pickup.id)}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ retry: true }) }); const next = { status: normalizePickupStatus(result.data?.status ?? "scheduled"), date: result.data?.requested_date ?? pickup.date, window: result.data?.requested_time_slot ?? pickup.window, failureReason: "", providerErrorCode: "", providerStatus: String(result.data?.provider_status ?? "accepted") }; setPickups((current) => current.map((item) => item.id === pickup.id ? { ...item, ...next } : item)); setSelectedPickup((current) => current?.id === pickup.id ? { ...current, ...next } : current); notify(`Pickup ${pickup.reference} was resubmitted to ${pickup.provider}.`, next.status === "Provider Pending" ? "pending" : "success"); } catch (error) { const details = getPssErrorDetails(error, "Unable to retry pickup."); notify(`${details.message}${details.requestId ? ` · Request ID ${details.requestId}` : ""}`, "error"); } };
  const reschedulePickup = async (pickup: Pickup, date: string, window: string) => { try { const result = await pssApi<{ data?: { status?: string; requested_date?: string; requested_time_slot?: string; provider_status?: string } }>(`/v1/pickups/${encodeURIComponent(pickup.id)}`, { method: "PATCH", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ requested_date: date, requested_time_slot: window }) }); const next = { status: normalizePickupStatus(result.data?.status ?? "scheduled"), date: result.data?.requested_date ?? date, window: result.data?.requested_time_slot ?? window, failureReason: "", providerErrorCode: "", providerStatus: String(result.data?.provider_status ?? "accepted") }; setPickups((current) => current.map((item) => item.id === pickup.id ? { ...item, ...next } : item)); setSelectedPickup((current) => current?.id === pickup.id ? { ...current, ...next } : current); setRescheduleTarget(null); notify(`Pickup ${pickup.reference} was rescheduled with ${pickup.provider}.`, next.status === "Provider Pending" ? "pending" : "success"); } catch (error) { const details = getPssErrorDetails(error, "Unable to reschedule pickup."); notify(`${details.message}${details.requestId ? ` · Request ID ${details.requestId}` : ""}`, "error"); } };

  return (
    <div className="w-full space-y-4 pb-10">
      <div className="flex flex-wrap items-stretch gap-2">
        <MetricCard label="Today's Pickups" value={metrics.today} icon={<Truck className="h-4 w-4" />} />
        <MetricCard label="Scheduled" value={metrics.scheduled} icon={<Clock3 className="h-4 w-4" />} />
        <MetricCard label="Completed (7d)" value={metrics.completed} icon={<Check className="h-4 w-4" />} />
        <MetricCard label="Failed (7d)" value={metrics.failed} icon={<FileText className="h-4 w-4" />} />
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          <button type="button" onClick={() => setCalendarOpen((current) => !current)} className={cn(buttonSecondary, "flex-1 sm:flex-none")}><CalendarDays className="h-4 w-4" /> Calendar View</button>
          <button type="button" onClick={() => { setPickupSlotOptions([]); setScheduleError(""); setScheduleOpen(true); }} className={cn(buttonPrimary, "flex-1 sm:flex-none")}><Plus className="h-4 w-4" /> Schedule Pickup</button>
        </div>
      </div>

      {calendarOpen && <CalendarPanel pickups={pickups} close={() => setCalendarOpen(false)} />}

      <div className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search pickup requests" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by reference, customer, or city…" className={cn(inputClass, "w-full pl-9 pr-3")} /></div>
          <div className="flex flex-wrap gap-2">
            <Dropdown label="All statuses" value={statusFilter} options={Object.keys(statusStyles)} open={statusOpen} onOpenChange={setStatusOpen} onChange={(value) => setStatusFilter(value as PickupStatus | "")} className="min-w-36" />
            <div className="relative"><button type="button" onClick={() => setColumnsOpen((current) => !current)} className={buttonSecondary}><SlidersHorizontal className="h-3.5 w-3.5" /> Columns</button>{columnsOpen && <ColumnPanel visibleColumns={visibleColumns} toggleColumn={toggleColumn} close={() => setColumnsOpen(false)} />}</div>
            <button type="button" onClick={() => void loadPickups(true)} disabled={refreshing} className={buttonSecondary}><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh</button><button type="button" onClick={exportCsv} className={buttonSecondary}><Download className="h-3.5 w-3.5" /> Export</button>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-[11px] text-muted-foreground"><span>{filtered.length} of {pickups.length} pickup requests</span><span>{selectedIds.length} selected</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground"><tr className="border-y border-border/70"><th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all visible pickup requests" checked={allVisibleSelected} onChange={toggleAllVisible} className="accent-primary" /></th>{columns.filter((column) => visibleColumns.includes(column.key)).map((column) => <th key={column.key} className="px-3 py-3 font-semibold"><button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-foreground">{column.label}{sort.key === column.key ? sort.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <span className="text-muted-foreground/50">↕</span>}</button></th>)}<th className="px-3 py-3 font-semibold">Contact</th></tr></thead>
            <tbody className="divide-y divide-border/70">{filtered.map((pickup) => <PickupRow key={pickup.id} pickup={pickup} visibleColumns={visibleColumns} selected={selectedIds.includes(pickup.id)} toggleSelected={() => toggleSelected(pickup.id)} open={() => setSelectedPickup(pickup)} />)}</tbody>
          </table>
          {!filtered.length && <div className="px-5 py-14 text-center text-sm text-muted-foreground">{loading ? <div className="mx-auto max-w-4xl text-left" role="status" aria-label="Loading production pickup requests" aria-busy="true"><SkeletonTable rows={6} columns={8} /></div> : <><Package className="mx-auto mb-2 h-6 w-6 opacity-50" />{loadError ? <><p>Pickup data is unavailable.</p><button type="button" onClick={() => void loadPickups(true)} disabled={refreshing} className="mt-3 rounded-lg border border-input px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">{refreshing ? "Retrying…" : "Retry pickup data"}</button></> : "No pickup requests match these filters."}</>}</div>}
        </div>
      </div>

      {notice && <div role={noticeTone === "error" ? "alert" : "status"} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-xs", noticeTone === "success" && "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300", noticeTone === "pending" && "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300", noticeTone === "error" && "border-destructive/20 bg-destructive/5 text-destructive", noticeTone === "info" && "border-primary/20 bg-primary/5 text-primary")}><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notice"><X className="h-3.5 w-3.5" /></button></div>}
      {selectedPickup && <PickupDetail pickup={selectedPickup} close={() => setSelectedPickup(null)} cancel={() => void cancelPickup(selectedPickup)} retry={() => void retryPickup(selectedPickup)} reschedule={() => { setRescheduleSlotOptions([]); setRescheduleSlotError(""); setRescheduleTarget(selectedPickup); }} />}
      {rescheduleTarget && <RescheduleModal pickup={rescheduleTarget} slotOptions={rescheduleSlotOptions} slotError={rescheduleSlotError} submit={(date, window) => void reschedulePickup(rescheduleTarget, date, window)} close={() => { setRescheduleSlotOptions([]); setRescheduleSlotError(""); setRescheduleTarget(null); }} />}
      {scheduleOpen && <ScheduleModal form={form} updateForm={updateForm} providerAccounts={providerAccounts} warehouses={warehouses} slotOptions={pickupSlotOptions} slotError={pickupSlotError} scheduleError={scheduleError} submitting={scheduleSubmitting} configurationError={configurationError} retryConfiguration={() => setConfigurationRetry((value) => value + 1)} candidates={pickupCandidates} selectedCandidateIds={selectedCandidateIds} candidateLoading={candidateLoading} candidateError={candidateError} toggleCandidate={(id) => setSelectedCandidateIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} selectWarehouse={(warehouse) => { setPickupSlotOptions([]); setPickupSlotError(""); setForm((current) => ({ ...current, warehouseId: warehouse.source === "warehouse" ? warehouse.id : "", customer: warehouse.contact_name ?? warehouse.name ?? current.customer, contact: warehouse.phone ?? warehouse.contact ?? current.contact, address: warehouse.address ?? current.address, city: warehouse.city ?? current.city, state: warehouse.state ?? current.state, pincode: warehouse.pincode ?? current.pincode })); }} submit={schedulePickup} close={() => { if (!scheduleSubmitting) { setPickupSlotOptions([]); setPickupSlotError(""); setPickupCandidates([]); setSelectedCandidateIds([]); setScheduleOpen(false); setForm(emptyForm); } }} />}
      {scheduleConfirmation && <PickupConfirmationModal confirmation={scheduleConfirmation} close={() => setScheduleConfirmation(null)} />}
    </div>
  );
}

const inputClass = "h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10";
const buttonSecondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-accent";
const buttonPrimary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90";

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="flex h-9 min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 shadow-xs"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span><p className="min-w-0 truncate text-[11px] font-semibold text-muted-foreground">{label}</p><p className="ml-auto text-base font-bold leading-none tracking-tight tabular-nums">{value}</p></div>;
}

function PickupRow({ pickup, visibleColumns, selected, toggleSelected, open }: { pickup: Pickup; visibleColumns: SortKey[]; selected: boolean; toggleSelected: () => void; open: () => void }) {
  const providerCount = pickup.providerPickedCount != null && pickup.providerExpectedCount != null && pickup.providerExpectedCount > 0 ? `${pickup.providerPickedCount}/${pickup.providerExpectedCount} LRNs picked` : "";
  return <tr className={cn("group transition hover:bg-accent/40", selected && "bg-primary/5")}><td className="px-4 py-4 align-top"><input type="checkbox" aria-label={`Select ${pickup.reference}`} checked={selected} onChange={toggleSelected} className="accent-primary" /></td>{visibleColumns.includes("reference") && <td className="px-3 py-4 align-top"><button type="button" onClick={open} className={cn("font-mono text-[11px] hover:text-primary", pickup.reference === "Not scheduled" ? "font-normal italic text-muted-foreground" : "font-bold text-foreground")}>{pickup.reference}</button><p className="mt-1 text-[10px] text-muted-foreground">{pickup.createdFrom}</p></td>}{visibleColumns.includes("customer") && <td className="max-w-[170px] px-3 py-4 align-top font-medium text-foreground">{pickup.customer}</td>}{visibleColumns.includes("status") && <td className="px-3 py-4 align-top"><StatusBadge status={pickup.status} />{providerCount && <p className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">{providerCount}</p>}</td>}{visibleColumns.includes("date") && <td className="whitespace-nowrap px-3 py-4 align-top"><p className="font-medium text-foreground">{pickup.date}</p><p className="mt-1 text-[11px] text-muted-foreground">{pickup.window}</p></td>}{visibleColumns.includes("location") && <td className="max-w-[170px] px-3 py-4 align-top"><p className="flex items-start gap-1.5 text-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{pickup.location}, {pickup.country}</p></td>}{visibleColumns.includes("driver") && <td className="px-3 py-4 align-top"><p className="flex items-start gap-1.5 text-foreground"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{pickup.driver}</p></td>}{visibleColumns.includes("pieces") && <td className="px-3 py-4 align-top font-medium tabular-nums">{pickup.pieces}</td>}{visibleColumns.includes("weight") && <td className="px-3 py-4 align-top font-medium tabular-nums">{pickup.weight}</td>}<td className="px-3 py-4 align-top"><button type="button" onClick={open} className="text-left text-muted-foreground hover:text-primary">{pickup.contact}</button></td></tr>;
}

function StatusBadge({ status }: { status: PickupStatus }) { return <span className={cn("inline-flex whitespace-nowrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold", statusStyles[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>; }

function ColumnPanel({ visibleColumns, toggleColumn, close }: { visibleColumns: SortKey[]; toggleColumn: (key: SortKey) => void; close: () => void }) {
  return <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"><div className="mb-2 flex items-center justify-between border-b border-border pb-2"><p className="text-xs font-semibold">Visible columns</p><button type="button" onClick={close} aria-label="Close column controls"><X className="h-3.5 w-3.5 text-muted-foreground" /></button></div><div className="space-y-1">{columns.map((column) => <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent"><input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="accent-primary" />{column.label}</label>)}</div></div>;
}

function CalendarPanel({ pickups, close }: { pickups: Pickup[]; close: () => void }) {
  const grouped = pickups.reduce<Record<string, Pickup[]>>((groups, pickup) => { groups[pickup.date] = [...(groups[pickup.date] || []), pickup]; return groups; }, {});
  return <section className="rounded-xl border border-border bg-card p-4 shadow-xs"><div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Pickup calendar</h2><p className="mt-1 text-xs text-muted-foreground">Upcoming pickup windows grouped by day.</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close calendar"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(grouped).slice(0, 8).map(([date, items]) => <div key={date} className="rounded-lg border border-border bg-background p-3"><p className="text-xs font-semibold">{date}</p><div className="mt-2 space-y-2">{items.slice(0, 3).map((pickup) => <button type="button" key={pickup.id} onClick={close} className="block w-full text-left"><p className="truncate text-[11px] font-medium">{pickup.window}</p><p className="truncate text-[10px] text-muted-foreground">{pickup.location} · {pickup.status}</p></button>)}</div></div>)}</div></section>;
}

function PickupDetail({ pickup, close, cancel, retry, reschedule }: { pickup: Pickup; close: () => void; cancel: () => void; retry: () => void; reschedule: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="pickup-detail-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-border/70 pb-4"><div><div className="flex flex-wrap items-center gap-2"><h2 id="pickup-detail-title" className={cn("font-mono text-lg tracking-tight", pickup.reference === "Not scheduled" ? "font-normal italic text-muted-foreground" : "font-bold")}>{pickup.reference}</h2><StatusBadge status={pickup.status} /></div><p className="mt-1 text-xs text-muted-foreground">{pickup.createdFrom} · pickup request details</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close pickup details"><X className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-2"><Detail label="Customer" value={pickup.customer} /><Detail label="Contact" value={pickup.contact} /><Detail label="Courier" value={pickup.provider} /><Detail label="Provider account" value={pickup.providerAccountId || "Not reported"} /><Detail label="Provider reference" value={pickup.providerReference || "Not scheduled"} /><Detail label="Pickup date" value={`${pickup.date} · ${pickup.window}`} /><Detail label="Driver" value={pickup.driver} /><Detail label="Pieces" value={String(pickup.pieces)} /><Detail label="Weight" value={pickup.weight} /></div><div className="mt-3 rounded-lg border border-border bg-background p-3"><p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Pickup location</p><p className="mt-1 text-sm font-semibold">{pickup.location}, {pickup.country}</p><p className="mt-0.5 text-xs text-muted-foreground">{pickup.address}{pickup.city ? ` · ${pickup.city}` : ""}{pickup.state ? ` · ${pickup.state}` : ""}{pickup.pincode ? ` · ${pickup.pincode}` : ""}</p></div><div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs leading-5 text-muted-foreground"><p className="font-semibold text-foreground">Provider state</p><p className="mt-1">{pickup.providerStatus || "Not reported"}{pickup.providerErrorCode ? ` · ${pickup.providerErrorCode}` : ""}{pickup.failureReason ? ` · ${pickup.failureReason}` : ""}</p><p className="mt-2 font-semibold text-foreground">Pickup notes</p><p className="mt-1">{pickup.notes || "No notes"}</p></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={close} className={buttonSecondary}>Close</button>{pickup.status === "Failed" && <button type="button" onClick={retry} className={buttonSecondary}>Retry pickup</button>}{!['Cancelled', 'Completed'].includes(pickup.status) && <button type="button" onClick={reschedule} className={buttonSecondary}>Reschedule</button>}{!['Cancelled', 'Completed', 'Failed'].includes(pickup.status) && <button type="button" onClick={cancel} className={buttonSecondary}>Cancel pickup</button>}{pickup.providerReference && <button type="button" onClick={() => { navigator.clipboard?.writeText(pickup.providerReference); close(); }} className={buttonPrimary}><Check className="h-3.5 w-3.5" /> Copy reference</button>}</div></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-lg border border-border bg-background p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-semibold" title={value}>{value}</p></div>; }

function RescheduleModal({ pickup, slotOptions, slotError, submit, close }: { pickup: Pickup; slotOptions: PickupSlotOption[]; slotError: string; submit: (date: string, window: string) => void; close: () => void }) {
  const dates = slotOptions.map((option) => option.date);
  const [date, setDate] = useState(pickup.date !== "Not provided" ? pickup.date : dates[0] ?? todayIso());
  const effectiveDate = dates.includes(date) ? date : dates[0] ?? date;
  const slots = slotOptions.find((option) => option.date === effectiveDate)?.slots ?? slotOptions.flatMap((option) => option.slots);
  const [window, setWindow] = useState(pickup.window !== "Not provided" ? pickup.window : slots[0] ?? "");
  const effectiveWindow = slots.includes(window) ? window : slots[0] ?? "";
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="reschedule-pickup-title" className="w-full max-w-md rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}><h2 id="reschedule-pickup-title" className="text-base font-semibold">Reschedule pickup</h2><p className="mt-1 text-xs text-muted-foreground">{dates.length ? "Choose a provider-returned date and window." : slotError || "Delhivery has not returned a reschedule slot for this pickup yet. Refresh after the provider publishes availability."} The pickup remains unchanged until the provider accepts this request.</p>{!dates.length ? <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">Manual dates and windows are disabled so the panel cannot submit an unverified pickup request.</p> : <div className="mt-4 grid gap-3"><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Pickup date<select required value={effectiveDate} onChange={(event) => { setDate(event.target.value); setWindow(""); }} className={cn(inputClass, "w-full")}>{dates.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Pickup window<select required value={effectiveWindow} onChange={(event) => setWindow(event.target.value)} className={cn(inputClass, "w-full")}><option value="">Select a provider window</option>{Array.from(new Set(slots)).map((option) => <option key={option}>{option}</option>)}</select></label></div>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} className={buttonSecondary}>Cancel</button><button type="button" disabled={!dates.length || !effectiveDate || !effectiveWindow} onClick={() => submit(effectiveDate, effectiveWindow)} className={cn(buttonPrimary, (!dates.length || !effectiveDate || !effectiveWindow) && "cursor-not-allowed opacity-50")}>Request reschedule</button></div></div></div>;
}

function ScheduleModal({ form, updateForm, providerAccounts, warehouses, slotOptions, slotError, scheduleError, submitting, configurationError, retryConfiguration, candidates, selectedCandidateIds, candidateLoading, candidateError, toggleCandidate, selectWarehouse, submit, close }: { form: NewPickup; updateForm: (key: keyof NewPickup, value: string) => void; providerAccounts: ProviderAccount[]; warehouses: SavedWarehouse[]; slotOptions: PickupSlotOption[]; slotError: string; scheduleError: string; submitting: boolean; configurationError: string; candidates: PickupCandidate[]; selectedCandidateIds: string[]; candidateLoading: boolean; candidateError: string; toggleCandidate: (id: string) => void; retryConfiguration: () => void; selectWarehouse: (warehouse: SavedWarehouse) => void; submit: (event: React.FormEvent<HTMLFormElement>) => void; close: () => void }) {
  const dateOption = slotOptions.find((option) => option.date === form.date);
  const availableSlots = dateOption?.slots ?? [];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={close}>
    <div role="dialog" aria-modal="true" aria-labelledby="schedule-pickup-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between"><div><div className="mb-1 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><h2 id="schedule-pickup-title" className="text-base font-semibold">Schedule a pickup</h2></div><p className="text-xs text-muted-foreground">Choose the courier and pickup location first. Dates and windows are provider-confirmed.</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close schedule pickup dialog"><X className="h-4 w-4" /></button></div>
      <form onSubmit={submit} className="mt-5 space-y-5">{scheduleError && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"><p className="font-semibold">Pickup scheduling failed</p><p className="mt-1 leading-5">{scheduleError}</p></div>}{configurationError && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"><p className="font-semibold">Pickup configuration is unavailable</p><p className="mt-1 leading-5">{configurationError}</p><div className="mt-2 flex items-center justify-between gap-2"><span>Scheduling is paused until configuration loads.</span><button type="button" onClick={retryConfiguration} className="rounded-md border border-destructive/30 px-2 py-1 font-semibold hover:bg-destructive/10">Retry configuration</button></div></div>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Courier account<select required aria-label="Courier account" value={form.providerAccountId} onChange={(event) => { const account = providerAccounts.find((item) => item.id === event.target.value); updateForm("providerAccountId", event.target.value); updateForm("provider", account?.provider ?? ""); }} className={cn(inputClass, "w-full")}><option value="">Select active courier account</option>{providerAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_name} · {account.provider}</option>)}</select></label><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Saved pickup location<WarehousePicker warehouses={warehouses} value={form.warehouseId} inputClassName={inputClass} onSelect={selectWarehouse} onClear={() => updateForm("warehouseId", "")} /></label></div>
        <div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Pickup location</h3></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Customer or business name" value={form.customer} onChange={(value) => updateForm("customer", value)} placeholder="e.g. Northstar Supplies" required /><Field label="Contact phone" value={form.contact} onChange={(value) => updateForm("contact", value)} placeholder="+91 98765 43210" required /><Field label="Contact email" type="email" value={form.email} onChange={(value) => updateForm("email", value)} placeholder="ops@example.com" className="sm:col-span-2" /><Field label="Address" value={form.address} onChange={(value) => updateForm("address", value)} placeholder="Building, street, or warehouse" required className="sm:col-span-2" /><Field label="City" value={form.city} onChange={(value) => updateForm("city", value)} placeholder="Mumbai" required /><Field label="State" value={form.state} onChange={(value) => updateForm("state", value)} placeholder="Maharashtra" required /><Field label="PIN code" value={form.pincode} onChange={(value) => updateForm("pincode", value.replace(/\D/g, "").slice(0, 6))} placeholder="400001" required pattern="\d{6}" /><Field label="Country" value={form.country} onChange={(value) => updateForm("country", value)} placeholder="India" required /></div></div>
        <div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600"><CalendarDays className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Pickup window</h3></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Pickup date{slotOptions.length ? <select required aria-label="Provider pickup date" value={form.date} onChange={(event) => { const option = slotOptions.find((item) => item.date === event.target.value); updateForm("date", event.target.value); updateForm("window", option?.slots[0] ?? ""); }} className={cn(inputClass, "w-full")}>{slotOptions.map((option) => <option key={option.date} value={option.date}>{option.date}{option.reason ? ` · ${option.reason.replaceAll("_", " ")}` : ""}</option>)}</select> : <input required type="date" min={todayIso()} value={form.date} disabled className={cn(inputClass, "w-full")} />}</label>{slotOptions.length ? <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">Preferred time window<select required aria-label="Preferred time window" value={form.window} onChange={(event) => updateForm("window", event.target.value)} className={cn(inputClass, "w-full")}><option value="">Select provider window</option>{availableSlots.map((slot) => <option key={slot}>{slot}</option>)}</select></label> : <input required aria-label="Requested time window" value="" disabled placeholder="Waiting for provider-confirmed windows" className={cn(inputClass, "w-full")} />}</div><p className="mt-2 text-[11px] text-muted-foreground">{slotOptions.length ? "Dates and windows are supplied by the provider scheduling response." : slotError || (form.providerAccountId && /^\d{6}$/.test(form.pincode) ? "No provider-confirmed pickup slot is currently available for this courier account and PIN code." : "Enter the courier account, pickup location, and PIN code to load Delhivery-confirmed dates and windows.")}</p></div>
        <div className="rounded-xl border border-border bg-background p-4"><div className="mb-2 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Manifested shipments</h3><p className="mt-1 text-[11px] text-muted-foreground">Select booked shipments from this courier account to send them together for pickup. Leave empty for a blind/manual AWB pickup.</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{selectedCandidateIds.length} selected</span></div>{candidateLoading ? <p className="text-xs text-muted-foreground">Loading booked shipments…</p> : candidateError ? <p className="text-xs text-destructive">{candidateError}</p> : !candidates.length ? <p className="text-xs text-muted-foreground">No eligible booked shipments found for this account and PIN.</p> : <div className="max-h-40 space-y-1 overflow-y-auto">{candidates.map((candidate) => <label key={candidate.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-muted"><input type="checkbox" checked={selectedCandidateIds.includes(candidate.id)} onChange={() => toggleCandidate(candidate.id)} className="accent-primary" /><span className="min-w-0 flex-1 truncate">{candidate.awb || candidate.lr_number || candidate.pss_reference || candidate.id}</span><span className="text-muted-foreground">{candidate.pieces ?? 1} pc · {candidate.total_weight_kg ?? 0} kg</span></label>)}</div>}</div>
        <div><div className="mb-3 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600"><Package className="h-3.5 w-3.5" /></span><h3 className="text-sm font-semibold">Package details</h3></div><div className="grid gap-3 sm:grid-cols-2">{selectedCandidateIds.length === 0 && <Field label="Delhivery AWB(s) (optional)" value={form.awbNumber} onChange={(value) => updateForm("awbNumber", value)} placeholder="Leave blank for a location-only pickup" className="sm:col-span-2" />}{selectedCandidateIds.length === 0 && <Field label="Pieces" type="number" min="1" value={form.pieces} onChange={(value) => updateForm("pieces", value)} required />}{selectedCandidateIds.length === 0 && <Field label="Total weight (kg)" type="number" min="0.1" step="0.1" value={form.weight} onChange={(value) => updateForm("weight", value)} placeholder="e.g. 25" required />}<Field label="Notes (optional)" value={form.notes} onChange={(value) => updateForm("notes", value)} placeholder="Loading instructions, access notes…" className="sm:col-span-2" /></div><p className="mt-2 text-[11px] text-muted-foreground">For a standalone pickup, AWBs and booked shipments are optional. Delhivery will use the selected pickup location and package count.</p></div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />The provider will confirm the requested date and slot. It will not be shown as scheduled until accepted.</p><div className="flex justify-end gap-2"><button type="button" onClick={close} disabled={submitting} className={buttonSecondary}>Cancel</button><button type="submit" disabled={submitting || !slotOptions.some((option) => option.date === form.date && option.slots.includes(form.window))} className={cn(buttonPrimary, (submitting || !slotOptions.some((option) => option.date === form.date && option.slots.includes(form.window))) && "cursor-not-allowed opacity-60")}>{submitting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Scheduling…</> : <><Check className="h-3.5 w-3.5" /> Schedule pickup</>}</button></div></div>
      </form>
    </div>
  </div>;
}

function PickupConfirmationModal({ confirmation, close }: { confirmation: ScheduleConfirmation; close: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={close}>
    <div role="dialog" aria-modal="true" aria-labelledby="pickup-confirmation-title" className="w-full max-w-md rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-border/70 pb-4"><div><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><Check className="h-4 w-4" /></span><h2 id="pickup-confirmation-title" className="text-base font-semibold">Pickup scheduling submitted</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Your pickup request was sent to Delhivery. The request is now recorded in your Pickup list.</p></div><button type="button" onClick={close} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close pickup confirmation"><X className="h-4 w-4" /></button></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Detail label="PUR / Pickup ID" value={confirmation.providerReference} /><Detail label="Status" value={confirmation.status} /><Detail label="Pickup date" value={confirmation.date} /><Detail label="Time slot" value={confirmation.window} /><Detail label="Provider status" value={confirmation.providerStatus} /></div>
      {confirmation.providerReference === "Not yet returned by provider" && <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">Delhivery has not returned a PUR yet. The panel will keep this request pending and will not substitute an internal ID.</p>}
      <div className="mt-5 flex justify-end"><button type="button" onClick={close} className={buttonPrimary}>Done</button></div>
    </div>
  </div>;
}

function Field({ label, value, onChange, placeholder, required, type = "text", min, step, pattern, className }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string; min?: string; step?: string; pattern?: string; className?: string }) { return <label className={cn("grid gap-1.5 text-xs font-medium text-muted-foreground", className)}>{label}<input required={required} type={type} min={min} step={step} pattern={pattern} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cn(inputClass, "w-full")} /></label>; }

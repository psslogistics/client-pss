"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Calculator, Check, MapPin, RefreshCw, Truck } from "lucide-react";
import type { SavedAddressRecord } from "@/lib/client-operations-data";
import { checkServiceability, formatINR, isValidPincode } from "@/lib/client-pricing-data";
import { cn } from "@/lib/utils";
import { pssApi } from "@/lib/pss-api";

const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";
const buttonClass = "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50";
const primaryClass = "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";

type PincodeLocation = { city: string; state: string };

function usePincodeLocation(pincode: string) {
  const [location, setLocation] = useState<PincodeLocation | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  useEffect(() => {
    const normalized = pincode.trim();
    if (!/^\d{6}$/.test(normalized)) { setLocation(null); setLookupState("idle"); return; }
    let cancelled = false;
    setLocation(null); setLookupState("loading");
    const applyResponse = (response: { data?: { city?: string; state?: string } }) => {
      const next = response.data?.city && response.data?.state ? { city: response.data.city, state: response.data.state } : null;
      setLocation(next); setLookupState(next ? "found" : "not-found");
    };
    void pssApi<{ data: { city: string; state: string } }>(`/v1/pincodes/${normalized}`)
      .then(applyResponse)
      .catch(async () => {
        const response = await fetch(`/api/pincode/${normalized}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Pincode lookup failed");
        applyResponse(await response.json() as { data?: { city?: string; state?: string } });
      })
      .catch(() => {
        if (!cancelled) {
          setLocation(null); setLookupState("not-found");
        }
      });
    return () => { cancelled = true; };
  }, [pincode]);
  return { location, lookupState };
}

function PincodeLocationHint({ location, lookupState }: { location: PincodeLocation | null; lookupState: "idle" | "loading" | "found" | "not-found" }) {
  if (lookupState === "loading") return <span className="mt-1 block text-[11px] text-muted-foreground">Finding location…</span>;
  if (location) return <span className="mt-1 block text-[11px] text-emerald-600">{location.city}, {location.state}</span>;
  if (lookupState === "not-found") return <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">Location not found</span>;
  return null;
}

function useSavedAddresses() {
  const [warehouses, setWarehouses] = useState<SavedAddressRecord[]>([]);
  const [consignees, setConsignees] = useState<SavedAddressRecord[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([pssApi<{ data: Array<Record<string, string>> }>("/v1/warehouses"), pssApi<{ data: Array<Record<string, string>> }>("/v1/addresses")]).then(([warehouseResult, addressResult]) => { if (cancelled) return; const map = (row: Record<string, string>): SavedAddressRecord => ({ id: row.id, name: row.name ?? row.label ?? "", kind: "warehouse", company: "", address: { line: row.address ?? "", city: row.city ?? "", state: row.state ?? "", pincode: row.pincode ?? "", country: "India" }, contact: { name: row.contact_name ?? "", phone: row.phone ?? row.contact ?? "", email: "" }, default: false }); setWarehouses(warehouseResult.data.map(map)); setConsignees(addressResult.data.map(map)); }).catch(() => { if (!cancelled) { setWarehouses([]); setConsignees([]); } });
    return () => { cancelled = true; };
  }, []);
  return { warehouses, consignees };
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Information Center</div><h1 className="text-xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Production API</span></div>;
}

function AddressSelect({ label, records, value, onChange }: { label: string; records: SavedAddressRecord[]; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium">{label} <span className="font-normal text-muted-foreground">(optional)</span></span><select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose saved address</option>{records.map((record) => <option key={record.id} value={record.address.pincode}>{record.name} · {record.address.pincode}</option>)}</select></label>;
}

function PincodeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const { location, lookupState } = usePincodeLocation(value);
  return <label className="block space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={inputClass} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} /><PincodeLocationHint location={location} lookupState={lookupState} /></label>;
}

function Segment<T extends string>({ values, value, onChange }: { values: T[]; value: T; onChange: (value: T) => void }) {
  return <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-1">{values.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className={cn("rounded-md px-3 py-1.5 text-xs transition", value === item ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{item}</button>)}</div>;
}

export function PincodeServiceability() {
  const { warehouses, consignees } = useSavedAddresses();
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkServiceability> | null>(null);
  const runCheck = () => {
    if (!isValidPincode(pickup) || !isValidPincode(delivery)) return setError("Enter valid six-digit pickup and delivery pincodes.");
    if (pickup === delivery) return setError("Pickup and delivery pincodes must be different.");
    setError(""); setStatus("loading");
    void pssApi<{ data: { serviceable: boolean; providers: string[]; status: string; serviceability_rows?: Array<{ pincode: string; provider: string; status: string; oda: boolean | null; account_name?: string; confidence_score?: number; priority?: number; source?: string }> } }>("/v1/serviceability", { method: "POST", body: JSON.stringify({ origin_pincode: pickup, destination_pincode: delivery }) }).then((response) => {
      const available = response.data.serviceable;
      const providerError = response.data.status === "provider_error";
      const rows = (response.data.serviceability_rows ?? []).map((row) => {
        // Provider responses may include a private account label after the public courier name.
        // Keep that identifier in the API response for routing, but never render it to clients.
        const publicProvider = row.provider.split(/[·|:]/, 1)[0].trim();
        return { ...row, provider: publicProvider.toLowerCase() === "delhivery" ? "DELHIVERY" : publicProvider.toUpperCase() };
      });
      const datasetBacked = rows.some((row) => row.source === "Delhivery pincode dataset");
      setResult({ pickup: available, delivery: available, modes: response.data.providers.map((provider) => provider === "delhivery" ? "Express" : "Surface"), eta: available ? "Provider confirmation required" : "Not available", prepaid: available, cod: available, reverse: available, temporary: providerError && !datasetBacked, message: datasetBacked ? "The route is available in Delhivery's active B2B pincode dataset. Live provider confirmation was unavailable, so no shipment was created." : providerError ? "The courier provider did not return a verified response. Please retry shortly." : available ? "The route is eligible for configured courier providers." : "The route is not serviceable for the enabled courier providers.", rows });
      setStatus("done");
    }).catch((error) => { setError(error instanceof Error ? error.message : "Unable to check serviceability."); setStatus("idle"); });
  };
  const reset = () => { setPickup(""); setDelivery(""); setResult(null); setError(""); setStatus("idle"); };
  return <div className="w-full space-y-5"><PageHeader title="Pincode Serviceability" description="Check whether a pickup and delivery route is currently supported." /><div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"><section className="rounded-xl border border-border bg-card p-4"><div className="mb-4 flex items-center gap-2"><MapPin className="size-4 text-primary" /><h2 className="text-sm font-semibold">Route details</h2></div><div className="grid gap-3 sm:grid-cols-2"><PincodeField label="Pickup pincode" value={pickup} onChange={setPickup} /><PincodeField label="Delivery pincode" value={delivery} onChange={setDelivery} /><AddressSelect label="Pickup warehouse" records={warehouses} value="" onChange={setPickup} /><AddressSelect label="Delivery address" records={consignees} value="" onChange={setDelivery} /></div>{error && <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primaryClass} onClick={runCheck} disabled={status === "loading"}>{status === "loading" ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}Check serviceability</button><button type="button" className={buttonClass} onClick={() => { const next = pickup; setPickup(delivery); setDelivery(next); }}><ArrowRight className="size-3.5" />Swap</button><button type="button" className={buttonClass} onClick={reset}>Reset</button></div></section><section className="min-h-[340px] rounded-xl border border-border bg-card p-4" aria-live="polite">{status === "idle" && <div className="grid h-full min-h-[300px] place-items-center text-center"><div><MapPin className="mx-auto mb-3 size-8 text-muted-foreground/40" /><p className="text-sm font-medium">Check a route to see serviceability</p><p className="mt-1 text-xs text-muted-foreground">The result is returned by the production API.</p></div></div>}{status === "loading" && <div className="grid h-full min-h-[300px] place-items-center text-center"><RefreshCw className="mx-auto mb-3 size-7 animate-spin text-primary" /><p className="text-sm font-medium">Checking route...</p></div>}{status === "done" && result && <div className="space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Overall route</p><h2 className="text-lg font-semibold">{result.temporary ? "Temporarily unavailable" : !result.pickup || !result.delivery ? "Not serviceable" : "Serviceable route"}</h2></div><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", result.temporary ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>{result.temporary ? "Review required" : "Available"}</span></div><p className="text-sm text-muted-foreground">{result.message}</p><div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pincode - Courier - Availability - ODA</p>{result.rows.length ? <div className="space-y-2">{result.rows.map((row) => <div className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm" key={`${row.pincode}-${row.provider}`}><span className="font-medium">{row.pincode} - {row.provider} - {row.status} - {row.oda === true ? "ODA" : row.oda === false ? "Non-ODA" : "ODA status unavailable"}</span>{row.source && <span className="mt-1 block text-[11px] text-muted-foreground">Source: {row.source}</span>}{row.confidence_score !== undefined && <span className="mt-1 block text-[11px] text-muted-foreground">Confidence {Number(row.confidence_score).toFixed(0)}% · Priority {row.priority ?? 100}</span>}</div>)}</div> : <p className="text-xs text-muted-foreground">The provider did not return per-pincode serviceability details.</p>}</div><div className="grid gap-2 sm:grid-cols-2">{[["Pickup", result.pickup ? "Available" : "Unavailable"], ["Delivery", result.delivery ? "Available" : "Unavailable"], ["Modes", result.modes.join(" · ") || "None"], ["ETA", result.eta], ["Prepaid", result.prepaid ? "Available" : "Unavailable"], ["COD", result.cod ? "Available" : "Unavailable"], ["Reverse / RTO", result.reverse ? "Available" : "Unavailable"]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}</div><p className="border-t border-border pt-3 text-[11px] text-muted-foreground">Availability reflects the currently configured production courier providers. ODA is shown only when returned by the provider.</p></div>}</section></div></div>;
}

function NumberInput({ value, onChange, min = 0, step = "1" }: { value: number | string; onChange: (value: string) => void; min?: number; step?: string }) {
  return <input className={inputClass} type="number" min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function RateCard() {
  const [providers, setProviders] = useState<Array<{ name: string; enabled: boolean; configured: boolean; health?: string; lastError?: string | null }>>([]);
  const [error, setError] = useState("");
  useEffect(() => { void pssApi<{ data: Record<string, { enabled?: boolean; configured?: boolean; health?: string; last_error_code?: string | null }> }>("/v1/provider-capabilities").then((response) => setProviders(Object.entries(response.data).map(([name, value]) => ({ name, enabled: value.enabled === true, configured: value.configured === true, health: value.health, lastError: value.last_error_code })))).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load provider status.")); }, []);
 return <div className="w-full space-y-5"><PageHeader title="Rate Card Check" description="View courier capability status; live quotes appear only after provider rate contracts are verified." /><section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><div className="flex items-start gap-3"><Truck className="mt-0.5 size-5 text-amber-700" /><div><h2 className="text-sm font-semibold text-amber-900">Live courier rate quotes are unavailable</h2><p className="mt-1 text-sm text-amber-800">Commercial rate cards are managed by authorized Admin and Master users. No browser-local or estimated quote is shown until a verified provider rate contract is enabled.</p></div></div></section><section className="rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">Courier configuration</h2>{error && <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{providers.map((provider) => { const degraded = provider.health === "degraded"; const checking = provider.health === "pending"; const label = degraded ? "Degraded" : checking ? "Checking" : provider.enabled ? "Enabled" : provider.configured ? "Configured, disabled" : "Not configured"; return <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3" key={provider.name}><div><span className="text-sm font-medium">{provider.name}</span>{degraded && provider.lastError ? <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">{provider.lastError}</p> : null}</div><span className={cn("rounded-full px-2 py-1 text-[11px]", degraded ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : checking ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : provider.enabled ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{label}</span></div>; })}{!providers.length && !error && <p className="text-sm text-muted-foreground">Loading provider configuration…</p>}</div></section></div>;
}

export function PssRateCheck() {
  const [form, setForm] = useState({ account_code: "other", origin_pincode: "", destination_pincode: "", origin_city: "", origin_state: "", destination_city: "", destination_state: "", actual_weight_kg: "", volumetric_weight_kg: "", invoice_value: "" });
  const originLocation = usePincodeLocation(form.origin_pincode);
  const destinationLocation = usePincodeLocation(form.destination_pincode);
  const [result, setResult] = useState<{ lane: string; chargeableWeightKg: number; total: number; lines: Array<{ code: string; label: string; amount: number; marker?: "*" }> } | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => { if (originLocation.location) setForm((current) => ({ ...current, origin_city: originLocation.location?.city ?? current.origin_city, origin_state: originLocation.location?.state ?? current.origin_state })); }, [originLocation.location]);
  useEffect(() => { if (destinationLocation.location) setForm((current) => ({ ...current, destination_city: destinationLocation.location?.city ?? current.destination_city, destination_state: destinationLocation.location?.state ?? current.destination_state })); }, [destinationLocation.location]);
  const calculate = () => { setError(""); setLoading(true); void pssApi<{ data: typeof result }>("/v1/pricing/quotes", { method: "POST", body: JSON.stringify({ ...form, actual_weight_kg: Number(form.actual_weight_kg), volumetric_weight_kg: Number(form.volumetric_weight_kg || 0), invoice_value: Number(form.invoice_value || 0) }) }).then((response) => setResult(response.data)).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to calculate the PSS rate.")).finally(() => setLoading(false)); };
  const input = (key: keyof typeof form, label: string) => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={inputClass} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>;
  const ratePincodeField = (key: "origin_pincode" | "destination_pincode", label: string, lookup: typeof originLocation) => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={inputClass} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" value={form[key]} onChange={(event) => update(key, event.target.value.replace(/\D/g, "").slice(0, 6))} /><PincodeLocationHint location={lookup.location} lookupState={lookup.lookupState} /></label>;
  return <div className="w-full space-y-5"><PageHeader title="Rate Check" description="Calculate your PSS Logistics Delhivery B2B shipping charge." /><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"><section className="space-y-4 rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2"><Calculator className="size-4 text-primary" /><h2 className="text-sm font-semibold">Shipment inputs</h2></div><div className="grid gap-3 sm:grid-cols-2">{ratePincodeField("origin_pincode", "Pickup pincode", originLocation)}{ratePincodeField("destination_pincode", "Delivery pincode", destinationLocation)}{input("origin_city", "Pickup city")}{input("origin_state", "Pickup state")}{input("destination_city", "Delivery city")}{input("destination_state", "Delivery state")}{input("actual_weight_kg", "Actual weight (kg)")}{input("volumetric_weight_kg", "Volumetric weight (kg)")}{input("invoice_value", "Invoice value (₹)")}<label className="space-y-1.5"><span className="text-xs font-medium">Delhivery B2B account</span><select className={inputClass} value={form.account_code} onChange={(event) => update("account_code", event.target.value)}><option value="04">04</option><option value="08">08</option><option value="other">Other account</option></select></label></div>{error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}</section><section className="rounded-xl border border-border bg-card p-4" aria-live="polite"><h2 className="text-sm font-semibold">PSS B2B quote</h2>{result ? <div className="mt-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Lane · {result.lane} · {result.chargeableWeightKg} kg charged</span><strong>{formatINR(result.total)}</strong></div><div className="space-y-2 border-t border-border pt-3">{result.lines.map((line) => <div key={line.code} className="flex justify-between text-sm"><span>{line.label}{line.marker ?? ""}</span><span>{formatINR(line.amount)}</span></div>)}</div><p className="border-t border-border pt-3 text-[11px] text-muted-foreground">This is the PSS Logistics client charge. Courier/provider rates are not displayed.</p></div> : <div className="grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">Enter shipment details and calculate to see your PSS charge.</div>}<button type="button" className={primaryClass} disabled={loading} onClick={calculate}>{loading ? "Calculating..." : "Calculate PSS rate"}</button></section></div></div>;
}

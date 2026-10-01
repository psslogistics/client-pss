"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import { pssApi } from "@/lib/pss-api";

const field = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary";
type Line = { code: string; label: string; amount: number; marker?: "*" };
type Account = { id: string; provider: string; account_name: string; status?: string; enabled?: boolean; explicitly_configured?: boolean };
type Quote = { provider_account_id?: string | null; provider_account_name?: string | null; account_code?: string; lane: string; chargeableWeightKg: number; total: number; lines: Line[] };

function usePincodeLocation(pincode: string) {
  const [location, setLocation] = useState<{ city: string; state: string } | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not-found">("idle");

  useEffect(() => {
    const normalized = pincode.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) { setLocation(null); setLookupState("idle"); return; }
    let cancelled = false;
    setLookupState("loading");
    const timer = window.setTimeout(() => {
      void fetch(`/api/pincode/${normalized}`, { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload: { data?: { city?: string; state?: string } } | null) => {
          if (cancelled) return;
          const data = payload?.data;
          if (data?.city && data?.state) { setLocation({ city: data.city, state: data.state }); setLookupState("found"); }
          else { setLocation(null); setLookupState("not-found"); }
        })
        .catch(() => { if (!cancelled) { setLocation(null); setLookupState("not-found"); } });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pincode]);

  return { location, lookupState };
}

function PincodeLocationHint({ location, lookupState }: { location: { city: string; state: string } | null; lookupState: "idle" | "loading" | "found" | "not-found" }) {
  if (lookupState === "loading") return <span className="mt-1 block text-[11px] text-muted-foreground">Finding location…</span>;
  if (location) return <span className="mt-1 block text-[11px] text-emerald-700 dark:text-emerald-300">{location.city}, {location.state}</span>;
  if (lookupState === "not-found") return <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">Location not found</span>;
  return null;
}

export default function PssRateCheck() {
  const [form, setForm] = useState({ origin_pincode: "", destination_pincode: "", weight_kg: "", invoice_value: "" });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const requestId = useRef(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const originLocation = usePincodeLocation(form.origin_pincode);
  const destinationLocation = usePincodeLocation(form.destination_pincode);

  useEffect(() => {
    void pssApi<{ data: Account[] }>("/v1/provider-account-policies")
      .then((response) => setAccounts((response.data ?? []).filter((account) => account.provider === "delhivery" && /B2BC/i.test(account.account_name) && account.explicitly_configured === true)))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Assigned Delhivery accounts could not be loaded."));
  }, []);

  const update = (key: keyof typeof form, value: string) => { setError(""); setQuotes([]); setForm((current) => ({ ...current, [key]: value })); };
  const calculate = async () => {
    const currentRequestId = ++requestId.current;
    const requestedAccounts = selectedAccountId === "all" ? accounts : accounts.filter((account) => account.id === selectedAccountId);
    if (!requestedAccounts.length) { setError("No assigned Delhivery B2B account is available for this client."); return; }
    setLoading(true); setError(""); setQuotes([]);
    try {
      const results = await Promise.allSettled(requestedAccounts.map((account) => pssApi<{ data: Quote }>("/v1/pricing/quotes", { method: "POST", body: JSON.stringify({ origin_pincode: form.origin_pincode, destination_pincode: form.destination_pincode, actual_weight_kg: Number(form.weight_kg), volumetric_weight_kg: 0, invoice_value: Number(form.invoice_value || 0), provider_account_id: account.id, preview_only: true }) })));
      if (currentRequestId !== requestId.current) return;
      const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value.data] : []);
      if (!successful.length) throw new Error("No assigned Delhivery account could calculate this shipment.");
      setQuotes(successful);
      if (successful.length < requestedAccounts.length) setError("Some assigned accounts could not return a quote.");
    } catch (caught) { if (currentRequestId === requestId.current) setError(caught instanceof Error ? caught.message : "Unable to calculate the PSS rates."); }
    finally { if (currentRequestId === requestId.current) setLoading(false); }
  };
  const pincodeInput = (key: "origin_pincode" | "destination_pincode", label: string, lookup: ReturnType<typeof usePincodeLocation>) => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={field} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" value={form[key]} onChange={(event) => update(key, event.target.value.replace(/\D/g, "").slice(0, 6))} /><PincodeLocationHint location={lookup.location} lookupState={lookup.lookupState} /></label>;
  const input = (key: keyof typeof form, label: string, type = "text") => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={field} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>;
  return <div className="w-full space-y-5"><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">PSS B2B rate calculator</h1><p className="mt-1 text-sm text-muted-foreground">Compare the assigned Delhivery B2B account rate cards. Courier costs and provider responses remain hidden.</p></header><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"><section className="space-y-4 rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2"><Calculator className="size-4 text-primary" /><h2 className="text-sm font-semibold">Shipment inputs</h2></div><div className="grid gap-3 sm:grid-cols-2">{pincodeInput("origin_pincode", "Pickup pincode", originLocation)}{pincodeInput("destination_pincode", "Delivery pincode", destinationLocation)}{input("weight_kg", "Weight (kg)", "number")}{input("invoice_value", "Invoice value (₹)", "number")}</div><label className="block space-y-1.5"><span className="text-xs font-medium">Courier / account</span><select className={field} value={selectedAccountId} onChange={(event) => { setSelectedAccountId(event.target.value); setError(""); setQuotes([]); }}><option value="all">All assigned Delhivery accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.account_name}</option>)}</select></label>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}<button type="button" disabled={loading} onClick={() => void calculate()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Calculating…" : "Calculate PSS rates"}</button></section><section className="rounded-xl border border-border bg-card p-4" aria-live="polite"><h2 className="text-sm font-semibold">PSS B2B quotes</h2>{quotes.length ? <div className="mt-4 space-y-2">{quotes.map((quote, index) => <details key={`${quote.provider_account_id ?? quote.account_code ?? "account"}-${index}`} className="group rounded-lg border border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{quote.provider_account_name || "Delhivery B2B account"}</span><span className="mt-1 block text-xs text-muted-foreground">{quote.lane} · {quote.chargeableWeightKg} kg charged</span></span><span className="flex shrink-0 items-center gap-2"><strong>₹{quote.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></summary><div className="space-y-2 border-t border-border px-3 pb-3 pt-3">{quote.lines.map((line) => <div key={line.code} className="flex justify-between text-sm"><span>{line.label}{line.marker ?? ""}</span><span>₹{line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>)}<p className="border-t border-border pt-3 text-[11px] text-muted-foreground">Only the PSS Logistics client charge is shown. Courier rates and provider responses are never displayed.</p></div></details>)}</div> : <div className="grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">Enter shipment details and calculate to compare assigned account rates.</div>}</section></div></div>;
}

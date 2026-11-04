"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import { pssApi } from "@/lib/pss-api";
import { delhiveryB2BAccountLabel, isActiveDelhiveryB2BAccount } from "@/lib/client-pricing-data";
import { PincodeLocationHint, usePincodeLocation } from "@/components/ui/pincodeLocation";

const field = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary";
type Line = { code: string; label: string; amount: number; marker?: "*" };
type Account = { id: string; provider: string; account_name: string; status?: string; enabled?: boolean; explicitly_configured?: boolean };
type Quote = { provider_account_id?: string | null; provider_account_name?: string | null; account_code?: string; lane: string; chargeableWeightKg: number; oda?: boolean; opa?: boolean; total: number; lines: Line[] };
type RiskType = "owner" | "carrier";

const publicServiceLabel = "PSS Delhivery B2B service";

export default function PssRateCheck() {
  const [form, setForm] = useState({ origin_pincode: "", destination_pincode: "", weight_kg: "", invoice_value: "" });
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [riskType, setRiskType] = useState<RiskType>("owner");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const requestId = useRef(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const originLocation = usePincodeLocation(form.origin_pincode);
  const destinationLocation = usePincodeLocation(form.destination_pincode);

  useEffect(() => {
    void Promise.allSettled([
      pssApi<{ data: Account[] }>("/v1/provider-account-policies"),
      pssApi<{ data: Record<string, { available_for_client?: boolean; rate_enabled?: boolean }> }>("/v1/client-courier-capabilities"),
    ]).then(([accountsResult, capabilitiesResult]) => {
      // PSS rate-card previews do not depend on live courier health. The
      // provider capability result is still loaded for operational context,
      // but it must not block an internal customer-charge calculation.
      if (accountsResult.status === "fulfilled") {
        setAccounts((accountsResult.value.data ?? []).filter((account) => account.provider.toLowerCase() === "delhivery" && isActiveDelhiveryB2BAccount(account.account_name) && account.enabled !== false && account.explicitly_configured === true));
      }
      if (capabilitiesResult.status === "rejected" && accountsResult.status === "rejected") setError("Rate-card preview is available, but courier account status could not be loaded.");
    });
  }, []);

  const update = (key: keyof typeof form, value: string) => { setError(""); setQuotes([]); setForm((current) => ({ ...current, [key]: value })); };
  const calculate = async () => {
    const currentRequestId = ++requestId.current;
    const requestedAccounts: Array<Account | null> = accounts.length ? accounts : [null];
    const weight = Number(form.weight_kg);
    const invoiceValue = Number(form.invoice_value);
    if (!form.weight_kg.trim() || !Number.isFinite(weight) || weight <= 0) { setError("Enter a weight greater than 0 kg before calculating."); return; }
    if (!form.invoice_value.trim() || !Number.isFinite(invoiceValue) || invoiceValue < 0) { setError("Enter a valid invoice value of ₹0 or more before calculating."); return; }
    setLoading(true); setError(""); setQuotes([]);
    try {
      const results = await Promise.allSettled(requestedAccounts.map(async (account) => {
        const response = await pssApi<{ data: Quote }>("/v1/pricing/quotes", { method: "POST", body: JSON.stringify({ origin_pincode: form.origin_pincode, destination_pincode: form.destination_pincode, actual_weight_kg: weight, volumetric_weight_kg: 0, invoice_value: invoiceValue, ...(account ? { provider_account_id: account.id } : {}), include_insurance: includeInsurance, risk_type: includeInsurance ? riskType : undefined, preview_only: true }) });
        return { ...response.data, provider_account_id: account?.id ?? response.data.provider_account_id ?? null, provider_account_name: account?.account_name ?? response.data.provider_account_name ?? null };
      }));
      if (currentRequestId !== requestId.current) return;
      const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (!successful.length) throw new Error("The PSS rate-card preview could not be calculated.");
      // Keep one client-facing quote per assigned account. Internal provider
      // account names remain routing data; the render layer uses approved
      // public labels below.
      setQuotes(successful);
      if (accounts.length > 0 && successful.length < accounts.length) setError("Some assigned accounts could not return a quote.");
    } catch (caught) { if (currentRequestId === requestId.current) setError(caught instanceof Error ? caught.message : "Unable to calculate the PSS rates."); }
    finally { if (currentRequestId === requestId.current) setLoading(false); }
  };
  const pincodeInput = (key: "origin_pincode" | "destination_pincode", label: string, lookup: ReturnType<typeof usePincodeLocation>) => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={field} inputMode="numeric" maxLength={6} placeholder="6-digit pincode" value={form[key]} onChange={(event) => update(key, event.target.value.replace(/\D/g, "").slice(0, 6))} /><PincodeLocationHint location={lookup.location} lookupState={lookup.lookupState} /></label>;
  const input = (key: keyof typeof form, label: string, type = "text") => <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><input className={field} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>;
  return <div className="w-full space-y-5"><header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">PSS B2B rate calculator</h1><p className="mt-1 text-sm text-muted-foreground">Calculate the PSS Logistics charge for a shipment. Internal courier accounts and provider responses remain hidden.</p></header><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"><section className="space-y-4 rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2"><Calculator className="size-4 text-primary" /><h2 className="text-sm font-semibold">Shipment inputs</h2></div><div className="grid gap-3 sm:grid-cols-2">{pincodeInput("origin_pincode", "Pickup pincode", originLocation)}{pincodeInput("destination_pincode", "Delivery pincode", destinationLocation)}{input("weight_kg", "Weight (kg)", "number")}{input("invoice_value", "Invoice value (₹)", "number")}</div><label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"><input type="checkbox" checked={includeInsurance} onChange={(event) => { setIncludeInsurance(event.target.checked); setQuotes([]); setError(""); }} className="mt-0.5 size-4 accent-primary" /><span><span className="block text-xs font-semibold">Include risk cover</span><span className="mt-0.5 block text-[11px] text-muted-foreground">Adds the selected risk fee to the PSS quote.</span></span></label>{includeInsurance && <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-xs font-semibold">Risk responsibility</p><p className="mt-1 text-[11px] text-muted-foreground">Owner Risk: higher of ₹50 or 0.1%. Carrier Risk: higher of ₹80 or 0.3%.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => { setRiskType("owner"); setQuotes([]); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${riskType === "owner" ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground"}`}>Owner Risk · ₹50 minimum</button><button type="button" onClick={() => { setRiskType("carrier"); setQuotes([]); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${riskType === "carrier" ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground"}`}>Carrier Risk · ₹80 minimum</button></div></div>}<p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Service: <span className="font-semibold text-foreground">{publicServiceLabel}</span></p>{error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}<button type="button" disabled={loading} onClick={() => void calculate()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Calculating…" : "Calculate PSS rate"}</button></section><section className="rounded-xl border border-border bg-card p-4" aria-live="polite"><h2 className="text-sm font-semibold">PSS B2B quotes</h2>{quotes.length ? <div className="mt-4 space-y-2">{quotes.map((quote, index) => <details key={`${quote.provider_account_id ?? quote.account_code ?? "pss"}-${index}`} open className="group rounded-lg border border-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{delhiveryB2BAccountLabel(quote.provider_account_name) ?? publicServiceLabel}</span><span className="mt-1 block text-xs text-muted-foreground">{quote.lane} · {quote.chargeableWeightKg} kg charged{quote.oda ? " · ODA charge applied" : ""}</span></span><span className="flex shrink-0 items-center gap-2"><strong>₹{quote.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong><ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></summary><div className="space-y-2 border-t border-border px-3 pb-3 pt-3">{quote.lines.map((line) => <div key={line.code} className="flex justify-between text-sm"><span>{line.label}{line.marker ?? ""}</span><span>₹{line.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>)}<p className="border-t border-border pt-3 text-[11px] text-muted-foreground">Only the PSS Logistics client charge is shown. Courier rates and provider responses are never displayed.</p></div></details>)}</div> : <div className="grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">Enter shipment details and calculate to see your PSS charge.</div>}</section></div></div>;
}

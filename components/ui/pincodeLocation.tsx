"use client";

import { useEffect, useState } from "react";
import { pssApi } from "@/lib/pss-api";

export type PincodeLocation = { city: string; state: string; oda: boolean };
export type PincodeLookupState = "idle" | "loading" | "found" | "not-found";

export function usePincodeLocation(pincode: string) {
  const [location, setLocation] = useState<PincodeLocation | null>(null);
  const [lookupState, setLookupState] = useState<PincodeLookupState>("idle");
  useEffect(() => {
    const normalized = pincode.replace(/\D/g, "").slice(0, 6);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (normalized.length !== 6) {
        setLocation(null);
        setLookupState("idle");
        return;
      }
      setLocation(null);
      setLookupState("loading");
      const apply = (payload: { data?: { city?: string; state?: string; oda?: boolean } }) => {
        const data = payload.data;
        const next = data?.city && data.state ? { city: data.city, state: data.state, oda: Boolean(data.oda) } : null;
        if (!cancelled) { setLocation(next); setLookupState(next ? "found" : "not-found"); }
      };
      void pssApi<{ data: PincodeLocation }>(`/v1/pincodes/${normalized}`)
        .then(apply)
        .catch(async () => {
          const response = await fetch(`/api/pincode/${normalized}`, { cache: "no-store" });
          if (!response.ok) throw new Error("Pincode lookup failed");
          apply(await response.json() as { data?: { city?: string; state?: string } });
        })
        .catch(() => { if (!cancelled) { setLocation(null); setLookupState("not-found"); } });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pincode]);
  return { location, lookupState };
}

export function PincodeLocationHint({ location, lookupState }: { location: PincodeLocation | null; lookupState: PincodeLookupState }) {
  if (lookupState === "loading") return <span className="mt-1 block text-[11px] text-muted-foreground">Finding location…</span>;
  if (location) return <span className="mt-1 block text-[11px] text-emerald-700 dark:text-emerald-300">{location.city}, {location.state}{location.oda ? " · ODA area" : ""}</span>;
  if (lookupState === "not-found") return <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">Location not found</span>;
  return null;
}

import { pssApi } from "@/lib/pss-api";

let bookingPrefetch: Promise<void> | null = null;

/**
 * Warm data that the booking form needs without blocking the dashboard or
 * changing the booking confirmation contract. pssApi persists these reads in
 * the authenticated session cache, so the booking route can render instantly
 * when the client opens it.
 */
export function prefetchBookingDependencies() {
  if (bookingPrefetch) return bookingPrefetch;
  bookingPrefetch = Promise.allSettled([
    pssApi("/v1/client-courier-capabilities"),
    pssApi("/v1/provider-account-policies"),
    pssApi("/v1/warehouses"),
    pssApi("/v1/addresses"),
  ]).then(() => undefined);
  return bookingPrefetch;
}

import { createClient } from "@/lib/supabase/client";

const GET_CACHE_TTL_MS = 15_000;
// Keep the last authenticated read available across route reloads for a short
// window. The key includes the Supabase user id, and mutations clear the
// in-memory cache; an explicit browser refresh uses cache: "no-store".
const SESSION_CACHE_TTL_MS = 60_000;
const STALE_SESSION_CACHE_TTL_MS = 120_000;
const MAX_SESSION_CACHE_BYTES = 1_500_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const getInFlight = new Map<string, Promise<unknown>>();
let authExpiryInFlight: Promise<void> | null = null;
const expireAuthSession = () => {
  if (authExpiryInFlight) return authExpiryInFlight;
  authExpiryInFlight = (async () => {
    getCache.clear();
    getInFlight.clear();
    try { await createClient().auth.signOut({ scope: "local" }); } catch { /* the local session may already be invalid */ }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pss-auth-expired"));
  })().finally(() => { authExpiryInFlight = null; });
  return authExpiryInFlight;
};
let sessionInFlight: ReturnType<ReturnType<typeof createClient>["auth"]["getSession"]> | null = null;
const isSessionCachedRead = (path: string) => path.startsWith("/v1/dashboard/summary") || path.startsWith("/v1/reports/client-complete") || path === "/v1/provider-capabilities" || path === "/v1/provider-account-policies";
const sessionKey = (userId: string, path: string) => `pss-api:${userId}:${path}`;

export class PssApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly category: PssErrorCategory;
  readonly providerCode?: string;
  readonly requestId?: string;
  readonly retryable: boolean;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "PssApiError";
    this.status = status;
    this.payload = payload;
    const details = getPssErrorDetails(this);
    this.category = details.category;
    this.providerCode = details.providerCode;
    this.requestId = details.requestId;
    this.retryable = details.retryable;
  }
}

export type PssErrorCategory = "auth" | "permission" | "provider" | "configuration" | "network" | "server" | "request";
const PssErrorCategoryValues: PssErrorCategory[] = ["auth", "permission", "provider", "configuration", "network", "server", "request"];

export type PssErrorDetails = {
  category: PssErrorCategory;
  message: string;
  technicalMessage: string;
  providerCode?: string;
  requestId?: string;
  retryable: boolean;
  staleData: boolean;
};

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};

/** Convert API failures into a stable, user-safe state without losing diagnostic metadata. */
export function getPssErrorDetails(error: unknown, fallback = "The production request could not be completed."): PssErrorDetails {
  const source = error instanceof PssApiError ? { ...record(error.payload), status: error.status } : record(error);
  const nestedError = record(source.error);
  const technicalMessage = typeof nestedError.technical_message === "string" ? nestedError.technical_message : typeof (error as Error | undefined)?.message === "string" ? (error as Error).message : fallback;
  const contractCategory = nestedError.category;
  const status = typeof (error as PssApiError | undefined)?.status === "number" ? (error as PssApiError).status : Number(source.status ?? nestedError.status ?? 0);
  const providerCode = [nestedError.provider_code, nestedError.code, source.provider_code, source.providerCode].find((value) => typeof value === "string") as string | undefined;
  const requestId = [source.request_id, source.requestId, nestedError.request_id, nestedError.requestId].find((value) => typeof value === "string") as string | undefined;
  const normalized = technicalMessage.toLowerCase();
  const category: PssErrorCategory = PssErrorCategoryValues.includes(String(contractCategory) as PssErrorCategory) ? contractCategory as PssErrorCategory : status === 401 || normalized.includes("session has expired") ? "auth" : status === 403 ? "permission" : normalized.includes("not configured") || normalized.includes("configuration") ? "configuration" : providerCode || normalized.includes("provider") || normalized.includes("delhivery") ? "provider" : status >= 500 ? "server" : status === 0 ? "network" : "request";
  const userMessage = typeof nestedError.user_safe_message === "string" ? nestedError.user_safe_message : category === "auth" ? "Your session has expired. Please sign in again." : category === "permission" ? "You do not have permission to complete this operation." : category === "configuration" ? "This production connection is not configured yet." : category === "provider" ? "The courier provider could not complete this operation." : category === "network" || category === "server" ? "Production data is temporarily unavailable. Existing records are unchanged." : technicalMessage === "The PSS API request failed." ? fallback : technicalMessage;
  return { category, message: userMessage, technicalMessage, providerCode, requestId, retryable: typeof nestedError.retryable === "boolean" ? nestedError.retryable : category === "network" || category === "server" || category === "provider" || status === 408 || status === 409 || status === 429, staleData: typeof nestedError.stale_data === "boolean" ? nestedError.stale_data : false };
}

export async function pssApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!sessionInFlight) {
    sessionInFlight = createClient().auth.getSession().finally(() => { sessionInFlight = null; });
  }
  const { data: { session } } = await sessionInFlight;
  if (!session?.access_token) { await expireAuthSession(); throw new Error("Your session has expired. Please sign in again."); }
  const baseUrl = process.env.NEXT_PUBLIC_PSS_API_URL;
  if (!baseUrl) throw new Error("PSS API is not configured.");
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes((init.method ?? "GET").toUpperCase());
  const cacheKey = `${session.user.id}:${path}`;
  let staleValue: T | undefined;
  if (!mutating) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (isSessionCachedRead(path)) {
      try {
        const stored = JSON.parse(sessionStorage.getItem(sessionKey(session.user.id, path)) ?? "null") as { expiresAt?: number; value?: T } | null;
        if (stored?.expiresAt && stored.expiresAt > Date.now() && stored.value !== undefined) {
          getCache.set(cacheKey, { expiresAt: stored.expiresAt, value: stored.value });
          return stored.value;
        }
        if (stored?.expiresAt && stored.value !== undefined && Date.now() - stored.expiresAt <= STALE_SESSION_CACHE_TTL_MS) staleValue = stored.value;
      } catch { /* session storage is an optional acceleration layer */ }
    }
    const pending = getInFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }
  const request = (async () => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const endpoint = `${baseUrl.replace(/\/$/, "")}${path}`;
    const idempotencyKey = mutating ? (new Headers(init.headers).get("Idempotency-Key") ?? crypto.randomUUID()) : undefined;
    const requestHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}`, ...(init.body ? { "content-type": "application/json" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}), ...init.headers });
    let response = await fetch(endpoint, { ...init, signal: controller.signal, headers: requestHeaders(session.access_token) });
    // A token can expire between getSession() and the route request. Refresh
    // once and retry the same request before surfacing an auth failure. This
    // is safe for mutations because the idempotency key is stable for the
    // retry, and it prevents a normal session refresh from looking like logout.
    if (response.status === 401) {
      const refreshed = await createClient().auth.refreshSession();
      const refreshedToken = refreshed.data.session?.access_token;
      if (refreshedToken) response = await fetch(endpoint, { ...init, signal: controller.signal, headers: requestHeaders(refreshedToken) });
      else { await expireAuthSession(); throw new PssApiError("Your session has expired. Please sign in again.", 401, { error: { category: "auth", user_safe_message: "Your session has expired. Please sign in again." } }); }
    }
    const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; user_safe_message?: string } };
    if (response.status === 401) { await expireAuthSession(); throw new PssApiError("Your session has expired. Please sign in again.", 401, payload); }
    if (!response.ok) throw new PssApiError(payload.error?.user_safe_message || payload.error?.message || "The PSS API request failed.", response.status, payload);
    if (!mutating) {
      const expiresAt = Date.now() + GET_CACHE_TTL_MS;
      getCache.set(cacheKey, { expiresAt, value: payload });
      if (isSessionCachedRead(path)) {
        try { const serialized = JSON.stringify({ expiresAt: Date.now() + SESSION_CACHE_TTL_MS, value: payload }); if (serialized.length <= MAX_SESSION_CACHE_BYTES) sessionStorage.setItem(sessionKey(session.user.id, path), serialized); } catch { /* ignore quota or privacy-mode failures */ }
      }
    } else { getCache.clear(); }
    return payload;
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw new Error("The production API timed out. Check the Worker deployment and try again.");
    throw caught;
  } finally { window.clearTimeout(timeout); }
  })();
  if (!mutating) {
    getInFlight.set(cacheKey, request);
    void request.finally(() => getInFlight.delete(cacheKey)).catch(() => undefined);
  }
  if (staleValue !== undefined) {
    void request.catch(() => undefined);
    // Expired session data remains useful during a provider/network outage,
    // but consumers must be able to distinguish it from a fresh response.
    return (staleValue && typeof staleValue === "object" ? { ...(staleValue as Record<string, unknown>), stale_data: true } : staleValue) as T;
  }
  return request;
}

export async function pssApiFile(path: string): Promise<{ blob: Blob; contentType: string }> {
  if (!sessionInFlight) sessionInFlight = createClient().auth.getSession().finally(() => { sessionInFlight = null; });
  const { data: { session } } = await sessionInFlight;
  if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
  const baseUrl = process.env.NEXT_PUBLIC_PSS_API_URL;
  if (!baseUrl) throw new Error("PSS API is not configured.");
  const endpoint = `${baseUrl.replace(/\/$/, "")}${path}`;
  let response = await fetch(endpoint, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (response.status === 401) {
    const refreshed = await createClient().auth.refreshSession();
    const refreshedToken = refreshed.data.session?.access_token;
    if (refreshedToken) response = await fetch(endpoint, { headers: { Authorization: `Bearer ${refreshedToken}` } });
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const payloadRecord = record(payload);
    const errorRecord = record(payloadRecord.error);
    throw new PssApiError(typeof errorRecord.user_safe_message === "string" ? errorRecord.user_safe_message : typeof errorRecord.message === "string" ? errorRecord.message : "The document download failed.", response.status, payload);
  }
  return { blob: await response.blob(), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

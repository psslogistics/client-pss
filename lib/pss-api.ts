import { createClient } from "@/lib/supabase/client";

const GET_CACHE_TTL_MS = 15_000;
const READ_TIMEOUT_MS = 15_000;
const MUTATION_TIMEOUT_MS = 45_000;
const FILE_TIMEOUT_MS = 45_000;
const LABEL_TIMEOUT_MS = 45_000;
// Keep the last authenticated read available across route reloads for a short
// window. The key includes the Supabase user id, and mutations clear the
// in-memory cache; an explicit browser refresh uses cache: "no-store".
const SESSION_CACHE_TTL_MS = 60_000;
const STALE_SESSION_CACHE_TTL_MS = 120_000;
const MAX_SESSION_CACHE_BYTES = 1_500_000;
const getCache = new Map<string, { expiresAt: number; value: unknown }>();
const getInFlight = new Map<string, Promise<unknown>>();
let authExpiryInFlight: Promise<void> | null = null;
const DATA_SYNC_EVENT = "pss-data-invalidated";
const DATA_SYNC_STORAGE_KEY = "pss-data-invalidated-at";
let dataSyncChannel: BroadcastChannel | null = null;
let dataSyncInitialized = false;

const clearReadCaches = () => {
  getCache.clear();
  getInFlight.clear();
  if (typeof window !== "undefined") {
    try {
      for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith("pss-api:")) window.sessionStorage.removeItem(key);
      }
    } catch { /* session storage may be unavailable */ }
  }
};

const initializeDataSync = () => {
  if (dataSyncInitialized || typeof window === "undefined") return;
  dataSyncInitialized = true;
  if (typeof BroadcastChannel !== "undefined") {
    dataSyncChannel = new BroadcastChannel("pss-data-sync");
    dataSyncChannel.addEventListener("message", (event) => {
      if (event.data?.type !== "invalidate") return;
      clearReadCaches();
      window.dispatchEvent(new CustomEvent(DATA_SYNC_EVENT));
    });
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== DATA_SYNC_STORAGE_KEY || !event.newValue) return;
    clearReadCaches();
    window.dispatchEvent(new CustomEvent(DATA_SYNC_EVENT));
  });
};

const broadcastDataInvalidation = () => {
  if (typeof window === "undefined") return;
  initializeDataSync();
  clearReadCaches();
  window.dispatchEvent(new CustomEvent(DATA_SYNC_EVENT));
  dataSyncChannel?.postMessage({ type: "invalidate", at: Date.now() });
  try { window.localStorage.setItem(DATA_SYNC_STORAGE_KEY, String(Date.now())); } catch { /* storage may be unavailable */ }
};

export function subscribePssDataSync(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  initializeDataSync();
  window.addEventListener(DATA_SYNC_EVENT, listener);
  return () => window.removeEventListener(DATA_SYNC_EVENT, listener);
}

export function clearPssReadCaches() {
  clearReadCaches();
}

if (typeof window !== "undefined") initializeDataSync();

const expireAuthSession = () => {
  if (authExpiryInFlight) return authExpiryInFlight;
  authExpiryInFlight = (async () => {
    clearReadCaches();
    try { await createClient().auth.signOut({ scope: "local" }); } catch { /* the local session may already be invalid */ }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pss-auth-expired"));
  })().finally(() => { authExpiryInFlight = null; });
  return authExpiryInFlight;
};
let sessionInFlight: ReturnType<ReturnType<typeof createClient>["auth"]["getSession"]> | null = null;
const isSessionCachedRead = (path: string) => path.startsWith("/v1/dashboard/summary") || path.startsWith("/v1/reports/client-complete") || path === "/v1/provider-capabilities" || path === "/v1/provider-account-policies" || path === "/v1/client-courier-capabilities";
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
export function getPssErrorDetails(error: unknown, fallback = "The request could not be completed."): PssErrorDetails {
  const source = error instanceof PssApiError ? { ...record(error.payload), status: error.status } : record(error);
  const nestedError = record(source.error);
  const technicalMessage = typeof nestedError.technical_message === "string" ? nestedError.technical_message : typeof (error as Error | undefined)?.message === "string" ? (error as Error).message : fallback;
  const contractCategory = nestedError.category;
  const status = typeof (error as PssApiError | undefined)?.status === "number" ? (error as PssApiError).status : Number(source.status ?? nestedError.status ?? 0);
  const providerCode = [nestedError.provider_code, nestedError.code, source.provider_code, source.providerCode].find((value) => typeof value === "string") as string | undefined;
  const requestId = [source.request_id, source.requestId, nestedError.request_id, nestedError.requestId].find((value) => typeof value === "string") as string | undefined;
  const normalized = technicalMessage.toLowerCase();
  const category: PssErrorCategory = PssErrorCategoryValues.includes(String(contractCategory) as PssErrorCategory) ? contractCategory as PssErrorCategory : status === 401 || normalized.includes("session has expired") ? "auth" : status === 403 ? "permission" : normalized.includes("not configured") || normalized.includes("configuration") ? "configuration" : providerCode || normalized.includes("provider") || normalized.includes("delhivery") ? "provider" : status >= 500 ? "server" : status === 0 ? "network" : "request";
  const userMessage = typeof nestedError.user_safe_message === "string" ? nestedError.user_safe_message : category === "auth" ? "Your session has expired. Please sign in again." : category === "permission" ? "You do not have permission to complete this operation." : category === "configuration" ? "This service is not available yet." : category === "provider" ? "The courier provider could not complete this operation." : category === "network" || category === "server" ? "We could not load the latest data. Please try again." : technicalMessage === "The PSS API request failed." ? fallback : technicalMessage;
  return { category, message: userMessage, technicalMessage, providerCode, requestId, retryable: typeof nestedError.retryable === "boolean" ? nestedError.retryable : category === "network" || category === "server" || category === "provider" || status === 408 || status === 409 || status === 429, staleData: typeof nestedError.stale_data === "boolean" ? nestedError.stale_data : false };
}

export async function pssApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  initializeDataSync();
  if (!sessionInFlight) {
    sessionInFlight = createClient().auth.getSession().finally(() => { sessionInFlight = null; });
  }
  const { data: { session } } = await sessionInFlight;
  if (!session?.access_token) { await expireAuthSession(); throw new Error("Your session has expired. Please sign in again."); }
  const baseUrl = process.env.NEXT_PUBLIC_PSS_API_URL;
  if (!baseUrl) throw new Error("PSS API is not configured.");
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes((init.method ?? "GET").toUpperCase());
  const providerRefresh = !mutating && path.includes("refresh_provider=1");
  const bypassCache = !mutating && init.cache === "no-store";
  const cacheKey = `${session.user.id}:${path}`;
  let staleValue: T | undefined;
  if (!mutating && !providerRefresh && !bypassCache) {
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
  const labelArtifactRequest = !mutating && /^\/v1\/shipments\/[^/]+\/(?:label|sticker)(?:\?|$)/.test(path);
  const timeout = globalThis.setTimeout(() => controller.abort(), labelArtifactRequest ? LABEL_TIMEOUT_MS : mutating ? MUTATION_TIMEOUT_MS : READ_TIMEOUT_MS);
  try {
    const endpoint = `${baseUrl.replace(/\/$/, "")}${path}`;
    const idempotencyKey = mutating ? (new Headers(init.headers).get("Idempotency-Key") ?? crypto.randomUUID()) : undefined;
    const requestHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}`, ...(init.body ? { "content-type": "application/json" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}), ...init.headers });
    let response = await fetch(endpoint, { ...init, cache: providerRefresh ? "no-store" : init.cache, signal: controller.signal, headers: requestHeaders(session.access_token) });
    // A token can expire between getSession() and the route request. Refresh
    // once and retry the same request before surfacing an auth failure. This
    // is safe for mutations because the idempotency key is stable for the
    // retry, and it prevents a normal session refresh from looking like logout.
    if (response.status === 401) {
      const refreshed = await createClient().auth.refreshSession();
      const refreshedToken = refreshed.data.session?.access_token;
      if (refreshedToken) response = await fetch(endpoint, { ...init, cache: providerRefresh ? "no-store" : init.cache, signal: controller.signal, headers: requestHeaders(refreshedToken) });
      else { await expireAuthSession(); throw new PssApiError("Your session has expired. Please sign in again.", 401, { error: { category: "auth", user_safe_message: "Your session has expired. Please sign in again." } }); }
    }
    const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; user_safe_message?: string } };
    if (response.status === 401) { await expireAuthSession(); throw new PssApiError("Your session has expired. Please sign in again.", 401, payload); }
    if (!response.ok) throw new PssApiError(payload.error?.user_safe_message || payload.error?.message || "The PSS API request failed.", response.status, payload);
    if (!mutating && !providerRefresh && !bypassCache) {
      const expiresAt = Date.now() + GET_CACHE_TTL_MS;
      getCache.set(cacheKey, { expiresAt, value: payload });
      if (isSessionCachedRead(path)) {
        try { const serialized = JSON.stringify({ expiresAt: Date.now() + SESSION_CACHE_TTL_MS, value: payload }); if (serialized.length <= MAX_SESSION_CACHE_BYTES) sessionStorage.setItem(sessionKey(session.user.id, path), serialized); } catch { /* ignore quota or privacy-mode failures */ }
      }
    } else {
      broadcastDataInvalidation();
    }
    return payload;
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") throw new Error("The request took too long. Please try again.");
    throw caught;
  } finally { globalThis.clearTimeout(timeout); }
  })();
  if (!mutating && !bypassCache) {
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
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), FILE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(endpoint, { signal: controller.signal, headers: { Authorization: `Bearer ${session.access_token}` } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("The document download timed out. Check the provider response and try again.");
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
  if (response.status === 401) {
    const refreshed = await createClient().auth.refreshSession();
    const refreshedToken = refreshed.data.session?.access_token;
    if (refreshedToken) response = await fetch(endpoint, { signal: AbortSignal.timeout(FILE_TIMEOUT_MS), headers: { Authorization: `Bearer ${refreshedToken}` } });
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const payloadRecord = record(payload);
    const errorRecord = record(payloadRecord.error);
    throw new PssApiError(typeof errorRecord.user_safe_message === "string" ? errorRecord.user_safe_message : typeof errorRecord.message === "string" ? errorRecord.message : "The document download failed.", response.status, payload);
  }
  return { blob: await response.blob(), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

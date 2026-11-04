"use client";

export type ClientVerificationStatus = {
  approved: boolean;
  status: string;
  missing_fields: string[];
};

type CacheEntry = {
  userId: string;
  savedAt: number;
  value: ClientVerificationStatus;
};

const CACHE_PREFIX = "pss-client-verification:v1:";
const CACHE_TTL_MS = 30 * 60 * 1000;
const ACTIVE_CACHE_KEY = `${CACHE_PREFIX}active`;

const cacheKey = (userId: string) => `${CACHE_PREFIX}${userId}`;

const isStatus = (value: unknown): value is ClientVerificationStatus => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.approved === "boolean"
    && typeof record.status === "string"
    && Array.isArray(record.missing_fields)
    && record.missing_fields.every((field) => typeof field === "string");
};

export function readClientVerificationCache(userId: string): { value: ClientVerificationStatus; fresh: boolean } | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<CacheEntry>;
    if (entry.userId !== userId || typeof entry.savedAt !== "number" || !isStatus(entry.value)) {
      window.localStorage.removeItem(cacheKey(userId));
      return null;
    }
    return { value: entry.value, fresh: Date.now() - entry.savedAt < CACHE_TTL_MS };
  } catch {
    return null;
  }
}

/**
 * Restore the most recent result while Supabase rehydrates the local session.
 * This is only an optimistic UI hint; shipment creation still requires the
 * authenticated Worker-side verification check.
 */
export function readActiveClientVerificationCache(): { userId: string; value: ClientVerificationStatus; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<CacheEntry>;
    if (typeof entry.userId !== "string" || !entry.userId || typeof entry.savedAt !== "number" || !isStatus(entry.value)) {
      window.localStorage.removeItem(ACTIVE_CACHE_KEY);
      return null;
    }
    return { userId: entry.userId, value: entry.value, fresh: Date.now() - entry.savedAt < CACHE_TTL_MS };
  } catch {
    return null;
  }
}

export function writeClientVerificationCache(userId: string, value: ClientVerificationStatus) {
  if (typeof window === "undefined" || !userId || !isStatus(value)) return;
  try {
    const entry: CacheEntry = { userId, savedAt: Date.now(), value };
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(entry));
    window.localStorage.setItem(ACTIVE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Private browsing or a full storage quota should never block booking.
  }
}

export function clearClientVerificationCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.localStorage.removeItem(cacheKey(userId));
      const active = window.localStorage.getItem(ACTIVE_CACHE_KEY);
      if (active) {
        const entry = JSON.parse(active) as Partial<CacheEntry>;
        if (entry.userId === userId) window.localStorage.removeItem(ACTIVE_CACHE_KEY);
      }
      return;
    }
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures; the server remains authoritative.
  }
}

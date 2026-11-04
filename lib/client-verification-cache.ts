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
const CACHE_TTL_MS = 5 * 60 * 1000;

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

export function writeClientVerificationCache(userId: string, value: ClientVerificationStatus) {
  if (typeof window === "undefined" || !userId || !isStatus(value)) return;
  try {
    const entry: CacheEntry = { userId, savedAt: Date.now(), value };
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(entry));
  } catch {
    // Private browsing or a full storage quota should never block booking.
  }
}

export function clearClientVerificationCache(userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.localStorage.removeItem(cacheKey(userId));
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

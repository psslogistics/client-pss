const compactWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Historical shipment address JSON can contain a legacy display string with
 * phone separators, an `Address:` marker, GST metadata, and a repeated
 * city/state/pincode suffix. Keep this formatter display-only: booking and
 * saved-address APIs continue to use their dedicated fields unchanged.
 */
export const cleanClientAddress = (value: unknown) => {
  let text = compactWhitespace(String(value ?? ""));
  if (!text) return "";
  const addressMarker = text.match(/\bAddress\s*:\s*/i);
  if (addressMarker && addressMarker.index !== undefined) text = text.slice(addressMarker.index + addressMarker[0].length);
  text = text.replace(/\s*\|\|\s*\+?[\d\s()-]{7,}(?=\s|Address\b|$)/i, " ");
  text = text.replace(/\s+State\s*:\s*[^,]+(?:\s*\([^)]*\))?/i, "");
  text = text.replace(/\s+GSTIN\s*\/\s*Unique\s*ID\s*:\s*[^,]+/i, "");
  return compactWhitespace(text).replace(/^[,;\-\s]+|[,;\-\s]+$/g, "");
};

const normalizedPart = (value: string) => compactWhitespace(value).toLowerCase().replace(/[,.\-]+$/g, "");

export const clientAddressDetails = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !value.trim()) return { name: fallback, address: "" };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const name = cleanClientAddress(parsed.name ?? parsed.company ?? fallback) || fallback;
    const rawParts = [parsed.line, parsed.address, parsed.city, parsed.state, parsed.pincode, parsed.country]
      .map(cleanClientAddress)
      .filter(Boolean);
    const seen = new Set<string>();
    const address = rawParts.filter((part) => {
      const key = normalizedPart(part);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join(", ");
    return { name, address };
  } catch {
    return { name: fallback, address: "" };
  }
};

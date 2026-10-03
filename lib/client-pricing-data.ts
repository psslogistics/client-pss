import { formatINR } from "@/lib/client-finance-data";

export type ShipmentMode = "Surface" | "Express" | "PSS B2B";
export type ShipmentType = "Forward" | "RTO" | "Reverse/DTO";
export type PaymentMode = "Prepaid" | "COD";
export type RateCardRow = { mode: ShipmentMode; shipmentType: ShipmentType; zone: string; slab: string; maxWeight: number; base: number; perKg: number; codFee: number; fuel: number; destination: number; rto: number; reverse: number };
export type BoxLine = { id: number; quantity: number; length: number; breadth: number; height: number };
export type RateInput = { pickup: string; delivery: string; boxes: BoxLine[]; deadWeight: number; shipmentValue: number; payment: PaymentMode; codAmount: number; shipmentType: ShipmentType };
export type ServiceabilityRow = { pincode: string; provider: string; status: string; oda: boolean | null; account_name?: string; confidence_score?: number; priority?: number; source?: string };
export type ServiceabilityResult = { pickup: boolean; delivery: boolean; modes: ShipmentMode[]; eta: string; prepaid: boolean; cod: boolean; reverse: boolean; temporary: boolean; message: string; rows: ServiceabilityRow[] };

const normalizeDelhiveryAccountName = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const ACTIVE_DELHIVERY_B2B_ACCOUNT_LABELS: Record<string, string> = {
  PSSLOGISTICS10B2BC: "Delhivery Heavy",
  PSSCHANDIGARHCARGO6B2BC: "Delhivery Light",
  PSSBOOKCFT10B2BC: "Delhivery Standard",
};

/**
 * Returns the approved public label for an active Delhivery B2B account.
 * The raw account name remains private routing data and must never be sent
 * back to a client-facing component as a display label.
 */
export function delhiveryB2BAccountLabel(value: unknown) {
  return ACTIVE_DELHIVERY_B2B_ACCOUNT_LABELS[normalizeDelhiveryAccountName(value)] ?? null;
}

export function isActiveDelhiveryB2BAccount(value: unknown) {
  return delhiveryB2BAccountLabel(value) !== null;
}

/**
 * Provider/account identifiers are routing data, not customer-facing labels.
 * Approved Delhivery B2B accounts use their PSS public labels; all other
 * provider-account identifiers remain hidden behind the generic provider name.
 */
export function publicCourierName(value: unknown, provider?: unknown) {
  const raw = String(value ?? "").trim();
  const providerName = String(provider ?? "").trim();
  if (!raw && !providerName) return "Pending assignment";
  // Callers commonly pass (provider, account), while a few older callers
  // pass (account, provider). Resolve both forms before applying labels.
  const normalizeProvider = (candidate: string) => candidate.toLowerCase().replace(/[^a-z]/g, "");
  const rawProvider = normalizeProvider(raw);
  const secondProvider = normalizeProvider(providerName);
  const knownProviders = new Set(["delhivery", "trackon", "xpressbees", "rivigo", "ekart", "bluedart"]);
  const resolvedProvider = knownProviders.has(rawProvider) ? rawProvider : knownProviders.has(secondProvider) ? secondProvider : "";
  const accountCandidate = resolvedProvider === rawProvider ? providerName : raw;
  const directDelhiveryLabel = delhiveryB2BAccountLabel(raw);
  if (directDelhiveryLabel) return directDelhiveryLabel;
  // When the API already identifies the provider, never let a private
  // provider-account label leak through as the displayed courier name.
  if (resolvedProvider === "delhivery") return delhiveryB2BAccountLabel(accountCandidate) ?? "DELHIVERY";
  if (resolvedProvider === "trackon") return "TRACKON";
  if (resolvedProvider === "xpressbees") return "XPRESSBEES";
  if (resolvedProvider === "rivigo") return "RIVIGO";
  if (resolvedProvider === "ekart") return "EKART";
  if (resolvedProvider === "bluedart") return "BLUEDART";
  const base = raw.split(/[·|:]/, 1)[0].trim();
  const context = `${providerName} ${raw}`;
  const explicitProvider = /^(?:delhivery|trackon|xpressbees|rivigo|ekart|bluedart)$/i.test(providerName) ? providerName : "";
  // Account names/codes are private routing data. Provider responses have
  // historically used several formats such as PSSLOGISTICS10B2BC, PSS
  // LOGISTICS15 B2BC, 04, and delhivery:<account>.
  const looksLikeDelhiveryAccount = /(?:^|[\s_-])PSS(?:[\s_-]|$)/i.test(base)
    || /(?:B2B|B2BC|B2C|SURFACE|EXPRESS|CFT|CARGO|KG)/i.test(base)
    || /^(?:04|08|other)$/i.test(base);
  if (/delhivery/i.test(context) || (!explicitProvider && looksLikeDelhiveryAccount)) return "DELHIVERY";
  if (explicitProvider) return explicitProvider.toUpperCase();
  return (base || providerName).toUpperCase();
}

export const zones = [
  { id: "A", label: "Local", detail: "Within the same city" },
  { id: "B", label: "Regional", detail: "Within approximately 500 km" },
  { id: "C", label: "Metro to metro", detail: "Major metro lanes" },
  { id: "D", label: "Rest of India", detail: "Standard domestic lanes" },
  { id: "E", label: "Special zone", detail: "Jammu, Himachal, and North East" },
  { id: "F", label: "Extended special", detail: "Kashmir, Ladakh, islands, and Manipur" },
];
export const weightSlabs = ["0–0.5 kg", "0.5–1 kg", "1–2 kg", "2–5 kg", "5–10 kg", "10+ kg"];
export const rateCardRows: RateCardRow[] = [];

export function isValidPincode(value: string) { return /^\d{6}$/.test(value.trim()); }
export function volumetricWeight(boxes: BoxLine[]) { return boxes.reduce((total, box) => total + box.quantity * box.length * box.breadth * box.height / 5000, 0); }
export function chargeableWeight(input: Pick<RateInput, "boxes" | "deadWeight">) { return Math.max(input.deadWeight, volumetricWeight(input.boxes)); }
export function resolveZone(pickup: string, delivery: string) { if (pickup.slice(0, 3) === delivery.slice(0, 3)) return "A"; if (pickup.slice(0, 2) === delivery.slice(0, 2)) return "B"; if (["11", "40", "56", "70", "50"].includes(pickup.slice(0, 2)) && ["11", "40", "56", "70", "50"].includes(delivery.slice(0, 2))) return "C"; return delivery.startsWith("18") || delivery.startsWith("19") ? "E" : "D"; }
export function checkServiceability(pickup: string, delivery: string): ServiceabilityResult {
  void pickup;
  void delivery;
  return { pickup: false, delivery: false, modes: [], eta: "Not available", prepaid: false, cod: false, reverse: false, temporary: false, message: "Live serviceability data is not available for this account.", rows: [] };
}
function slabFor(weight: number) { return rateCardRows.find((row) => row.mode === "Surface" && row.shipmentType === "Forward" && row.maxWeight >= weight)?.slab || "10+ kg"; }
export function calculateRates(input: RateInput) { if (!rateCardRows.length) return []; const weight = chargeableWeight(input); const zone = resolveZone(input.pickup, input.delivery); return (["Surface", "Express"] as ShipmentMode[]).flatMap((mode) => { const row = rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone && item.slab === slabFor(weight)) || rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone); if (!row) return []; const freight = row.base + Math.max(0, weight - row.maxWeight + 0.5) * row.perKg; const cod = input.payment === "COD" && input.shipmentType === "Forward" ? Math.max(row.codFee, input.codAmount * 0.02) : 0; const fuel = (freight + cod) * row.fuel; const subtotal = freight + cod + fuel + row.destination + row.rto + row.reverse; const tax = subtotal * 0.18; return [{ mode, courier: mode === "Surface" ? "Surface service" : "Express service", zone, chargeableWeight: weight, eta: "Not available", freight, cod, fuel, surcharge: row.destination, tax, rto: row.rto, reverse: row.reverse, total: subtotal + tax, formattedTotal: formatINR(subtotal + tax) }]; }); }
export { formatINR };

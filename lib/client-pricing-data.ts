import { formatINR } from "@/lib/client-finance-data";

export type ShipmentMode = "Surface" | "Express";
export type ShipmentType = "Forward" | "RTO" | "Reverse/DTO";
export type PaymentMode = "Prepaid" | "COD";
export type RateCardRow = { mode: ShipmentMode; shipmentType: ShipmentType; zone: string; slab: string; maxWeight: number; base: number; perKg: number; codFee: number; fuel: number; destination: number; rto: number; reverse: number };
export type BoxLine = { id: number; quantity: number; length: number; breadth: number; height: number };
export type RateInput = { pickup: string; delivery: string; boxes: BoxLine[]; deadWeight: number; shipmentValue: number; payment: PaymentMode; codAmount: number; shipmentType: ShipmentType };
export type ServiceabilityResult = { pickup: boolean; delivery: boolean; modes: ShipmentMode[]; eta: string; prepaid: boolean; cod: boolean; reverse: boolean; temporary: boolean; message: string };

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
  return { pickup: false, delivery: false, modes: [], eta: "Not available", prepaid: false, cod: false, reverse: false, temporary: false, message: "Live serviceability data is not available for this account." };
}
function slabFor(weight: number) { return rateCardRows.find((row) => row.mode === "Surface" && row.shipmentType === "Forward" && row.maxWeight >= weight)?.slab || "10+ kg"; }
export function calculateRates(input: RateInput) { if (!rateCardRows.length) return []; const weight = chargeableWeight(input); const zone = resolveZone(input.pickup, input.delivery); return (["Surface", "Express"] as ShipmentMode[]).flatMap((mode) => { const row = rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone && item.slab === slabFor(weight)) || rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone); if (!row) return []; const freight = row.base + Math.max(0, weight - row.maxWeight + 0.5) * row.perKg; const cod = input.payment === "COD" && input.shipmentType === "Forward" ? Math.max(row.codFee, input.codAmount * 0.02) : 0; const fuel = (freight + cod) * row.fuel; const subtotal = freight + cod + fuel + row.destination + row.rto + row.reverse; const tax = subtotal * 0.18; return [{ mode, courier: mode === "Surface" ? "Surface service" : "Express service", zone, chargeableWeight: weight, eta: "Not available", freight, cod, fuel, surcharge: row.destination, tax, rto: row.rto, reverse: row.reverse, total: subtotal + tax, formattedTotal: formatINR(subtotal + tax) }]; }); }
export { formatINR };

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
const zoneIds = zones.map((zone) => zone.id);
const slabWeights = [0.5, 1, 2, 5, 10, 20];
const makeRateCards = (): RateCardRow[] => ["Surface", "Express"].flatMap((mode, modeIndex) => (["Forward", "RTO", "Reverse/DTO"] as ShipmentType[]).flatMap((shipmentType, typeIndex) => zoneIds.flatMap((zone, zoneIndex) => weightSlabs.map((slab, slabIndex) => {
  const base = 95 + modeIndex * 65 + typeIndex * 40 + zoneIndex * 12 + slabIndex * 32;
  return { mode: mode as ShipmentMode, shipmentType, zone, slab, maxWeight: slabWeights[slabIndex], base, perKg: 24 + modeIndex * 10 + zoneIndex * 2, codFee: shipmentType === "Forward" ? 40 : 0, fuel: 0.12, destination: zone === "E" || zone === "F" ? 35 + zoneIndex * 10 : 0, rto: shipmentType === "RTO" ? 90 + slabIndex * 15 : 0, reverse: shipmentType === "Reverse/DTO" ? 110 + slabIndex * 15 : 0 };
})))) as RateCardRow[];
export const rateCardRows = makeRateCards();

export function isValidPincode(value: string) { return /^\d{6}$/.test(value.trim()); }
export function volumetricWeight(boxes: BoxLine[]) { return boxes.reduce((total, box) => total + box.quantity * box.length * box.breadth * box.height / 5000, 0); }
export function chargeableWeight(input: Pick<RateInput, "boxes" | "deadWeight">) { return Math.max(input.deadWeight, volumetricWeight(input.boxes)); }
export function resolveZone(pickup: string, delivery: string) { if (pickup.slice(0, 3) === delivery.slice(0, 3)) return "A"; if (pickup.slice(0, 2) === delivery.slice(0, 2)) return "B"; if (["11", "40", "56", "70", "50"].includes(pickup.slice(0, 2)) && ["11", "40", "56", "70", "50"].includes(delivery.slice(0, 2))) return "C"; return delivery.startsWith("18") || delivery.startsWith("19") ? "E" : "D"; }
export function checkServiceability(pickup: string, delivery: string): ServiceabilityResult {
  const pickupUnavailable = pickup.endsWith("999") || pickup === "000000";
  const deliveryUnavailable = delivery.endsWith("999") || delivery === "000000";
  const temporary = pickup.endsWith("888") || delivery.endsWith("888");
  const available = !pickupUnavailable && !deliveryUnavailable;
  return { pickup: !pickupUnavailable, delivery: !deliveryUnavailable, modes: available ? ["Surface", "Express"] : ["Surface"], eta: available ? "2–5 business days" : "Unavailable", prepaid: available, cod: available && !temporary, reverse: available && !temporary, temporary, message: pickupUnavailable || deliveryUnavailable ? "One or more pincodes are not serviceable in the demo matrix." : temporary ? "This lane is temporarily serviceable with limited payment options." : "Both pickup and delivery pincodes are serviceable." };
}
function slabFor(weight: number) { return rateCardRows.find((row) => row.mode === "Surface" && row.shipmentType === "Forward" && row.maxWeight >= weight)?.slab || "10+ kg"; }
export function calculateRates(input: RateInput) { const weight = chargeableWeight(input); const zone = resolveZone(input.pickup, input.delivery); return (["Surface", "Express"] as ShipmentMode[]).map((mode) => { const row = rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone && item.slab === slabFor(weight)) || rateCardRows.find((item) => item.mode === mode && item.shipmentType === input.shipmentType && item.zone === zone)!; const freight = row.base + Math.max(0, weight - row.maxWeight + 0.5) * row.perKg; const cod = input.payment === "COD" && input.shipmentType === "Forward" ? Math.max(row.codFee, input.codAmount * 0.02) : 0; const fuel = (freight + cod) * row.fuel; const subtotal = freight + cod + fuel + row.destination + row.rto + row.reverse; const tax = subtotal * 0.18; return { mode, courier: mode === "Surface" ? "Delhivery Surface" : "Delhivery Express", zone, chargeableWeight: weight, eta: mode === "Surface" ? "3–5 days" : "1–3 days", freight, cod, fuel, surcharge: row.destination, tax, rto: row.rto, reverse: row.reverse, total: subtotal + tax, formattedTotal: formatINR(subtotal + tax) }; }); }
export { formatINR };

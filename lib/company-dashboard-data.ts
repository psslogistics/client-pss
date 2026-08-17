import companyData from "@/data/company-demo/company-data.json";
import type { DelayedShipment, PickupRequest, ShipmentSummaryItem } from "@/components/block/dashboard-data";

const statusStyles: Record<string, Pick<ShipmentSummaryItem, "badgeClass" | "barClass" | "dotClass">> = {
  Booked: { badgeClass: "bg-primary/10 text-primary border-primary/20", barClass: "bg-primary", dotClass: "bg-primary" },
  "Picked Up": { badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20", barClass: "bg-sky-500", dotClass: "bg-sky-500" },
  "In Transit": { badgeClass: "bg-sky-500/10 text-sky-500 border-sky-500/20", barClass: "bg-sky-500", dotClass: "bg-sky-500" },
  Delivered: { badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", barClass: "bg-emerald-500", dotClass: "bg-emerald-500" },
  Returned: { badgeClass: "bg-muted text-muted-foreground border-border", barClass: "bg-muted-foreground", dotClass: "bg-muted-foreground" },
};

const statusLabels: Record<string, string> = {
  "Picked up": "Picked Up",
  "In transit": "In Transit",
};

export const COMPANY_SHIPMENT_SUMMARY: ShipmentSummaryItem[] = Object.entries(
  companyData.deliveries.reduce<Record<string, number>>((counts, delivery) => {
    const label = statusLabels[delivery.status] || delivery.status;
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {}),
).map(([status, count]) => ({
  status,
  count,
  percentage: companyData.deliveries.length ? (count / companyData.deliveries.length) * 100 : 0,
  ...(statusStyles[status] || statusStyles.Booked),
}));

export const COMPANY_DELAYED_SHIPMENTS: DelayedShipment[] = companyData.deliveries
  .filter((delivery) => delivery.delayed)
  .slice(0, 12)
  .map((delivery) => ({
    id: delivery.id,
    trackingId: delivery.id,
    origin: delivery.origin,
    destination: delivery.destination,
    carrier: delivery.courier,
    date: delivery.expected,
    mode: delivery.mode,
  }));

const pickupStyles: Record<string, Pick<PickupRequest, "badgeClass" | "dotClass">> = {
  Completed: { badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", dotClass: "bg-emerald-500" },
  Failed: { badgeClass: "bg-destructive/10 text-destructive border-destructive/20", dotClass: "bg-destructive" },
  Cancelled: { badgeClass: "bg-muted text-muted-foreground border-border", dotClass: "bg-muted-foreground" },
};

export const COMPANY_TODAY_PICKUPS: PickupRequest[] = companyData.pickups.slice(0, 12).map((pickup) => ({
  id: pickup.id,
  pickupId: pickup.reference,
  timeSlot: pickup.window,
  status: pickup.status,
  company: pickup.customer,
  location: `${pickup.location}, ${pickup.country}`,
  pcs: pickup.pieces,
  kg: 0,
  ...(pickupStyles[pickup.status] || pickupStyles.Failed),
}));

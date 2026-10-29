export const shipmentStatuses = [
  "created",
  "booked",
  "provider_pending",
  "manifested",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delayed",
  "exception",
  "returned",
  "cancelled",
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];
export type ClientShipmentStatus = "Booked" | "In Transit" | "Out for Delivery" | "Delivered" | "Delayed" | "Exception" | "Returned" | "Cancelled";
export type ShipmentStatusPolicy = {
  display: ClientShipmentStatus | "Created";
  active: boolean;
  delayed: boolean;
  labelDownload: boolean;
  pickupScheduling: boolean;
  cancellation: boolean;
  reports: boolean;
};

const policy = (display: ShipmentStatusPolicy["display"], options: Omit<ShipmentStatusPolicy, "display">): ShipmentStatusPolicy => ({ display, ...options });
export const shipmentStatusPolicies: Record<ShipmentStatus, ShipmentStatusPolicy> = {
  created: policy("Created", { active: false, delayed: false, labelDownload: false, pickupScheduling: false, cancellation: true, reports: true }),
  booked: policy("Booked", { active: true, delayed: false, labelDownload: true, pickupScheduling: true, cancellation: true, reports: true }),
  provider_pending: policy("Booked", { active: true, delayed: false, labelDownload: false, pickupScheduling: false, cancellation: true, reports: true }),
  manifested: policy("Booked", { active: true, delayed: false, labelDownload: true, pickupScheduling: true, cancellation: true, reports: true }),
  in_transit: policy("In Transit", { active: true, delayed: false, labelDownload: true, pickupScheduling: false, cancellation: false, reports: true }),
  out_for_delivery: policy("Out for Delivery", { active: true, delayed: false, labelDownload: true, pickupScheduling: false, cancellation: false, reports: true }),
  delivered: policy("Delivered", { active: false, delayed: false, labelDownload: true, pickupScheduling: false, cancellation: false, reports: true }),
  delayed: policy("Delayed", { active: true, delayed: true, labelDownload: true, pickupScheduling: false, cancellation: true, reports: true }),
  exception: policy("Exception", { active: true, delayed: false, labelDownload: true, pickupScheduling: false, cancellation: true, reports: true }),
  returned: policy("Returned", { active: false, delayed: false, labelDownload: false, pickupScheduling: false, cancellation: false, reports: true }),
  cancelled: policy("Cancelled", { active: false, delayed: false, labelDownload: false, pickupScheduling: false, cancellation: false, reports: true }),
};

const aliases: Record<string, ShipmentStatus> = {
  created: "created", pending: "provider_pending", provider_pending: "provider_pending", providerpending: "provider_pending",
  booked: "booked", manifested: "manifested", manifest: "manifested", ready_to_ship: "manifested", readytoship: "manifested",
  picked_up: "in_transit", pickedup: "in_transit", in_transit: "in_transit", intransit: "in_transit",
  out_for_delivery: "out_for_delivery", outfordelivery: "out_for_delivery", delivered: "delivered", delayed: "delayed",
  exception: "exception", returned: "returned", rto: "returned", cancelled: "cancelled", canceled: "cancelled",
};

export function normalizeShipmentStatus(value: unknown): ShipmentStatus {
  const key = String(value ?? "booked").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  return aliases[key] ?? "booked";
}

export function toClientShipmentStatus(value: unknown): ClientShipmentStatus {
  switch (normalizeShipmentStatus(value)) {
    case "in_transit": return "In Transit";
    case "out_for_delivery": return "Out for Delivery";
    case "delivered": return "Delivered";
    case "delayed": return "Delayed";
    case "exception": return "Exception";
    case "returned": return "Returned";
    case "cancelled": return "Cancelled";
    default: return "Booked";
  }
}

export function shipmentStatusPolicy(value: unknown): ShipmentStatusPolicy {
  return shipmentStatusPolicies[normalizeShipmentStatus(value)];
}

export function isTerminalShipmentStatus(value: unknown) {
  return !shipmentStatusPolicy(value).active && ["delivered", "returned", "cancelled"].includes(normalizeShipmentStatus(value));
}

export function isDelayedShipment(edd: unknown, value: unknown, now = new Date()) {
  if (!edd || isTerminalShipmentStatus(value)) return false;
  const due = new Date(String(edd));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Number.isFinite(due.getTime()) && due.getTime() < today.getTime();
}

export function isActiveShipmentStatus(value: unknown) {
  return shipmentStatusPolicy(value).active;
}

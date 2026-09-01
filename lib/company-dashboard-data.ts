import type { DelayedShipment, PickupRequest, ShipmentSummaryItem } from "@/components/block/dashboard-data";

// Operational records are loaded from the production data service when it is connected.
// This module intentionally contains no seeded company data.
export const COMPANY_SHIPMENT_SUMMARY: ShipmentSummaryItem[] = [];
export const COMPANY_DELAYED_SHIPMENTS: DelayedShipment[] = [];
export const COMPANY_TODAY_PICKUPS: PickupRequest[] = [];

import type { BillingRecord } from "@/lib/client-finance-data";

// Operational records are owned by the Worker/D1 API. This module contains
// shared display contracts only; it intentionally has no browser-local store.
export type WorkflowShipment = BillingRecord & { pssTracking: string; courierTracking: string; mode: string; service: string; originCountry: string; destinationCountry: string; pieces: number; weight: string; eta: string; expected: string; value: string; updated: string; pickupDate: string; deliveredDate: string; shipmentStatus: string; podUrl?: string; invoiceCount?: number; invoiceNames?: string[]; dimensions?: { length: string; width: string; height: string; boxCount: string }[] };
export type WorkflowPickup = { id: string; reference: string; client: string; customer: string; status: string; date: string; window: string; location: string; country: string; driver: string; pieces: number; weight: string; contact: string; address: string; notes: string; createdFrom: "Shipment booking" | "Standalone request" };
export type WorkflowTicket = { id: string; shipment?: string; subject: string; details: string; priority: "Top" | "High" | "Normal"; status: "Open" | "Resolved"; source: string; date: string };
export type WorkflowNotification = { id: string; category: "Shipments" | "Operations" | "Billing" | "System" | "Support"; title: string; message: string; time: string; actionHref?: string; read: boolean };

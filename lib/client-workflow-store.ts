import type { BillingRecord, WalletTransaction } from "@/lib/client-finance-data";
import type { ExceptionCase, NdrCase, SavedAddressRecord } from "@/lib/client-operations-data";

export const WORKFLOW_EVENT = "pss-client-workflow-updated";
export type WorkflowShipment = BillingRecord & { pssTracking: string; courierTracking: string; mode: string; service: string; originCountry: string; destinationCountry: string; pieces: number; weight: string; eta: string; expected: string; value: string; updated: string; pickupDate: string; deliveredDate: string; shipmentStatus: string; podUrl?: string };
export type WorkflowPickup = { id: string; reference: string; client: string; customer: string; status: string; date: string; window: string; location: string; country: string; driver: string; pieces: number; weight: string; contact: string; address: string; notes: string; createdFrom: "Shipment booking" | "Standalone request" };
type WorkflowPickupInput = Omit<WorkflowPickup, "client"> & { client?: string };
export type WorkflowTicket = { id: string; shipment?: string; subject: string; details: string; priority: "Top" | "High" | "Normal"; status: "Open" | "Resolved"; source: string; date: string };
export type WorkflowNotification = { id: string; category: "Shipments" | "Operations" | "Billing" | "System" | "Support"; title: string; message: string; time: string; actionHref?: string; read: boolean };

export const readWorkflowShipments = (): WorkflowShipment[] => [];
export const readWorkflowPickups = (): WorkflowPickup[] => [];
export const readWorkflowWallet = (): WalletTransaction[] => [];
export const readWorkflowTickets = (): WorkflowTicket[] => [];
export const readWorkflowNotifications = (): WorkflowNotification[] => [];
export const readWorkflowNdr = (): NdrCase[] => [];
export const readWorkflowExceptions = (): ExceptionCase[] => [];
export const addWorkflowShipment = (_shipment: WorkflowShipment) => undefined;
export const addWorkflowPickup = (_pickup: WorkflowPickupInput) => undefined;
export const addWorkflowWalletTransaction = (_transaction: WalletTransaction) => undefined;
export const addWorkflowTicket = (_ticket: WorkflowTicket) => undefined;
export const writeWorkflowNdr = (_items: NdrCase[]) => undefined;
export const writeWorkflowExceptions = (_items: ExceptionCase[]) => undefined;
export const emitNotification = (_notification: Omit<WorkflowNotification, "id" | "time" | "read">) => undefined;

export function addressToPickup(address: SavedAddressRecord): WorkflowPickup {
  return { id: `pickup-${address.id}`, reference: `PKU-${address.id.toUpperCase()}`, client: "", customer: address.contact.name || address.name, status: "Scheduled", date: new Date().toISOString().slice(0, 10), window: "Preferred window", location: address.address.city, country: address.address.country, driver: "Awaiting assignment", pieces: 1, weight: "Not provided", contact: address.contact.phone, address: address.address.line, notes: address.notes || "Created from saved warehouse", createdFrom: "Standalone request" };
}

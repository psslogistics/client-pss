import type { BillingRecord, WalletTransaction } from "@/lib/client-finance-data";
import type { ExceptionCase, NdrCase, SavedAddressRecord } from "@/lib/client-operations-data";

export const WORKFLOW_EVENT = "pss-client-workflow-updated";
const keys = { shipments: "pss_workflow_shipments", pickups: "pss_workflow_pickups", wallet: "pss_workflow_wallet_transactions", tickets: "pss_workflow_tickets", notifications: "pss_workflow_notifications", ndr: "pss_workflow_ndr", exceptions: "pss_workflow_exceptions" } as const;

export type WorkflowShipment = BillingRecord & { pssTracking: string; courierTracking: string; mode: string; service: string; originCountry: string; destinationCountry: string; pieces: number; weight: string; eta: string; expected: string; value: string; updated: string; pickupDate: string; deliveredDate: string; shipmentStatus: string; podUrl?: string };
export type WorkflowPickup = { id: string; reference: string; client: string; customer: string; status: string; date: string; window: string; location: string; country: string; driver: string; pieces: number; weight: string; contact: string; address: string; notes: string; createdFrom: "Shipment booking" | "Standalone request" };
type WorkflowPickupInput = Omit<WorkflowPickup, "client"> & { client?: string };
export type WorkflowTicket = { id: string; shipment?: string; subject: string; details: string; priority: "Top" | "High" | "Normal"; status: "Open" | "Resolved"; source: string; date: string };
export type WorkflowNotification = { id: string; category: "Shipments" | "Operations" | "Billing" | "System" | "Support"; title: string; message: string; time: string; actionHref?: string; read: boolean };

function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function write<T>(key: string, value: T) { if (typeof window === "undefined") return; window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent(WORKFLOW_EVENT)); }

export function readWorkflowShipments() { return read<WorkflowShipment[]>(keys.shipments, []); }
export function readWorkflowPickups() { return read<WorkflowPickup[]>(keys.pickups, []); }
export function readWorkflowWallet() { return read<WalletTransaction[]>(keys.wallet, []); }
export function readWorkflowTickets() { return read<WorkflowTicket[]>(keys.tickets, []); }
export function readWorkflowNotifications() { return read<WorkflowNotification[]>(keys.notifications, []); }
export function readWorkflowNdr() { return read<NdrCase[]>(keys.ndr, []); }
export function readWorkflowExceptions() { return read<ExceptionCase[]>(keys.exceptions, []); }
export function addWorkflowShipment(shipment: WorkflowShipment) { write(keys.shipments, [...readWorkflowShipments(), shipment]); emitNotification({ category: "Shipments", title: "Shipment booked", message: `${shipment.id} was added to your shipment workspace.`, actionHref: `/dashboard/shipmentTracking?id=${shipment.id}` }); }
export function addWorkflowPickup(pickup: WorkflowPickupInput) { write(keys.pickups, [{ client: "PSS Logistics Client", ...pickup }, ...readWorkflowPickups()]); }
export function addWorkflowWalletTransaction(transaction: WalletTransaction) { write(keys.wallet, [transaction, ...readWorkflowWallet()]); }
export function addWorkflowTicket(ticket: WorkflowTicket) { write(keys.tickets, [ticket, ...readWorkflowTickets()]); emitNotification({ category: "Support", title: "Support ticket raised", message: `${ticket.id} is now in the support queue.`, actionHref: "/dashboard/supportTicketCreation" }); }
export function writeWorkflowNdr(items: NdrCase[]) { write(keys.ndr, items); }
export function writeWorkflowExceptions(items: ExceptionCase[]) { write(keys.exceptions, items); }
export function emitNotification(notification: Omit<WorkflowNotification, "id" | "time" | "read">) { const item: WorkflowNotification = { ...notification, id: `NTF-${Date.now()}`, time: "Just now", read: false }; write(keys.notifications, [item, ...readWorkflowNotifications()]); }
export function addressToPickup(address: SavedAddressRecord): WorkflowPickup { return { id: `pickup-${address.id}`, reference: `PKU-${address.id.toUpperCase()}`, client: "PSS Logistics Client", customer: address.contact.name || address.name, status: "Scheduled", date: new Date().toISOString().slice(0, 10), window: "Preferred window", location: address.address.city, country: address.address.country, driver: "Awaiting assignment", pieces: 1, weight: "Not provided", contact: address.contact.phone, address: address.address.line, notes: address.notes || "Created from saved warehouse", createdFrom: "Standalone request" }; }

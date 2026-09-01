import { billingRecords } from "@/lib/client-finance-data";
import { initialWalletTransactions, type WalletTransaction } from "@/lib/client-finance-data";
import { readWorkflowExceptions, readWorkflowNdr, readWorkflowShipments, readWorkflowWallet } from "@/lib/client-workflow-store";
import { TRANSPORT_MODES, type TransportMode } from "@/components/block/dashboard-data";

export type ClientFinancialSnapshot = {
  balance: number | null;
  pendingCharges: number | null;
  codExposure: number | null;
  recentTransactions: WalletTransaction[];
};

export type DashboardShipment = {
  id: string;
  status: string;
  mode?: string;
};

export function readClientShipmentRecords(): DashboardShipment[] {
  const workflowShipments = readWorkflowShipments();
  const workflowIds = new Set(workflowShipments.map((shipment) => shipment.id));
  return [
    ...workflowShipments.map((shipment) => ({ id: shipment.id, status: shipment.shipmentStatus || shipment.status, mode: shipment.mode })),
    ...billingRecords.filter((record) => !workflowIds.has(record.id)).map((record) => ({ id: record.id, status: record.status })),
  ];
}

export function readClientTransportModes(): TransportMode[] {
  const records = readClientShipmentRecords().filter((shipment) => shipment.mode);
  if (!records.length) return TRANSPORT_MODES;
  const counts = new Map<string, number>();
  records.forEach((shipment) => counts.set(shipment.mode as string, (counts.get(shipment.mode as string) || 0) + 1));
  const total = records.length;
  return [...counts.entries()].map(([name, shipments]) => ({ name, shipments, percentage: Math.round((shipments / total) * 100), color: "var(--primary)" }));
}

export function readClientFinancialSnapshot(): ClientFinancialSnapshot {
  const transactions = [...initialWalletTransactions, ...readWorkflowWallet()];
  const uniqueTransactions = [...new Map(transactions.map((transaction) => [transaction.id, transaction])).values()];
  const datedTransactions = [...uniqueTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const pending = uniqueTransactions.filter((transaction) => transaction.direction === "debit" && transaction.status === "Pending").reduce((sum, transaction) => sum + transaction.amount, 0);
  const cod = billingRecords.reduce((sum, record) => sum + record.cod, 0);
  return {
    balance: datedTransactions[0]?.balance ?? null,
    pendingCharges: pending || null,
    codExposure: cod || null,
    recentTransactions: datedTransactions.slice(0, 3),
  };
}

export function readClientDashboardCounts() {
  const shipments = readClientShipmentRecords();
  const activeStatuses = new Set(["Booked", "Picked Up", "In Transit", "Out for Delivery"]);
  const exceptions = [...readWorkflowNdr(), ...readWorkflowExceptions()];
  return {
    totalShipments: shipments.length,
    activeShipments: shipments.filter((shipment) => activeStatuses.has(shipment.status)).length,
    exceptionShipments: exceptions.length,
  };
}

import { billingRecords, formatINR, type BillingRecord } from "@/lib/client-finance-data";
import { exceptionCases, ndrCases, type ExceptionCase, type NdrCase } from "@/lib/client-operations-data";
import { readWorkflowPickups, readWorkflowShipments, type WorkflowPickup, type WorkflowShipment } from "@/lib/client-workflow-store";

export type ClientReportData = {
  shipments: BillingRecord[];
  pickups: WorkflowPickup[];
  ndr: NdrCase[];
  exceptions: ExceptionCase[];
};

export const readClientReportData = (): ClientReportData => {
  const workflowShipments = readWorkflowShipments();
  const knownIds = new Set(workflowShipments.map((record) => record.id));
  return {
    shipments: [...workflowShipments, ...billingRecords.filter((record) => !knownIds.has(record.id))],
    pickups: readWorkflowPickups(),
    ndr: ndrCases,
    exceptions: exceptionCases,
  };
};

export const formatReportDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const formatReportCurrency = (value: number) => formatINR(value);


import { formatINR, type BillingRecord } from "@/lib/client-finance-data";
import type { ExceptionCase, NdrCase } from "@/lib/client-operations-data";
import type { WorkflowPickup } from "@/lib/client-workflow-store";

export type ClientReportData = {
  shipments: (BillingRecord & { edd?: string; delayDays?: number })[];
  pickups: WorkflowPickup[];
  ndr: NdrCase[];
  exceptions: ExceptionCase[];
};

export const formatReportDate = (value: string) => { const parsed = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`); return Number.isNaN(parsed.getTime()) ? "Not provided" : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
export const formatReportCurrency = (value: number) => formatINR(value);

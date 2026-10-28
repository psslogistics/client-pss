import { formatINR, type BillingRecord } from "@/lib/client-finance-data";
import type { ExceptionCase, NdrCase } from "@/lib/client-operations-data";
import type { WorkflowPickup } from "@/lib/client-workflow-store";

export type ClientReportData = {
  shipments: (BillingRecord & { edd?: string; delayDays?: number; mode?: string })[];
  pickups: WorkflowPickup[];
  ndr: NdrCase[];
  exceptions: ExceptionCase[];
};

import { formatDate } from "@/lib/date-format";
export const formatReportDate = (value: string) => formatDate(value);
export const formatReportCurrency = (value: number) => formatINR(value);

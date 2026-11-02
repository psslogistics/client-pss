export type WalletTransaction = { type?: string | null; amount?: number | null; status?: string | null; reference?: string | null };

export type FinanceRecord = { amount?: number | string | null; status?: string | null; shipment_link_status?: string | null; linked_shipment_id?: string | null; lr_number?: string | null; master_awb?: string | null; tracking_number?: string | null; provider_sync_status?: string | null };

export const transactionKind = (item: WalletTransaction) => String(item.type ?? "").toLowerCase();
export const absoluteAmount = (item: WalletTransaction) => Math.abs(Number(item.amount ?? 0));
export const isCredit = (item: WalletTransaction) => { const type = transactionKind(item); return type.includes("credit") || type.includes("refund") || type.includes("topup"); };
export const isPending = (item: WalletTransaction) => ["pending", "processing", "awaiting", "queued"].includes(String(item.status ?? "").toLowerCase());
export const isReversed = (item: WalletTransaction) => ["reversed", "reversal", "refunded"].includes(String(item.status ?? "").toLowerCase()) || transactionKind(item).includes("reversal") || String(item.reference ?? "").trim().toLowerCase().startsWith("reversal");

export function walletTotals<T extends WalletTransaction>(transactions: T[]) {
  return transactions.reduce((result, item) => {
    const amount = absoluteAmount(item);
    if (isCredit(item)) result.credits += amount; else result.debits += amount;
    if (isPending(item) && !isReversed(item)) result.pending += amount;
    if (isReversed(item)) result.reversed += amount;
    return result;
  }, { credits: 0, debits: 0, pending: 0, reversed: 0 });
}

export const financeStatus = (item: FinanceRecord) => String(item.status ?? "").trim().toLowerCase();
export const isExcludedFinanceRecord = (item: FinanceRecord) => ["void", "cancelled", "canceled"].includes(financeStatus(item));
export const isPendingFinanceRecord = (item: FinanceRecord) => financeStatus(item) === "pending";
export const isPaidFinanceRecord = (item: FinanceRecord) => ["paid", "settled", "completed"].includes(financeStatus(item));
export const isFailedFinanceRecord = (item: FinanceRecord) => ["failed", "rejected"].includes(financeStatus(item));
export const isUnlinkedFinanceRecord = (item: FinanceRecord) => String(item.shipment_link_status ?? "").trim().toLowerCase() === "unlinked" || item.linked_shipment_id === null;
export const hasProviderReference = (item: FinanceRecord) => [item.lr_number, item.master_awb, item.tracking_number].some((value) => String(value ?? "").trim().length > 0);
export const isFinanceReviewRecord = (item: FinanceRecord) => isUnlinkedFinanceRecord(item) || (item.linked_shipment_id != null && !hasProviderReference(item));

export function billingTotals<T extends FinanceRecord>(records: T[]) {
  const review = records.filter((record) => isFinanceReviewRecord(record));
  const billable = records.filter((record) => !isExcludedFinanceRecord(record) && !isFinanceReviewRecord(record));
  return {
    total: billable.reduce((sum, record) => sum + absoluteAmount({ amount: Number(record.amount ?? 0) }), 0),
    pendingAmount: billable.filter(isPendingFinanceRecord).reduce((sum, record) => sum + absoluteAmount({ amount: Number(record.amount ?? 0) }), 0),
    paidAmount: billable.filter(isPaidFinanceRecord).reduce((sum, record) => sum + absoluteAmount({ amount: Number(record.amount ?? 0) }), 0),
    billableCount: billable.length,
    pendingCount: billable.filter(isPendingFinanceRecord).length,
    reviewAmount: review.reduce((sum, record) => sum + absoluteAmount({ amount: Number(record.amount ?? 0) }), 0),
    reviewCount: review.length,
    excludedCount: records.length - billable.length,
  };
}

export function codTotals<T extends FinanceRecord>(records: T[]) {
  const amounts = (items: T[]) => items.reduce((sum, record) => sum + absoluteAmount({ amount: Number(record.amount ?? 0) }), 0);
  const pending = records.filter((record) => !isPaidFinanceRecord(record) && !isFailedFinanceRecord(record) && !isExcludedFinanceRecord(record));
  const paid = records.filter(isPaidFinanceRecord);
  const failed = records.filter(isFailedFinanceRecord);
  return {
    total: amounts(records),
    pendingAmount: amounts(pending),
    paidAmount: amounts(paid),
    failedAmount: amounts(failed),
    exposure: amounts(pending),
  };
}

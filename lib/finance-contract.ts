export type WalletTransaction = { type?: string | null; amount?: number | null; status?: string | null };

export const transactionKind = (item: WalletTransaction) => String(item.type ?? "").toLowerCase();
export const absoluteAmount = (item: WalletTransaction) => Math.abs(Number(item.amount ?? 0));
export const isCredit = (item: WalletTransaction) => { const type = transactionKind(item); return type.includes("credit") || type.includes("refund") || type.includes("topup"); };
export const isPending = (item: WalletTransaction) => ["pending", "processing", "awaiting", "queued"].includes(String(item.status ?? "").toLowerCase());
export const isReversed = (item: WalletTransaction) => ["reversed", "reversal", "refunded"].includes(String(item.status ?? "").toLowerCase()) || transactionKind(item).includes("reversal");

export function walletTotals<T extends WalletTransaction>(transactions: T[]) {
  return transactions.reduce((result, item) => {
    const amount = absoluteAmount(item);
    if (isCredit(item)) result.credits += amount; else result.debits += amount;
    if (isPending(item) && !isReversed(item)) result.pending += amount;
    if (isReversed(item)) result.reversed += amount;
    return result;
  }, { credits: 0, debits: 0, pending: 0, reversed: 0 });
}

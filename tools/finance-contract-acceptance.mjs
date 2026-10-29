import assert from "node:assert/strict";
import { billingTotals, codTotals, walletTotals } from "../lib/finance-contract.ts";

const totals = walletTotals([
  { type: "credit", amount: 1000, status: "posted" },
  { type: "debit", amount: 250, status: "posted" },
  { type: "debit", amount: 75, status: "pending" },
  { type: "refund", amount: 50, status: "reversed" },
]);
assert.deepEqual(totals, { credits: 1050, debits: 325, pending: 75, reversed: 50 });
assert.equal(totals.credits - totals.debits, 725);
const billing = billingTotals([
  { amount: 1000, status: "paid" },
  { amount: 250, status: "pending" },
  { amount: 99, status: "cancelled" },
]);
assert.deepEqual(billing, { total: 1250, pendingAmount: 250, paidAmount: 1000, billableCount: 2, pendingCount: 1, excludedCount: 1 });
const cod = codTotals([
  { amount: 500, status: "pending" },
  { amount: 700, status: "paid" },
  { amount: 100, status: "failed" },
]);
assert.deepEqual(cod, { total: 1300, pendingAmount: 500, paidAmount: 700, failedAmount: 100, exposure: 500 });
console.log("Finance contract checks passed (4 checks).");

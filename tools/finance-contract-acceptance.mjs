import assert from "node:assert/strict";
import { walletTotals } from "../lib/finance-contract.ts";

const totals = walletTotals([
  { type: "credit", amount: 1000, status: "posted" },
  { type: "debit", amount: 250, status: "posted" },
  { type: "debit", amount: 75, status: "pending" },
  { type: "refund", amount: 50, status: "reversed" },
]);
assert.deepEqual(totals, { credits: 1050, debits: 325, pending: 75, reversed: 50 });
assert.equal(totals.credits - totals.debits, 725);
console.log("Finance contract checks passed (2 checks).");

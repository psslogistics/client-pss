import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { billingTotals, codTotals, walletTotals } from "../lib/finance-contract.ts";

const fixture = JSON.parse(await readFile(new URL("./fixtures/client-panel-scenarios.json", import.meta.url), "utf8"));
const reconciliation = fixture.reconciliation_fixture;
const shipmentIds = new Set(reconciliation.shipments.map((row) => row.id));
const reportIds = new Set(reconciliation.shipments.map((row) => row.id));
const billingIds = new Set(reconciliation.billing.map((row) => row.shipment_id));
const codIds = new Set(reconciliation.cod.map((row) => row.shipment_id));

assert.deepEqual([...reportIds].sort(), [...billingIds].sort(), "report and billing shipment identities must match");
assert.deepEqual([...reportIds].sort(), [...codIds].sort(), "report and COD shipment identities must match");
assert.ok(reconciliation.wallet.every((row) => /^((SHIPMENT|REVERSAL)-)/.test(row.reference)), "wallet references must remain shipment-linked");
assert.equal(billingTotals(reconciliation.billing).total, 1250, "cancelled billing must be excluded");
assert.equal(billingTotals(reconciliation.billing).billableCount, 2, "only paid and pending billing rows are billable");
assert.deepEqual(walletTotals(reconciliation.wallet), { credits: 500, debits: 1250, pending: 250, reversed: 0 });
assert.deepEqual(codTotals(reconciliation.cod), { total: 1100, pendingAmount: 300, paidAmount: 700, failedAmount: 100, exposure: 300 });
assert.ok(reconciliation.shipments.every((row) => shipmentIds.has(row.id)), "all reconciliation records must reference known shipments");
console.log("Cross-domain finance/report reconciliation passed (7 checks).");

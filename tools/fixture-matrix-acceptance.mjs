import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fixturePath = resolve(process.cwd(), 'tools/fixtures/client-panel-scenarios.json');
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const scenarios = new Map(fixture.scenarios.map((scenario) => [scenario.id, scenario]));

const requiredIds = [
  'booked-lr',
  'delayed',
  'exception-no-reference',
  'mps-two-stickers',
  'missing-provider-reference',
  'provider-rejected',
  'provider-timeout',
  'missing-reference',
  'duplicate-click',
  'expired-session',
  'persistence-failure',
  'cod-pending',
  'cod-paid',
  'pickup-failed',
  'saved-consignor',
  'saved-consignee',
  'weight-open',
  'invoice-paid',
  'invoice-unpaid',
  'kyc-draft',
  'kyc-approved',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fixture.purpose.includes('Non-production'), 'fixture purpose must forbid production seeding');
assert(requiredIds.every((id) => scenarios.has(id)), 'required scenario matrix is incomplete');
assert(scenarios.get('mps-two-stickers').pieces + 1 === scenarios.get('mps-two-stickers').expected_sticker_count, 'MPS sticker count must equal boxes plus one');
assert(scenarios.get('saved-consignor').address_type === 'consignor', 'consignor fixture must retain its address type');
assert(scenarios.get('saved-consignee').address_type === 'consignee', 'consignee fixture must retain its address type');
assert(scenarios.get('invoice-paid').invoice_number === 'INV-321964753', 'paid invoice fixture must use LR invoice numbering');
assert(scenarios.get('invoice-unpaid').invoice_number === 'INV-321964754', 'unpaid invoice fixture must use LR invoice numbering');
assert(scenarios.get('kyc-draft').booking_allowed === false, 'draft KYC must be blocked from final booking');
assert(scenarios.get('kyc-approved').booking_allowed === true, 'approved KYC must be allowed to book');
for (const id of ['provider-rejected', 'provider-timeout', 'missing-reference', 'duplicate-click', 'expired-session', 'persistence-failure']) {
  const scenario = scenarios.get(id);
  assert(scenario.wallet_debit === false, `${id} must not create a wallet debit in simulation`);
  assert(scenario.retry_allowed === false || scenario.retry_allowed === true, `${id} must declare retry policy`);
  assert(typeof scenario.outcome === 'string', `${id} must declare a truthful outcome`);
}
assert(scenarios.get('duplicate-click').outcome === 'same_idempotency_key', 'duplicate click must reuse the same idempotency key');
assert(scenarios.get('provider-timeout').investigate_by === 'idempotency_key', 'timeout must be investigated by idempotency key');
assert(scenarios.get('persistence-failure').investigate_by === 'request_identity', 'persistence failure must be investigated by request identity');

console.log(`Fixture matrix passed: ${requiredIds.length} required scenarios`);

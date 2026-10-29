/**
 * Customer-facing invoice identity and numbering rules.
 *
 * Keep these values in one place until the real PSS/client legal details are
 * supplied. Shipment destination/consignee data must never be used as the
 * invoice Bill-to party.
 */
export const EXAMPLE_INVOICE_SELLER = {
  name: "PSS Logistics",
  address: "123 Logistics Park, Industrial Area, New Delhi, Delhi 110001",
  gstin: "EXAMPLE-GSTIN",
  state: "Delhi",
  stateCode: "07",
  contact: "+91 00000 00000",
  email: "billing@example.com",
};

export const EXAMPLE_INVOICE_BUYER = {
  name: "Client Company",
  address: "456 Client Business Park, Gurugram, Haryana 122001",
  gstin: "CLIENT-EXAMPLE-GSTIN",
  state: "Haryana",
  stateCode: "06",
};

export function invoiceNumberForLr(lrNumber: unknown, fallback = "PENDING-REFERENCE") {
  const value = String(lrNumber ?? "").trim();
  const safe = (value || fallback).replace(/[^A-Za-z0-9-]/g, "-");
  return `INV-${safe}`;
}

export function cycleInvoiceNumber(start: string, end: string) {
  return `PSS-BILL-${start}-${end}`;
}

export function invoiceFileName(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Za-z0-9_-]+/g, "_")}.pdf`;
}

const wordsBelowHundred = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnderThousand(value: number): string {
  if (value < 20) return wordsBelowHundred[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${wordsBelowHundred[value % 10]}` : ""}`;
  return `${wordsBelowHundred[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${wordsUnderThousand(value % 100)}` : ""}`;
}

export function amountInWords(value: number) {
  const rounded = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  if (!rounded) return "Zero Only";
  const groups: Array<[number, string]> = [[10000000, "Crore"], [100000, "Lakh"], [1000, "Thousand"], [1, ""]];
  let remaining = rounded;
  const result: string[] = [];
  for (const [unit, label] of groups) {
    const count = Math.floor(remaining / unit);
    if (count) result.push(`${wordsUnderThousand(count)}${label ? ` ${label}` : ""}`);
    remaining %= unit;
  }
  return `${result.join(" ")} Only`;
}

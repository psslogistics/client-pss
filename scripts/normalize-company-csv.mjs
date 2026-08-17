import fs from "node:fs";
import path from "node:path";

const [pickupPath, deliveryPath, outputPath] = process.argv.slice(2);

if (!pickupPath || !deliveryPath || !outputPath) {
  throw new Error("Usage: node normalize-company-csv.mjs <pickup.csv> <delivery.csv> <output.json>");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }

  const [headers, ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] || "").trim()])));
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function numberOrNull(value) {
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value) {
  const match = String(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pickupStatus(status) {
  if (status === "picked") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Failed";
}

function deliveryStatus(status) {
  if (status === "Delivered") return "Delivered";
  if (status === "In Transit") return "In transit";
  if (status === "Dispatched") return "Picked up";
  if (status === "RTO") return "Returned";
  return "Booked";
}

const pickupRows = readCsv(pickupPath);
const deliveryRows = readCsv(deliveryPath);

const pickups = pickupRows.map((row) => ({
  id: clean(row.pickup_id),
  client: clean(row.client) || "Not provided",
  reference: `PKU${clean(row.pickup_id)}`,
  customer: clean(row.client_warehouse) || "Not provided",
  status: pickupStatus(clean(row.status)),
  date: dateOnly(row.pickup_date) || "Not provided",
  window: clean(row.pickup_time) || "Not provided",
  location: clean(row.origin_city) || "Not provided",
  country: "India",
  driver: clean(row.picked_lr_list) ? "Assigned" : "Not assigned",
  pieces: numberOrNull(row.expected_package_count) || 0,
  weight: "Not provided",
  contact: "Not provided",
  address: clean(row.address) || "Not provided",
  notes: clean(row.remarks) || "",
  createdFrom: "Standalone request",
  source: "pickup_data.csv",
}));

const deliveries = deliveryRows.map((row) => {
  const status = deliveryStatus(clean(row.current_status));
  const value = numberOrNull(row.package_amount);
  const weight = numberOrNull(row.weight);
  const expected = dateOnly(row.expected_date) || dateOnly(row.promise_date) || "Not provided";
  const delayed = status !== "Delivered" && expected !== "Not provided" && expected < "2026-08-15";
  return {
    id: clean(row.lrn),
    orderId: clean(row.order_id),
    invoiceNumber: clean(row.invoice_number) || "Not provided",
    purId: clean(row.pur_id) || "Not provided",
    masterWaybill: clean(row.master_waybill) || "Not provided",
    client: clean(row.client) || "Not provided",
    clientCode: (clean(row.client).match(/[a-z]+/i)?.[0] || "PSS").slice(0, 3).toUpperCase(),
    courierTracking: /^\d+(\.\d+)?E\+\d+$/i.test(clean(row.master_waybill)) ? clean(row.order_id) || "Not provided" : clean(row.master_waybill) || clean(row.order_id) || "Not provided",
    courier: "Delhivery",
    mode: "Not provided",
    service: "Not provided",
    origin: clean(row.origin_city) || "Not provided",
    destination: clean(row.destination_city) || "Not provided",
    status,
    pieces: numberOrNull(row.no_of_boxes) || 0,
    weight: weight === null ? "Not provided" : `${weight} kg`,
    eta: expected,
    booked: dateOnly(row.pickup_date) || dateOnly(row.manifest_date) || "Not provided",
    expected,
    payment: clean(row.payment_type) || "Not provided",
    value: value === null ? "Not provided" : `₹${value.toLocaleString("en-IN")}`,
    amount: value,
    delayed,
    updated: dateOnly(row.last_scan_date) || "Not provided",
    delay: status === "Booked" && dateOnly(row.expected_date) ? clean(row.remarks) || undefined : undefined,
    lastScanLocation: clean(row.last_scan_location) || "Not provided",
    consignee: clean(row.consignee_name) || "Not provided",
    state: clean(row.state) || "Not provided",
    source: "delivery_data.csv",
  };
});

const output = {
  source: {
    pickups: path.basename(pickupPath),
    deliveries: path.basename(deliveryPath),
    cleanedAt: new Date().toISOString(),
    pickupRows: pickups.length,
    deliveryRows: deliveries.length,
  },
  pickups,
  deliveries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

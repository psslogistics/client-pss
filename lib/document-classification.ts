/** Returns true for provider-generated documents that must not be shown as client invoices. */
export const isProviderArtifactFilename = (value: unknown): boolean => {
  const filename = String(value ?? "").trim().toLowerCase();
  if (!filename) return false;
  if (/^delhivery-(pod|label|sticker|lr|waybill)-/.test(filename)) return true;
  if (filename.startsWith("eway-bill-")) return true;
  if (/(^|[-_\s])(label|sticker)([-_.\s]|$)/.test(filename)) return true;
  return /(^|[-_\s])lr(?:[-_\s]?(copy|waybill))?([-_.\s]|$)/.test(filename);
};

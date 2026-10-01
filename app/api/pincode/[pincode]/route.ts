import { NextResponse } from "next/server";

type IndiaPostResponse = Array<{
  Status?: string;
  PostOffice?: Array<{ District?: string; State?: string; Name?: string }>;
}>;

export async function GET(_request: Request, { params }: { params: Promise<{ pincode: string }> }) {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) return NextResponse.json({ error: "A six-digit pincode is required." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Pincode lookup failed." }, { status: 502 });
    const payload = await response.json() as IndiaPostResponse;
    const entry = payload[0];
    const office = entry?.PostOffice?.[0];
    if (!office || entry?.Status?.toLowerCase() !== "success" || !office.District || !office.State) {
      return NextResponse.json({ error: "Pincode not found." }, { status: 404 });
    }
    return NextResponse.json({ data: { pincode, city: office.District, state: office.State, source: "india-post" } }, { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ error: "Pincode lookup unavailable." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

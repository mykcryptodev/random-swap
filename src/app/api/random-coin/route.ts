import { NextResponse } from "next/server";
import { getOrRefreshRandomCoinPayload } from "@/lib/randomCoin";

export async function GET() {
  try {
    const payload = await getOrRefreshRandomCoinPayload();
    if (!payload) return NextResponse.json({ error: "No payload" }, { status: 500 });
    
    // Return everything including the base64 image
    return NextResponse.json({
      coin: payload.coin,
      details: payload.details,
      chart: payload.chart,
      ogImageBase64: payload.ogImageBase64,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



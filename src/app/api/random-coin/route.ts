import { NextResponse } from "next/server";
import { getOrRefreshRandomCoinPayload, type RandomCoinPayload } from "@/lib/randomCoin";

export async function GET() {
  try {
    const payload = await getOrRefreshRandomCoinPayload();
    if (!payload) return NextResponse.json({ error: "No payload" }, { status: 500 });
    const json: RandomCoinPayload = payload;
    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



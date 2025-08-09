import { NextResponse } from "next/server";
import { getOrRefreshRandomCoinPayload, type RandomCoinPayload } from "@/lib/randomCoin";
import { RANDOM_COIN_CHART_DAYS } from "@/lib/cache";

export type RandomCoinResponse = RandomCoinPayload & { imageUrl: string };
export async function GET(req: Request) {
  try {
    const payload = await getOrRefreshRandomCoinPayload();
    if (!payload) return NextResponse.json({ error: "No payload" }, { status: 500 });
    const origin = new URL(req.url).origin;
    const imageUrl = `${origin}/og?id=${encodeURIComponent(payload.coin.id)}&days=${RANDOM_COIN_CHART_DAYS}`;
    const json: RandomCoinResponse = { ...payload, imageUrl };
    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



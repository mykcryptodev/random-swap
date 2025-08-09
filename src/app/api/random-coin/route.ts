import { NextResponse } from "next/server";
import { fetchAllCoins, pickRandomCoin, type CoinGeckoCoin } from "@/lib/coingecko";
import { getJSON, setWithTTL } from "@/lib/redis";
import { RANDOM_COIN_CACHE_KEY, RANDOM_COIN_CACHE_TTL_SECONDS } from "@/lib/cache";

export async function GET() {
  try {
    const cached = await getJSON<CoinGeckoCoin>(RANDOM_COIN_CACHE_KEY);
    if (cached) {
      return NextResponse.json({ source: "cache", coin: cached });
    }

    const apiKey = process.env.COINGECKO_API_KEY;
    const coins = await fetchAllCoins(apiKey);
    const coin = pickRandomCoin(coins);
    if (!coin) {
      return NextResponse.json({ error: "No coins found" }, { status: 500 });
    }

    await setWithTTL(RANDOM_COIN_CACHE_KEY, coin, RANDOM_COIN_CACHE_TTL_SECONDS);

    return NextResponse.json({ source: "live", coin });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



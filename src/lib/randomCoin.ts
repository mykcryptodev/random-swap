import { getJSON, setWithTTLIfNotExists, getRedisClient } from "@/lib/redis";
import {
  fetchCoinsByCategory,
  pickRandomCoin,
  type CoinGeckoCoin,
  fetchCoinDetails,
  fetchCoinMarketChart,
  type CoinDetails,
  type MarketChart,
} from "@/lib/coingecko";
import {
  RANDOM_COIN_CACHE_KEY,
  RANDOM_COIN_CACHE_TTL_SECONDS,
  RANDOM_COIN_CATEGORY,
  RANDOM_COIN_CHART_DAYS,
} from "@/lib/cache";

export async function getOrRefreshRandomCoin(): Promise<CoinGeckoCoin | null> {
  const cached = await getJSON<CoinGeckoCoin>(RANDOM_COIN_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
  const coins = await fetchCoinsByCategory(RANDOM_COIN_CATEGORY, apiKey);
  const coin = pickRandomCoin(coins);
  if (!coin) return null;

  const created = await setWithTTLIfNotExists(RANDOM_COIN_CACHE_KEY, coin, RANDOM_COIN_CACHE_TTL_SECONDS);
  if (!created) {
    const settled = await getJSON<CoinGeckoCoin>(RANDOM_COIN_CACHE_KEY);
    if (settled) return settled;
  }
  return coin;
}

export type RandomCoinPayload = {
  coin: CoinGeckoCoin;
  details: CoinDetails;
  chart: MarketChart;
  ogImageBase64: string;
};

export async function getOrRefreshRandomCoinPayload(): Promise<RandomCoinPayload | null> {
  // Single cache key for the entire payload
  const MAIN_KEY = "random-coin-complete-v3";
  
  // Step 1: Check if we have a cached payload
  const cached = await getJSON<RandomCoinPayload>(MAIN_KEY);
  if (cached) {
    return cached;
  }

  // Step 2: Try to acquire a lock to prevent stampede
  const LOCK_KEY = `${MAIN_KEY}:lock`;
  const lockAcquired = await setWithTTLIfNotExists(LOCK_KEY, "locked", 10); // 10s lock
  
  if (!lockAcquired) {
    // Someone else is fetching, wait and retry
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    
    // Try to get the result again (recursive with max retries)
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      const result = await getJSON<RandomCoinPayload>(MAIN_KEY);
      if (result) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // If still nothing after retries, something went wrong
    return null;
  }

  // Step 3: We have the lock, fetch fresh data
  try {
    const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
    const coins = await fetchCoinsByCategory(RANDOM_COIN_CATEGORY, apiKey);
    const coin = pickRandomCoin(coins);
    if (!coin) {
      console.error("No coin picked from category");
      return null;
    }

    const [details, chart] = await Promise.all([
      fetchCoinDetails(coin.id, apiKey),
      fetchCoinMarketChart(coin.id, RANDOM_COIN_CHART_DAYS, apiKey),
    ]);

    // Generate the OG image as base64
    const { generateOgImageBase64 } = await import("@/lib/generateOgImage");
    const origin = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const fullOrigin = origin.startsWith("http") ? origin : `https://${origin}`;
    const ogImageBase64 = await generateOgImageBase64(details, chart, RANDOM_COIN_CHART_DAYS, fullOrigin);

    const payload: RandomCoinPayload = { coin, details, chart, ogImageBase64 };
    
    // Step 4: Store the payload with TTL (use regular set, not NX)
    const client = getRedisClient();
    // Upstash Redis can handle objects directly
    await client.set(MAIN_KEY, payload, { ex: RANDOM_COIN_CACHE_TTL_SECONDS });
    
    console.log(`Cached new payload for ${coin.name}, image length: ${ogImageBase64.length}`);
    return payload;
  } catch (error) {
    console.error("Error fetching/generating payload:", error);
    throw error;
  } finally {
    // Always release the lock (it will auto-expire anyway)
  }
}


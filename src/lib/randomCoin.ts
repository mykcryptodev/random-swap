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
  RANDOM_COIN_CACHE_TTL_SECONDS,
  RANDOM_COIN_CATEGORY,
  RANDOM_COIN_CHART_DAYS,
  APP_MODE,
  EXACT_COINGECKO_ID,
} from "@/lib/cache";



export type RandomCoinPayload = {
  coin: CoinGeckoCoin;
  details: CoinDetails;
  chart: MarketChart;
  ogImageBase64: string;
};

export async function getOrRefreshRandomCoinPayload(): Promise<RandomCoinPayload | null> {
  // Distinct cache keys per mode/coin to avoid collisions
  const isExact = APP_MODE === "exact" && !!EXACT_COINGECKO_ID;
  const mainKeySuffix = isExact ? `exact:${EXACT_COINGECKO_ID}` : "random";
  const MAIN_KEY = `random-coin-complete-v4:${mainKeySuffix}`;
  
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

    let coin: CoinGeckoCoin | null = null;
    let details: CoinDetails;
    let chart: MarketChart;

    if (isExact) {
      // Exact mode: fetch by specific ID
      details = await fetchCoinDetails(EXACT_COINGECKO_ID, apiKey);
      chart = await fetchCoinMarketChart(EXACT_COINGECKO_ID, RANDOM_COIN_CHART_DAYS, apiKey);
      coin = { id: details.id, symbol: details.symbol, name: details.name };
    } else {
      // Random mode: pick from category
      const coins = await fetchCoinsByCategory(RANDOM_COIN_CATEGORY, apiKey);
      coin = pickRandomCoin(coins);
      if (!coin) {
        return null;
      }
      [details, chart] = await Promise.all([
        fetchCoinDetails(coin.id, apiKey),
        fetchCoinMarketChart(coin.id, RANDOM_COIN_CHART_DAYS, apiKey),
      ]);
    }

    // Generate the OG image as base64
    const { generateOgImageBase64 } = await import("@/lib/generateOgImage");
    const origin = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const fullOrigin = origin.startsWith("http") ? origin : `https://${origin}`;
    const ogImageBase64 = await generateOgImageBase64(details, chart, RANDOM_COIN_CHART_DAYS, fullOrigin);

    const payload: RandomCoinPayload = { coin: coin!, details, chart, ogImageBase64 };
    
    // Step 4: Store the payload with TTL
    const client = getRedisClient();
    await client.set(MAIN_KEY, payload, { ex: RANDOM_COIN_CACHE_TTL_SECONDS });
    
    return payload;
  } catch (error) {
    throw error;
  } finally {
    // Lock will auto-expire
  }
}


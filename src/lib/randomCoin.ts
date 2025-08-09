import { getJSON, setWithTTLIfNotExists } from "@/lib/redis";
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
  RANDOM_COIN_PAYLOAD_CACHE_KEY,
  RANDOM_COIN_CHART_DAYS,
  RANDOM_COIN_PAYLOAD_POINTER_KEY,
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
};

export async function getOrRefreshRandomCoinPayload(): Promise<RandomCoinPayload | null> {
  const cachedPointer = await getJSON<string>(RANDOM_COIN_PAYLOAD_POINTER_KEY);
  if (cachedPointer) {
    const cached = await getJSON<RandomCoinPayload>(cachedPointer);
    if (cached) return cached;
  }

  const cached = await getJSON<RandomCoinPayload>(RANDOM_COIN_PAYLOAD_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
  const coins = await fetchCoinsByCategory(RANDOM_COIN_CATEGORY, apiKey);
  const coin = pickRandomCoin(coins);
  if (!coin) return null;

  const [details, chart] = await Promise.all([
    fetchCoinDetails(coin.id, apiKey),
    fetchCoinMarketChart(coin.id, RANDOM_COIN_CHART_DAYS, apiKey),
  ]);

  const payload: RandomCoinPayload = { coin, details, chart };
  const versionedKey = `${RANDOM_COIN_PAYLOAD_CACHE_KEY}:${Date.now()}`;
  const created = await setWithTTLIfNotExists(versionedKey, payload, RANDOM_COIN_CACHE_TTL_SECONDS);
  if (!created) {
    const settledPointer = await getJSON<string>(RANDOM_COIN_PAYLOAD_POINTER_KEY);
    if (settledPointer) {
      const settled = await getJSON<RandomCoinPayload>(settledPointer);
      if (settled) return settled;
    }
    const settled = await getJSON<RandomCoinPayload>(RANDOM_COIN_PAYLOAD_CACHE_KEY);
    if (settled) return settled;
  }
  // Publish pointer to versioned key for readers to consistently read the same payload
  await setWithTTLIfNotExists(RANDOM_COIN_PAYLOAD_POINTER_KEY, versionedKey, RANDOM_COIN_CACHE_TTL_SECONDS);
  return payload;
}


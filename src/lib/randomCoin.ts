import { getJSON, setWithTTL } from "@/lib/redis";
import { fetchCoinsByCategory, pickRandomCoin, type CoinGeckoCoin } from "@/lib/coingecko";
import { RANDOM_COIN_CACHE_KEY, RANDOM_COIN_CACHE_TTL_SECONDS, RANDOM_COIN_CATEGORY } from "@/lib/cache";

export async function getOrRefreshRandomCoin(): Promise<CoinGeckoCoin | null> {
  const cached = await getJSON<CoinGeckoCoin>(RANDOM_COIN_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.COINGECKO_DEMO_API_KEY ?? process.env.COINGECKO_API_KEY;
  const coins = await fetchCoinsByCategory(RANDOM_COIN_CATEGORY, apiKey);
  const coin = pickRandomCoin(coins);
  if (!coin) return null;

  await setWithTTL(RANDOM_COIN_CACHE_KEY, coin, RANDOM_COIN_CACHE_TTL_SECONDS);
  return coin;
}



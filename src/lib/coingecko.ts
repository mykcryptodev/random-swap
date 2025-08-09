export type CoinGeckoCoin = {
  id: string;
  symbol: string;
  name: string;
};

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

export async function fetchAllCoins(apiKey?: string): Promise<CoinGeckoCoin[]> {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (apiKey) headers["x-cg-pro-api-key"] = apiKey;

  const res = await fetch(`${COINGECKO_API_BASE}/coins/list`, {
    headers,
    // Next.js: hint it's cacheable per request but we rely on our Redis cache
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko list failed: ${res.status}`);
  }
  return (await res.json()) as CoinGeckoCoin[];
}

export function pickRandomCoin(coins: CoinGeckoCoin[]): CoinGeckoCoin | null {
  if (!coins || coins.length === 0) return null;
  const idx = Math.floor(Math.random() * coins.length);
  return coins[idx];
}



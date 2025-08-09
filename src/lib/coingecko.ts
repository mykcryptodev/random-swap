export type CoinGeckoCoin = {
  id: string;
  symbol: string;
  name: string;
};

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    // Demo key per CoinGecko docs
    headers["x-cg-demo-api-key"] = apiKey;
  }
  return headers;
}

export async function fetchAllCoins(apiKey?: string): Promise<CoinGeckoCoin[]> {
  const headers = buildHeaders(apiKey);
  const res = await fetch(`${COINGECKO_API_BASE}/coins/list`, {
    headers,
    // Next.js: hint it's cacheable per request but we rely on our Redis cache
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko list failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
  }
  return (await res.json()) as CoinGeckoCoin[];
}

export function pickRandomCoin(coins: CoinGeckoCoin[]): CoinGeckoCoin | null {
  if (!coins || coins.length === 0) return null;
  const idx = Math.floor(Math.random() * coins.length);
  return coins[idx];
}

// Minimal shape from /coins/markets for category filtering
type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
};

/**
 * Fetch coins by a CoinGecko category slug using /coins/markets.
 * This returns up to 250 items (first page) to keep latency reasonable.
 */
export async function fetchCoinsByCategory(
  category: string,
  apiKey?: string
): Promise<CoinGeckoCoin[]> {
  const headers = buildHeaders(apiKey);

  const params = new URLSearchParams({
    vs_currency: "usd",
    category,
    order: "market_cap_desc",
    per_page: "250",
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const res = await fetch(`${COINGECKO_API_BASE}/coins/markets?${params.toString()}`, {
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko markets failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
  }
  const list = (await res.json()) as MarketCoin[];
  return list.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }));
}



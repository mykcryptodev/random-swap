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

function withDemoKeyQuery(url: string, apiKey?: string): string {
  if (!apiKey) return url;
  const u = new URL(url);
  // Also attach query param fallback for environments that strip custom headers
  if (!u.searchParams.has("x_cg_demo_api_key")) {
    u.searchParams.set("x_cg_demo_api_key", apiKey);
  }
  return u.toString();
}

export async function fetchAllCoins(apiKey?: string): Promise<CoinGeckoCoin[]> {
  const headers = buildHeaders(apiKey);
  const res = await fetch(withDemoKeyQuery(`${COINGECKO_API_BASE}/coins/list`, apiKey), {
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

  const res = await fetch(
    withDemoKeyQuery(`${COINGECKO_API_BASE}/coins/markets?${params.toString()}`, apiKey),
    {
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko markets failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
  }
  const list = (await res.json()) as MarketCoin[];
  return list.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }));
}

// Coin detail subset
export type CoinDetails = {
  id: string;
  symbol: string;
  name: string;
  image: { thumb?: string; small?: string; large?: string };
  market_data?: {
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
  };
};

export async function fetchCoinDetails(id: string, apiKey?: string): Promise<CoinDetails> {
  const headers = buildHeaders(apiKey);
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "true",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  });
  const res = await fetch(
    withDemoKeyQuery(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(id)}?${params.toString()}`,
      apiKey
    ),
    {
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CoinGecko coin details failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`);
  }
  return (await res.json()) as CoinDetails;
}

export type MarketChart = {
  prices: [number, number][]; // [timestamp, price]
};

export async function fetchCoinMarketChart(
  id: string,
  days: number,
  apiKey?: string
): Promise<MarketChart> {
  const headers = buildHeaders(apiKey);
  const params = new URLSearchParams({
    vs_currency: "usd",
    days: String(days),
    interval: days <= 1 ? "hourly" : "daily",
  });
  const res = await fetch(
    withDemoKeyQuery(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(id)}/market_chart?${params.toString()}`,
      apiKey
    ),
    {
      headers,
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `CoinGecko market_chart failed: ${res.status} ${res.statusText} - ${text.slice(0, 200)}`
    );
  }
  const json = (await res.json()) as MarketChart;
  return json;
}



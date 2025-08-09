// Cache configuration constants
export const RANDOM_COIN_CACHE_TTL_SECONDS = 60; // 1 minute cache
export const RANDOM_COIN_CATEGORY = "base-meme-coins"; // CoinGecko category slug
export const RANDOM_COIN_CHART_DAYS = 30;

// App mode configuration
export type AppMode = "random" | "exact";

// Set the application to exact mode and target a specific CoinGecko token ID
export const APP_MODE: AppMode = "exact";
export const EXACT_COINGECKO_ID = "higher";



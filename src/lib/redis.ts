import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars are required to use Upstash Redis"
    );
  }

  redis = new Redis({
    url,
    token,
  });

  return redis;
}

export async function setWithTTL<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedisClient();
  // Upstash Redis can handle objects directly
  await client.set(key, value, { ex: ttlSeconds });
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  // Upstash Redis automatically handles JSON serialization/deserialization
  const data = await client.get<T>(key);
  return data;
}

export async function setWithTTLIfNotExists<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<boolean> {
  const client = getRedisClient();
  // Upstash Redis can handle objects directly
  const res = await client.set(key, value, { ex: ttlSeconds, nx: true });
  return res === "OK";
}



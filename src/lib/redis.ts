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
  await client.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const raw = await client.get<string | null>(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}



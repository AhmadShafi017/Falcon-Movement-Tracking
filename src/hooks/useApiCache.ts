// Simple in-memory fetch cache to prevent duplicate API calls
const fetchCache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_TTL = 300000; // 5 minutes (increased from 15s - scheduled cache handles freshness)

export async function cachedFetch<T = any>(
  url: string,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = fetchCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  
  fetchCache.set(url, { data, timestamp: Date.now() });
  return data as T;
}

export function invalidateCache(prefix?: string) {
  if (prefix) {
    for (const key of fetchCache.keys()) {
      if (key.includes(prefix)) fetchCache.delete(key);
    }
  } else {
    fetchCache.clear();
  }
}

/**
 * Pre-populate the cache with data for a given URL.
 * Used by the scheduled cache system to warm the cache before UI requests it.
 */
export function setCacheEntry(url: string, data: any) {
  fetchCache.set(url, { data, timestamp: Date.now() });
}

/**
 * Check if a URL is currently in cache and still fresh.
 */
export function hasCacheEntry(url: string, ttl: number = DEFAULT_TTL): boolean {
  const cached = fetchCache.get(url);
  return !!(cached && Date.now() - cached.timestamp < ttl);
}

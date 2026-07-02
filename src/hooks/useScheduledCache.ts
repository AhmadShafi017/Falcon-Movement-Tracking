/**
 * Scheduled Cache System
 * 
 * Database updates happen at :19 and :49 minutes of every hour.
 * This scheduler pre-fetches fresh data at :25 and :55 minutes
 * (6 minutes after DB updates complete) so the app always has
 * warm cache ready for instant user experience.
 */

import { useEffect, useRef, useCallback } from 'react';
import { invalidateCache, setCacheEntry } from './useApiCache';

// Target minutes in each hour for cache refresh
const CACHE_MINUTES = [25, 55];

// Known API endpoints that should be pre-warmed
// /api/employees: employee hierarchy rarely changes, cached for instant search
// /api/all-latest-locations: live tracking data, refresh after DB updates
const ENDPOINTS_TO_PREWARM = [
  '/api/all-latest-locations',
  '/api/employees',
];

/**
 * Calculate milliseconds until the next cache target time
 */
function getMsUntilNextTarget(): number {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();
  const currentMs = now.getMilliseconds();

  // Find the next target minute
  let nextTargetMinute: number | null = null;
  for (const targetMin of CACHE_MINUTES) {
    if (targetMin > currentMinute || (targetMin === currentMinute && currentSecond === 0 && currentMs === 0)) {
      nextTargetMinute = targetMin;
      break;
    }
  }

  // If no target found in remaining minutes, schedule for first target of next hour
  if (nextTargetMinute === null) {
    nextTargetMinute = CACHE_MINUTES[0] + 60; // next hour's first target
  }

  const targetDate = new Date(now);
  targetDate.setHours(now.getHours(), nextTargetMinute, 0, 0);

  // If we wrapped to the next hour (e.g., targetMinute was 55 but we're past 55)
  if (nextTargetMinute! >= 60) {
    targetDate.setHours(now.getHours() + 1, nextTargetMinute! - 60, 0, 0);
  }

  const diff = targetDate.getTime() - now.getTime();
  return diff > 0 ? diff : 60000; // fallback to 1 minute if calculation goes negative
}

/**
 * Hook that schedules cache prewarming at :25 and :55 past each hour.
 * When triggered, it invalidates the cache for known endpoints and
 * pre-fetches fresh data so subsequent UI reads are instant.
 */
export function useScheduledCache() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleNext = useCallback(() => {
    const msUntilNext = getMsUntilNextTarget();
    console.log(`[CacheScheduler] Next cache prewarm in ${Math.round(msUntilNext / 1000)}s (${new Date(Date.now() + msUntilNext).toLocaleTimeString()})`);

    timerRef.current = setTimeout(async () => {
      console.log('[CacheScheduler] Triggering cache prewarm...');

      // Invalidate the all-latest-locations cache
      invalidateCache('/api/all-latest-locations');

      // Pre-fetch the fresh data and store in our in-memory cache
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Pre-warm /api/all-latest-locations (live tracking data)
        const allLocUrl = `/api/all-latest-locations?date=${today}`;
        const locRes = await fetch(allLocUrl);
        if (locRes.ok) {
          const locData = await locRes.json();
          setCacheEntry(allLocUrl, locData);
          console.log('[CacheScheduler] Prewarm complete - /api/all-latest-locations cached');
        }

        // Pre-warm /api/employees (hierarchy for instant search)
        const empUrl = `/api/employees`;
        const empRes = await fetch(empUrl);
        if (empRes.ok) {
          const empData = await empRes.json();
          setCacheEntry(empUrl, empData);
          console.log('[CacheScheduler] Prewarm complete - /api/employees cached');
        }
      } catch (err) {
        console.warn('[CacheScheduler] Prewarm fetch failed:', err);
      }

      // Schedule the next refresh
      scheduleNext();
    }, msUntilNext);
  }, []);

  useEffect(() => {
    // Start the scheduled cache cycle
    scheduleNext();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scheduleNext]);
}
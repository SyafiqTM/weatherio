/**
 * Cached fetch utility — stores API responses in localStorage.
 *
 * On a fresh load the cache is served immediately if still within TTL.
 * On a network/server error a stale entry is used as a fallback so the
 * UI never shows an empty screen just because the backend is temporarily
 * unreachable.
 *
 * Returns an object with the same interface the rest of the app already
 * expects from a fetch Response:  { ok, status, json() }
 *
 * TTLs (suggested):
 *   weather (current):  10 * 60   = 600 s
 *   hourly forecast:    30 * 60   = 1 800 s
 *   daily forecast:     60 * 60   = 3 600 s
 *   city list:          24 * 60 * 60 = 86 400 s
 */

const PREFIX = "apicache_";

function _cacheKey(url) {
  return PREFIX + url;
}

function _readCache(url) {
  try {
    const raw = localStorage.getItem(_cacheKey(url));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function _writeCache(url, data) {
  try {
    localStorage.setItem(_cacheKey(url), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage quota — silently ignore */
  }
}

function _makeResponse(data) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

/**
 * @param {string} url          The endpoint URL.
 * @param {number} ttlSeconds   How long the cached entry is considered fresh.
 * @returns {Promise<{ok, status, json}>}
 */
export async function cachedFetch(url, ttlSeconds) {
  const now = Date.now();
  const cached = _readCache(url);

  // Serve immediately if still fresh.
  if (cached && now - cached.ts < ttlSeconds * 1000) {
    return _makeResponse(cached.data);
  }

  try {
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      _writeCache(url, data);
      return _makeResponse(data);
    }

    // Server returned an error — serve stale cache rather than breaking the UI.
    if (cached) {
      console.warn(`[apiCache] Server returned ${res.status} for "${url}" — serving stale cache.`);
      return _makeResponse(cached.data);
    }

    // No cache at all; let the caller handle the error response normally.
    return res;
  } catch (networkErr) {
    // Network failure — fall back to stale cache if available.
    if (cached) {
      console.warn(`[apiCache] Network error for "${url}" — serving stale cache.`);
      return _makeResponse(cached.data);
    }
    throw networkErr;
  }
}

/**
 * Forcibly evict a cached entry so the next call always hits the network.
 * @param {string} url
 */
export function invalidateCache(url) {
  try {
    localStorage.removeItem(_cacheKey(url));
  } catch { /* ignore */ }
}

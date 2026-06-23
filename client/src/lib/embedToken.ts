// Short-lived, read-only token for loading reports inside iframes.
//
// Report iframes (and the live-data fetches they make) must pass their auth via
// the URL, which can leak through browser history, referrer headers, and server
// access logs. To keep the blast radius small we never put the long-lived
// session JWT there — instead we mint a short-lived, scope-limited "embed" token
// that can only read report html/data and expires in ~30 minutes.

let cachedToken: string | null = null;
let expiresAt = 0;
let inflight: Promise<string | null> | null = null;

/** Return a still-valid cached embed token, or null if none/near-expiry. */
export function getCachedEmbedToken(): string | null {
  if (cachedToken && Date.now() < expiresAt - 60_000) return cachedToken;
  return null;
}

/** Drop the cached embed token (e.g. on logout / 401). */
export function clearEmbedToken(): void {
  cachedToken = null;
  expiresAt = 0;
}

/**
 * Fetch (or reuse) an embed token. Concurrent callers share a single request.
 * Returns null on failure so callers can fall back to the session token.
 */
export async function fetchEmbedToken(): Promise<string | null> {
  const valid = getCachedEmbedToken();
  if (valid) return valid;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const session = localStorage.getItem('token') || '';
      const res = await fetch('/api/embed-token', {
        headers: { Authorization: `Bearer ${session}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      cachedToken = data.token as string;
      expiresAt = Date.now() + (data.expires_in ?? 1800) * 1000;
      return cachedToken;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

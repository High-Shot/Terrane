// First-party analytics beacons — no third-party scripts, no extra cookies.
// Events POST to our own backend (`POST /api/events`) tagged with the same
// anonymous client id the rest of the app already uses. Every call is
// fire-and-forget and silent-fail: if the backend is missing, blocked, or
// slow, the app never notices and nothing is thrown or logged loudly.
import { API, getClientId } from './api';

/**
 * track(name, props) — send one analytics event.
 * Allowed names (backend contract): pageview, studio_opened, place_searched,
 * build_request_submitted, export_download.
 *
 * Prefers navigator.sendBeacon (survives page unloads, never blocks the UI);
 * falls back to a keepalive fetch. Never throws.
 */
export function track(name, props = {}) {
  try {
    const url = `${API}/events`;
    const body = JSON.stringify({
      name,
      path: window.location.pathname,
      props,
      client_id: getClientId(),
    });

    let queued = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        queued = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } catch {
        queued = false; // some browsers throw on cross-origin beacons — fall through
      }
    }

    if (!queued) {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    }
  } catch (err) {
    // Analytics must never break the product. Quietest possible trace.
    try { console.debug('[analytics] event dropped:', err); } catch { /* noop */ }
  }
}

/** trackPageview() — record a pageview for the current path. */
export function trackPageview() {
  track('pageview');
}

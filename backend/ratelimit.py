"""In-process sliding-window rate limiting.

Deliberately dependency-free and in-memory. The deployed stack (docker-compose)
runs a single uvicorn process with no ``--workers``, so one process holds the
whole picture. If the backend is ever scaled to multiple processes or replicas,
each one keeps its own counters and the effective limit multiplies — at that
point this needs to move behind a shared store (Redis) instead.

Counters are per-key deques of monotonic timestamps. Keys are swept lazily so a
burst of one-off client IPs does not grow the table forever.
"""

import os
import threading
import time
from collections import deque
from typing import Optional

from fastapi import HTTPException, Request

# Cloudflare sets CF-Connecting-IP to the true client address and strips any
# copy the caller sent, so behind Cloudflare it needs no counting and no
# configuration. Every deployment path in DEPLOY.md / LAPTOP-SETUP.md puts
# Cloudflare in front (the SameSite=None auth cookies require its HTTPS), so
# this is on by default and the X-Forwarded-For arithmetic below is the
# fallback rather than the main path.
#
# Turn it OFF for any origin reachable without going through Cloudflare —
# there, nothing strips the header and a caller can forge it to get a fresh
# quota per request.
TRUST_CF_CONNECTING_IP = os.environ.get("TRUST_CF_CONNECTING_IP", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)

# Fallback when CF-Connecting-IP is absent: how many trusted proxies sit in
# front, used to pick the real client out of X-Forwarded-For. The bare
# docker-compose stack is client -> nginx, so 1.
TRUSTED_PROXY_COUNT = int(os.environ.get("TRUSTED_PROXY_COUNT", "1").strip() or "1")

# Escape hatch for load tests and local debugging. Never set this in production.
RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT_ENABLED", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)

_SWEEP_INTERVAL_S = 300.0


def client_ip(request: Request) -> str:
    """Best-effort client IP.

    Prefers CF-Connecting-IP, which Cloudflare overwrites on every request, so
    the deployed stack needs no proxy counting at all. Falls back to counting
    X-Forwarded-For hops: it grows left-to-right as it crosses proxies, so with
    N trusted hops the client is the entry N positions from the right. Anything
    further left was supplied by the caller and must not be trusted — otherwise
    a spoofed header sidesteps the limiter entirely.
    """
    if TRUST_CF_CONNECTING_IP:
        cf_ip = request.headers.get("cf-connecting-ip", "").strip()
        if cf_ip:
            return cf_ip

    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [p.strip() for p in forwarded.split(",") if p.strip()]
    if parts:
        idx = max(0, len(parts) - TRUSTED_PROXY_COUNT)
        if idx < len(parts):
            return parts[idx]
    return request.client.host if request.client else "unknown"


class SlidingWindowLimiter:
    """Fixed-capacity sliding window: at most `limit` hits per `window_s` per key."""

    def __init__(self) -> None:
        self._hits: dict[str, deque] = {}
        self._lock = threading.Lock()
        self._last_sweep = time.monotonic()

    def hit(self, key: str, limit: int, window_s: float) -> Optional[int]:
        """Record an attempt. Returns None if allowed, else seconds to wait."""
        now = time.monotonic()
        with self._lock:
            self._maybe_sweep(now, window_s)
            bucket = self._hits.get(key)
            if bucket is None:
                bucket = self._hits[key] = deque()
            cutoff = now - window_s
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                # The window frees up when the oldest hit in it expires.
                return max(1, int(bucket[0] + window_s - now) + 1)
            bucket.append(now)
            return None

    def reset(self) -> None:
        """Drop all counters. For tests."""
        with self._lock:
            self._hits.clear()
            self._last_sweep = time.monotonic()

    def _maybe_sweep(self, now: float, window_s: float) -> None:
        if now - self._last_sweep < _SWEEP_INTERVAL_S:
            return
        self._last_sweep = now
        # A bucket whose newest hit is older than its window can never block.
        stale = [k for k, b in self._hits.items() if not b or b[-1] <= now - window_s]
        for k in stale:
            del self._hits[k]


limiter = SlidingWindowLimiter()


def rate_limit(name: str, limit: int, window_s: float):
    """FastAPI dependency enforcing `limit` requests per `window_s` per client IP."""

    async def dependency(request: Request) -> None:
        if not RATE_LIMIT_ENABLED:
            return
        retry_after = limiter.hit(f"{name}:{client_ip(request)}", limit, window_s)
        if retry_after is not None:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment and try again.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency


def enforce(name: str, key: str, limit: int, window_s: float) -> None:
    """Imperative check for limits keyed on request *content* (e.g. an email
    address) rather than the caller's IP. Raises 429 the same way."""
    if not RATE_LIMIT_ENABLED:
        return
    retry_after = limiter.hit(f"{name}:{key}", limit, window_s)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts for this account. Please wait and try again.",
            headers={"Retry-After": str(retry_after)},
        )

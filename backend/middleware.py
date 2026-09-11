"""
Rate limiting middleware for Terrane backend.
Prevents brute-force attacks on auth, contact, and upload endpoints.
"""

import asyncio
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from fastapi import Request, HTTPException, status


class RateLimiter:
    """Simple in-memory rate limiter using token bucket algorithm."""

    def __init__(self, max_requests: int, window_seconds: int):
        """
        Args:
            max_requests: Max requests allowed per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()

    async def check(self, key: str) -> bool:
        """
        Check if request is within rate limit.

        Args:
            key: Identifier (e.g., IP address, user_id)

        Returns:
            True if allowed, False if rate limited

        Raises:
            HTTPException: If rate limit exceeded
        """
        async with self.lock:
            now = time.time()
            cutoff = now - self.window_seconds

            # Clean old requests
            if key in self.requests:
                self.requests[key] = [
                    req_time for req_time in self.requests[key]
                    if req_time > cutoff
                ]

            # Check limit
            if len(self.requests[key]) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Try again later.",
                )

            # Record this request
            self.requests[key].append(now)
            return True


# Rate limiters for different endpoints
# (max_requests, window_seconds)
LIMITERS = {
    "login": RateLimiter(max_requests=5, window_seconds=300),  # 5 per 5 min
    "register": RateLimiter(max_requests=3, window_seconds=3600),  # 3 per hour
    "contact": RateLimiter(max_requests=10, window_seconds=3600),  # 10 per hour
    "events": RateLimiter(max_requests=100, window_seconds=60),  # 100 per min
    "upload": RateLimiter(max_requests=20, window_seconds=3600),  # 20 per hour
}


def get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For for proxies."""
    if forwarded := request.headers.get("x-forwarded-for"):
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit_middleware(endpoint_key: str, request: Request) -> None:
    """
    Middleware function to apply rate limiting.

    Usage in route:
        @router.post("/login")
        async def login(req: Request, ...):
            await rate_limit_middleware("login", req)
            ...
    """
    if endpoint_key not in LIMITERS:
        raise ValueError(f"Unknown endpoint key: {endpoint_key}")

    client_ip = get_client_ip(request)
    await LIMITERS[endpoint_key].check(client_ip)


async def cleanup_old_requests():
    """Periodically clean up old request records to prevent memory leak."""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        now = time.time()
        cutoff = now - 24 * 3600  # Keep 24 hours of history

        for limiter in LIMITERS.values():
            async with limiter.lock:
                for key in list(limiter.requests.keys()):
                    limiter.requests[key] = [
                        req_time for req_time in limiter.requests[key]
                        if req_time > cutoff
                    ]
                    if not limiter.requests[key]:
                        del limiter.requests[key]

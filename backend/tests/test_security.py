"""Tests for the rate limiter and the payment-capture guards.

Self-contained: the Mongo env vars are set before importing server so the module
imports without a live database (motor does not connect at construction time).
"""

import os
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "terrane_test")

from fastapi import HTTPException  # noqa: E402

import ratelimit  # noqa: E402
from server import _order_caller_is_buyer, _paypal_capture_total  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_limiter():
    ratelimit.limiter.reset()
    yield
    ratelimit.limiter.reset()


# ----------------------------- Rate limiter -----------------------------
def test_allows_up_to_the_limit_then_blocks():
    for _ in range(3):
        assert ratelimit.limiter.hit("k", 3, 60) is None
    assert ratelimit.limiter.hit("k", 3, 60) is not None


def test_retry_after_is_a_positive_whole_number_of_seconds():
    ratelimit.limiter.hit("k", 1, 60)
    retry_after = ratelimit.limiter.hit("k", 1, 60)
    assert isinstance(retry_after, int)
    assert 1 <= retry_after <= 61


def test_keys_are_counted_independently():
    assert ratelimit.limiter.hit("a", 1, 60) is None
    assert ratelimit.limiter.hit("b", 1, 60) is None
    assert ratelimit.limiter.hit("a", 1, 60) is not None


def test_window_slides_so_old_hits_stop_counting():
    assert ratelimit.limiter.hit("k", 1, 0.05) is None
    assert ratelimit.limiter.hit("k", 1, 0.05) is not None
    time.sleep(0.08)
    assert ratelimit.limiter.hit("k", 1, 0.05) is None


def test_enforce_raises_429_with_retry_after_header():
    ratelimit.enforce("login_email", "a@b.com", 1, 60)
    with pytest.raises(HTTPException) as exc:
        ratelimit.enforce("login_email", "a@b.com", 1, 60)
    assert exc.value.status_code == 429
    assert int(exc.value.headers["Retry-After"]) >= 1


class _Req:
    def __init__(self, xff=None, cf=None):
        self.headers = {}
        if xff is not None:
            self.headers["x-forwarded-for"] = xff
        if cf is not None:
            self.headers["cf-connecting-ip"] = cf
        self.client = type("C", (), {"host": "10.0.0.1"})()


def test_cf_connecting_ip_wins_and_needs_no_proxy_counting(monkeypatch):
    """The deployed path: Cloudflare overwrites this header, so no config."""
    monkeypatch.setattr(ratelimit, "TRUST_CF_CONNECTING_IP", True)
    # Whatever X-Forwarded-For says, and whatever the hop count is set to.
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 1)
    assert ratelimit.client_ip(_Req(xff="1.2.3.4, 5.6.7.8", cf="203.0.113.7")) == "203.0.113.7"
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 9)
    assert ratelimit.client_ip(_Req(xff="1.2.3.4, 5.6.7.8", cf="203.0.113.7")) == "203.0.113.7"


def test_cf_header_is_ignored_when_not_behind_cloudflare(monkeypatch):
    """Off, a forged CF-Connecting-IP must not buy a fresh quota per request."""
    monkeypatch.setattr(ratelimit, "TRUST_CF_CONNECTING_IP", False)
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 1)
    assert ratelimit.client_ip(_Req(xff="203.0.113.9", cf="1.1.1.1")) == "203.0.113.9"


def test_falls_back_to_xff_when_cf_header_is_absent(monkeypatch):
    monkeypatch.setattr(ratelimit, "TRUST_CF_CONNECTING_IP", True)
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 1)
    assert ratelimit.client_ip(_Req(xff="203.0.113.9")) == "203.0.113.9"


def test_client_ip_skips_exactly_the_trusted_hops(monkeypatch):
    monkeypatch.setattr(ratelimit, "TRUST_CF_CONNECTING_IP", False)
    # One trusted proxy (nginx only): the single entry is the real client.
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 1)
    assert ratelimit.client_ip(_Req("203.0.113.9")) == "203.0.113.9"
    # A spoofed entry prepended by the caller must not be believed.
    assert ratelimit.client_ip(_Req("1.2.3.4, 203.0.113.9")) == "203.0.113.9"
    # Two trusted proxies (Cloudflare then nginx): skip both.
    monkeypatch.setattr(ratelimit, "TRUSTED_PROXY_COUNT", 2)
    assert ratelimit.client_ip(_Req("203.0.113.9, 172.16.0.5")) == "203.0.113.9"


def test_client_ip_falls_back_to_the_socket_peer():
    assert ratelimit.client_ip(_Req()) == "10.0.0.1"


# ----------------------------- Capture amount -----------------------------
def _capture_response(*values, currency="USD", status="COMPLETED"):
    return {
        "status": "COMPLETED",
        "purchase_units": [{
            "payments": {"captures": [
                {"status": status, "amount": {"currency_code": currency, "value": v}} for v in values
            ]}
        }],
    }


def test_capture_total_sums_completed_captures():
    assert _paypal_capture_total(_capture_response("249.00")) == (249.00, "USD")
    assert _paypal_capture_total(_capture_response("200.00", "49.00")) == (249.00, "USD")


def test_capture_total_ignores_captures_that_did_not_complete():
    assert _paypal_capture_total(_capture_response("249.00", status="DECLINED")) == (0.0, None)


def test_capture_total_is_zero_when_paypal_returns_nothing():
    assert _paypal_capture_total({}) == (0.0, None)
    assert _paypal_capture_total({"purchase_units": [{}]}) == (0.0, None)


def test_capture_total_rejects_mixed_currencies():
    pp = {"purchase_units": [{"payments": {"captures": [
        {"status": "COMPLETED", "amount": {"currency_code": "USD", "value": "10.00"}},
        {"status": "COMPLETED", "amount": {"currency_code": "EUR", "value": "10.00"}},
    ]}}]}
    with pytest.raises(ValueError):
        _paypal_capture_total(pp)


# ----------------------------- Capture ownership -----------------------------
def test_guest_buyer_matches_on_client_id():
    order = {"client_id": "c-1"}
    assert _order_caller_is_buyer(order, None, "c-1") is True
    assert _order_caller_is_buyer(order, None, "c-2") is False
    assert _order_caller_is_buyer(order, None, None) is False


def test_signed_in_buyer_matches_on_user_id():
    order = {"client_id": "c-1", "user_id": "u-1"}
    assert _order_caller_is_buyer(order, {"id": "u-1"}, None) is True
    assert _order_caller_is_buyer(order, {"id": "u-2"}, None) is False
    # A different signed-in user still can't capture via the guest path.
    assert _order_caller_is_buyer(order, {"id": "u-2"}, "c-2") is False


def test_order_with_no_owner_recorded_is_never_capturable():
    assert _order_caller_is_buyer({}, None, None) is False
    assert _order_caller_is_buyer({"client_id": ""}, None, "") is False

"""End-to-end checks on POST /api/orders/{id}/capture.

Runs the real route through FastAPI's TestClient against a minimal fake Mongo
collection and a stubbed PayPal, so the guards are exercised as wired rather
than as isolated helpers.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "terrane_test")

import server  # noqa: E402


class _FakeOrders:
    def __init__(self, order):
        self.order = order

    async def find_one(self, q):
        return dict(self.order) if self.order and self.order["id"] == q.get("id") else None

    async def update_one(self, q, update):
        self.order.update(update["$set"])


class _FakeDB:
    def __init__(self, order):
        self.orders = _FakeOrders(order)


def _order(**overrides):
    base = {
        "id": "ord-1",
        "client_id": "c-1",
        "amount": 249.00,
        "currency": "USD",
        "status": "pending",
        "demo": False,
        "paypal_order_id": "PP-REAL",
    }
    base.update(overrides)
    return base


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(server, "PAYPAL_ENABLED", True)

    async def _no_hooks(order):
        hooks_ran.append(order["id"])

    monkeypatch.setattr(server, "_post_capture_hooks", _no_hooks)
    return TestClient(server.app)


hooks_ran = []


@pytest.fixture(autouse=True)
def _reset_hooks():
    hooks_ran.clear()


def _stub_paypal(monkeypatch, value="249.00", currency="USD", status="COMPLETED"):
    """Stub the two outbound PayPal calls the capture path makes."""
    captured_url = {}

    async def _token():
        return "tok"

    monkeypatch.setattr(server, "paypal_token", _token)

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "status": status,
                "purchase_units": [{"payments": {"captures": [
                    {"status": "COMPLETED", "amount": {"currency_code": currency, "value": value}}
                ]}}],
            }

    class _Client:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, **kw):
            captured_url["url"] = url
            return _Resp()

    monkeypatch.setattr(server.httpx, "AsyncClient", _Client)
    return captured_url


def test_happy_path_captures_and_runs_fulfillment(monkeypatch, client):
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))
    urls = _stub_paypal(monkeypatch)

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-REAL", "client_id": "c-1"})

    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    assert order["status"] == "paid"
    assert order["captured_amount"] == 249.00
    assert hooks_ran == ["ord-1"]
    assert "PP-REAL" in urls["url"]


def test_capture_from_a_stranger_is_refused(monkeypatch, client):
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))
    _stub_paypal(monkeypatch)

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-REAL", "client_id": "someone-else"})

    assert r.status_code == 403
    assert order["status"] == "pending"
    assert hooks_ran == []


def test_attacker_supplied_paypal_order_id_is_rejected(monkeypatch, client):
    """The core hole: a caller pointing this order at a PayPal order of their own."""
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))
    urls = _stub_paypal(monkeypatch)

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-CHEAP", "client_id": "c-1"})

    assert r.status_code == 400
    assert order["status"] == "pending"
    assert urls == {}, "PayPal must not be called at all on a mismatch"
    assert hooks_ran == []


def test_underpayment_is_held_for_review_not_fulfilled(monkeypatch, client):
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))
    _stub_paypal(monkeypatch, value="1.00")

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-REAL", "client_id": "c-1"})

    assert r.status_code == 409
    assert order["status"] == "review"
    assert order["captured_amount"] == 1.00
    assert hooks_ran == [], "fulfillment must not run on an amount mismatch"


def test_wrong_currency_is_held_for_review(monkeypatch, client):
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))
    _stub_paypal(monkeypatch, currency="EUR")

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-REAL", "client_id": "c-1"})

    assert r.status_code == 409
    assert order["status"] == "review"
    assert hooks_ran == []


def test_recapture_is_idempotent(monkeypatch, client):
    order = _order(status="paid")
    monkeypatch.setattr(server, "db", _FakeDB(order))
    _stub_paypal(monkeypatch)

    r = client.post("/api/orders/ord-1/capture", json={"paypal_order_id": "PP-REAL", "client_id": "c-1"})

    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    assert hooks_ran == [], "hooks must not re-run for an already-paid order"


def test_real_order_is_not_captured_when_paypal_config_disappears(monkeypatch, client):
    monkeypatch.setattr(server, "PAYPAL_ENABLED", False)
    order = _order()
    monkeypatch.setattr(server, "db", _FakeDB(order))

    r = client.post("/api/orders/ord-1/capture", json={"client_id": "c-1"})

    assert r.status_code == 503
    assert order["status"] == "pending", "an unpaid order must never be marked captured"
    assert hooks_ran == []


def test_demo_order_needs_demo_checkout_enabled(monkeypatch, client):
    monkeypatch.setattr(server, "ALLOW_DEMO_CHECKOUT", False)
    order = _order(demo=True, paypal_order_id=None)
    monkeypatch.setattr(server, "db", _FakeDB(order))

    r = client.post("/api/orders/ord-1/capture", json={"client_id": "c-1"})

    assert r.status_code == 409
    assert order["status"] == "pending"
    assert hooks_ran == []


def test_demo_order_captures_when_demo_checkout_is_enabled(monkeypatch, client):
    monkeypatch.setattr(server, "ALLOW_DEMO_CHECKOUT", True)
    order = _order(demo=True, paypal_order_id=None)
    monkeypatch.setattr(server, "db", _FakeDB(order))

    r = client.post("/api/orders/ord-1/capture", json={"client_id": "c-1"})

    assert r.status_code == 200
    assert order["status"] == "captured"
    assert hooks_ran == ["ord-1"]


def test_missing_order_is_404(monkeypatch, client):
    monkeypatch.setattr(server, "db", _FakeDB(_order()))
    r = client.post("/api/orders/nope/capture", json={"client_id": "c-1"})
    assert r.status_code == 404

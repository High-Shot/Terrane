"""Confirms the limiter is actually wired onto the public endpoints.

The unit tests in test_security.py prove the window logic; these prove the
dependency is attached and that a 429 comes back with a Retry-After header.
"""

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "terrane_test")

import ratelimit  # noqa: E402
import server  # noqa: E402


class _FakeCollection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, doc):
        self.docs.append(doc)

    async def find_one(self, q):
        return None


class _FakeDB:
    def __init__(self):
        self.events = _FakeCollection()
        self.users = _FakeCollection()
        self.contacts = _FakeCollection()


@pytest.fixture(autouse=True)
def _clean():
    ratelimit.limiter.reset()
    yield
    ratelimit.limiter.reset()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(server, "db", _FakeDB())
    return TestClient(server.app)


def test_events_beacon_429s_past_its_window(client):
    limit, _ = server.RL_EVENTS
    body = {"name": "pageview", "path": "/"}
    for i in range(limit):
        assert client.post("/api/events", json=body).status_code == 200, f"request {i} should pass"
    r = client.post("/api/events", json=body)
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) >= 1


def test_login_429s_before_the_ip_limit_is_reached_per_account(client):
    """The per-email limit is tighter than the per-IP one, so it trips first."""
    email_limit, _ = server.RL_LOGIN_EMAIL
    body = {"email": "victim@example.com", "password": "guess"}
    for _ in range(email_limit):
        assert client.post("/api/auth/login", json=body).status_code == 401
    assert client.post("/api/auth/login", json=body).status_code == 429


def test_login_limit_for_one_account_does_not_lock_out_another(client):
    email_limit, _ = server.RL_LOGIN_EMAIL
    for _ in range(email_limit):
        client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"})
    # Different account, same IP: still under the (looser) per-IP limit.
    assert client.post("/api/auth/login", json={"email": "b@example.com", "password": "x"}).status_code == 401


def test_register_is_limited(client):
    limit, _ = server.RL_REGISTER
    for i in range(limit):
        r = client.post("/api/auth/register", json={"email": f"u{i}@example.com", "password": "hunter2", "name": "U"})
        assert r.status_code == 200, r.text
    r = client.post("/api/auth/register", json={"email": "last@example.com", "password": "hunter2", "name": "U"})
    assert r.status_code == 429


def test_contact_is_limited(client):
    limit, _ = server.RL_CONTACT
    body = {"name": "A", "email": "a@example.com", "message": "hello"}
    for _ in range(limit):
        assert client.post("/api/contact", json=body).status_code == 200
    assert client.post("/api/contact", json=body).status_code == 429


def test_limits_are_per_client_ip(client):
    limit, _ = server.RL_CONTACT
    body = {"name": "A", "email": "a@example.com", "message": "hello"}
    for _ in range(limit):
        client.post("/api/contact", json=body, headers={"X-Forwarded-For": "203.0.113.1"})
    assert client.post("/api/contact", json=body, headers={"X-Forwarded-For": "203.0.113.1"}).status_code == 429
    # A genuinely different visitor is unaffected.
    assert client.post("/api/contact", json=body, headers={"X-Forwarded-For": "203.0.113.2"}).status_code == 200

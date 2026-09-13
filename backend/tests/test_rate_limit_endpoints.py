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


def test_login_is_limited_per_ip(client):
    limit, _ = server.RL_LOGIN_IP
    for i in range(limit):
        r = client.post("/api/auth/login", json={"email": f"u{i}@example.com", "password": "guess"})
        assert r.status_code == 401, f"request {i} should reach the handler"
    assert client.post("/api/auth/login", json={"email": "next@example.com", "password": "x"}).status_code == 429


def test_login_is_limited_per_email_across_different_ips(client):
    """What the per-IP limit alone misses: one inbox ground from many hosts."""
    email_limit, _ = server.RL_LOGIN_EMAIL
    body = {"email": "victim@example.com", "password": "guess"}
    for i in range(email_limit):
        r = client.post("/api/auth/login", json=body, headers={"X-Forwarded-For": f"203.0.113.{i}"})
        assert r.status_code == 401, f"request {i} should reach the handler"
    # A fresh IP, so the per-IP limiter is untouched — the per-email one stops it.
    r = client.post("/api/auth/login", json=body, headers={"X-Forwarded-For": "203.0.113.99"})
    assert r.status_code == 429


def test_one_account_being_limited_does_not_lock_out_another(client):
    email_limit, _ = server.RL_LOGIN_EMAIL
    for i in range(email_limit + 1):
        client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"},
                    headers={"X-Forwarded-For": f"198.51.100.{i}"})
    r = client.post("/api/auth/login", json={"email": "b@example.com", "password": "x"},
                    headers={"X-Forwarded-For": "198.51.100.200"})
    assert r.status_code == 401


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

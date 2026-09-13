"""Unit tests for the pure (I/O-free) helpers in server.py.

These cover GPX parsing, route geometry, downsampling and password hashing —
the logic that runs before anything touches the database or PayPal, and the
places a regression would silently corrupt a customer's map or login.
"""
import pytest

import server


# ----------------------------- geometry -----------------------------
def test_haversine_zero_distance():
    assert server._haversine_km((30.0, -88.0), (30.0, -88.0)) == 0


def test_haversine_positive_and_symmetric():
    a, b = (30.0, -88.0), (30.1, -88.1)
    d1 = server._haversine_km(a, b)
    d2 = server._haversine_km(b, a)
    assert d1 > 0
    assert d1 == pytest.approx(d2)


def test_route_metrics_bounds_center_distance():
    pts = [[0.0, 0.0], [0.0, 2.0], [2.0, 2.0]]
    bounds, center, dist = server._route_metrics(pts)
    assert bounds == [[0.0, 0.0], [2.0, 2.0]]
    assert center == [1.0, 1.0]
    assert dist > 0


# ----------------------------- downsampling -----------------------------
def test_downsample_under_limit_is_identity():
    pts = [[0, 0], [1, 1]]
    assert server._downsample(pts) == pts


def test_downsample_over_limit_caps_and_keeps_last_point():
    pts = [[i, i] for i in range(server.MAX_ROUTE_POINTS + 500)]
    out = server._downsample(pts)
    assert len(out) <= server.MAX_ROUTE_POINTS + 1
    assert out[-1] == pts[-1]  # endpoint must be preserved


# ----------------------------- gpx tag helper -----------------------------
def test_gpx_local_tag_strips_namespace():
    assert server._gpx_local_tag("{http://www.topografix.com/GPX/1/1}trkpt") == "trkpt"
    assert server._gpx_local_tag("trkpt") == "trkpt"


# ----------------------------- gpx parsing -----------------------------
GPX = (
    b'<?xml version="1.0"?><gpx><trk><name>Trail</name><trkseg>'
    b'<trkpt lat="30.0" lon="-88.0"></trkpt>'
    b'<trkpt lat="30.1" lon="-88.1"></trkpt>'
    b"</trkseg></trk></gpx>"
)


def test_parse_gpx_extracts_name_points_and_distance():
    r = server.parse_gpx(GPX)
    assert r["name"] == "Trail"
    assert r["point_count"] == 2
    assert r["distance_km"] > 0
    assert r["distance_mi"] == pytest.approx(r["distance_km"] * 0.621371, rel=1e-3)


def test_parse_gpx_rejects_invalid_xml():
    with pytest.raises(server.HTTPException) as exc:
        server.parse_gpx(b"definitely not xml")
    assert exc.value.status_code == 400


def test_parse_gpx_rejects_empty_track():
    with pytest.raises(server.HTTPException) as exc:
        server.parse_gpx(b"<gpx></gpx>")
    assert exc.value.status_code == 400


# ----------------------------- password hashing -----------------------------
def test_password_hash_roundtrip():
    h = server.hash_pw("correct horse battery staple")
    assert h != "correct horse battery staple"
    assert server.verify_pw("correct horse battery staple", h) is True
    assert server.verify_pw("wrong password", h) is False


def test_verify_pw_handles_garbage_hash_without_raising():
    assert server.verify_pw("anything", "not-a-bcrypt-hash") is False

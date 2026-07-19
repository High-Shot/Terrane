#!/usr/bin/env python3
"""
Terrane -> Shopify OAuth setup, for stores on Shopify's NEW Dev Dashboard where
there is no static "shpat_" Admin API token to reveal.

This script uses your app's Client ID + Client secret (shpss_) to run Shopify's
standard OAuth authorization-code flow: it opens your browser once so you can
approve the install, captures the resulting Admin API access token, and then
hands off to setup.py to create the product, the pages, and the theme sections.

Run it on a machine that can reach Shopify AND open your browser (the laptop).
Standard library only.

-------------------------------------------------------------------------------
ONE-TIME app config in the Dev Dashboard (app: terrane_maps_site):
  1. API access > Scopes — add (comma-separated):
        write_products, read_products,
        write_content, read_content,
        write_themes, read_themes,
        write_draft_orders
  2. Check "Use legacy install flow".
  3. Redirect URLs — add exactly:
        http://localhost:3456/callback
  4. Click "Release" to publish the version.
  (If the browser approval hangs, also uncheck "Embed app in Shopify admin",
   Release again, and retry.)
-------------------------------------------------------------------------------

Then run:
  SHOPIFY_STORE=terrane-maps.myshopify.com \
  SHOPIFY_CLIENT_ID=<API key / Client ID> \
  SHOPIFY_CLIENT_SECRET=shpss_xxxxxxxx \
  SHOPIFY_THEME_ID=156340977821 \
  python3 shopify/oauth_setup.py

Keep the Client secret on this machine. Never commit it.
"""
import os
import sys
import json
import time
import runpy
import secrets
import urllib.parse
import urllib.request
import urllib.error
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
STORE = os.environ.get("SHOPIFY_STORE", "").strip()
CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID", "").strip()
CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip()
PORT = int(os.environ.get("SHOPIFY_OAUTH_PORT", "3456").strip() or "3456")
# Interface the local callback server binds to. Default localhost (safe, for a
# native run). Inside a container you must bind 0.0.0.0 so a `-p 8787:8787`
# port mapping can reach it; the browser still redirects to localhost on the host.
BIND = os.environ.get("SHOPIFY_OAUTH_BIND", "localhost").strip() or "localhost"
SCOPES = os.environ.get(
    "SHOPIFY_SCOPES",
    "write_products,read_products,write_content,read_content,"
    "write_themes,read_themes,write_draft_orders",
).strip()
REDIRECT = f"http://localhost:{PORT}/callback"


def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


if not STORE or not CLIENT_ID or not CLIENT_SECRET:
    die("Set SHOPIFY_STORE, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET "
        "(the shpss_ Client secret).")
if not STORE.endswith("myshopify.com"):
    print(f"NOTE: SHOPIFY_STORE is '{STORE}'. It should be the *.myshopify.com domain "
          "(e.g. terrane-maps.myshopify.com), not the admin URL.\n")
if not CLIENT_SECRET.startswith("shpss_"):
    print("NOTE: SHOPIFY_CLIENT_SECRET does not start with 'shpss_'. Make sure it is "
          "the app's Client secret, not the Client ID.\n")


class _CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            # Ignore stray requests (favicon, etc.) without ending the wait.
            self.send_response(404)
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(parsed.query)
        self.server.oauth_code = qs.get("code", [None])[0]
        self.server.oauth_state = qs.get("state", [None])[0]
        self.server.oauth_error = qs.get("error", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<html><body style='font-family:system-ui,sans-serif;padding:48px;"
            b"background:#0e2231;color:#f2ead6'>"
            b"<h2 style='margin:0 0 8px'>Terrane &times; Shopify connected.</h2>"
            b"<p>You can close this tab and return to the terminal.</p>"
            b"</body></html>"
        )

    def log_message(self, *args):  # silence the default request logging
        pass


def get_access_token():
    state = secrets.token_urlsafe(24)
    auth_url = f"https://{STORE}/admin/oauth/authorize?" + urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "scope": SCOPES,
        "redirect_uri": REDIRECT,
        "state": state,
    })

    try:
        server = HTTPServer((BIND, PORT), _CallbackHandler)
    except OSError as e:
        die(f"Could not bind {BIND}:{PORT} ({e}). Set SHOPIFY_OAUTH_PORT to a free "
            "port and add http://localhost:<port>/callback to the app's Redirect URLs.")
    server.oauth_code = None
    server.oauth_state = None
    server.oauth_error = None
    server.timeout = 5  # so handle_request() returns periodically to check the deadline

    print("Opening your browser to approve the Terrane app install ...")
    print("If it doesn't open on its own, paste this URL into your browser:\n  "
          + auth_url + "\n")
    try:
        webbrowser.open(auth_url)
    except Exception:
        pass
    print(f"Waiting for the approval redirect on {REDIRECT} (up to 5 min) ...")

    deadline = time.time() + 300
    while server.oauth_code is None and server.oauth_error is None:
        if time.time() > deadline:
            server.server_close()
            die("Timed out waiting for approval. Re-run and approve in the browser.")
        server.handle_request()
    server.server_close()

    if server.oauth_error:
        die(f"Shopify returned an error during approval: {server.oauth_error}")
    if server.oauth_state != state:
        die("OAuth state mismatch (possible CSRF / stale tab). Re-run and try again.")

    # Exchange the one-time code for a durable Admin API access token.
    body = json.dumps({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": server.oauth_code,
    }).encode()
    req = urllib.request.Request(
        f"https://{STORE}/admin/oauth/access_token",
        data=body, method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            payload = json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        die(f"Token exchange failed ({e.code}): {e.read().decode()[:400]}\n"
            "Double-check the Client ID/secret and that the app version was Released.")
    except Exception as e:
        die(f"Token exchange failed: {e}")

    token = payload.get("access_token")
    if not token:
        die(f"No access_token in Shopify's response: {json.dumps(payload)[:300]}")
    granted = payload.get("scope", "")
    print("  OK — minted an Admin API access token.")
    if granted:
        print(f"  Granted scopes: {granted}")
    print()
    return token


def main():
    token = get_access_token()
    # Hand the token to setup.py, which is the single source of truth for the
    # actual product/page/section content.
    os.environ["SHOPIFY_ADMIN_TOKEN"] = token
    os.environ["SHOPIFY_STORE"] = STORE
    runpy.run_path(str(HERE / "setup.py"), run_name="__main__")


if __name__ == "__main__":
    main()

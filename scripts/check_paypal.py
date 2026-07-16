#!/usr/bin/env python3
"""Validate the live PayPal credentials + mode used by the Terrane backend.

Run this ON the machine that runs the backend (it reads backend/.env):

    python3 scripts/check_paypal.py

It asks PayPal for an OAuth token using your PAYPAL_CLIENT_ID / PAYPAL_SECRET
against BOTH the live and sandbox endpoints, then tells you which one your
credentials actually belong to and whether that matches PAYPAL_MODE.

Your secret is never printed. Requires only the Python standard library.
"""
import base64
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


def load_env():
    env = dict(os.environ)
    # Look for backend/.env relative to this script, then cwd.
    here = Path(__file__).resolve().parent
    for candidate in (here.parent / "backend" / ".env", Path.cwd() / "backend" / ".env", Path.cwd() / ".env"):
        if candidate.is_file():
            for line in candidate.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            print(f"Loaded env from {candidate}")
            break
    return env


def try_token(base, client_id, secret):
    auth = base64.b64encode(f"{client_id}:{secret}".encode()).decode()
    req = urllib.request.Request(
        f"{base}/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200, r.status
    except urllib.error.HTTPError as e:
        return False, e.code
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def main():
    env = load_env()
    cid = env.get("PAYPAL_CLIENT_ID", "").strip()
    sec = env.get("PAYPAL_SECRET", "").strip()
    mode = env.get("PAYPAL_MODE", "sandbox").strip()

    print(f"PAYPAL_MODE       = {mode!r}")
    print(f"PAYPAL_CLIENT_ID  = {'set ('+str(len(cid))+' chars)' if cid else 'MISSING'}")
    print(f"PAYPAL_SECRET     = {'set' if sec else 'MISSING'}")
    if not cid or not sec:
        print("\n=> PayPal is DISABLED server-side (missing client id and/or secret).")
        print("   The backend reports paypal_enabled=false, so customers see the demo/fallback path.")
        sys.exit(1)

    live_ok, live_code = try_token("https://api-m.paypal.com", cid, sec)
    sand_ok, sand_code = try_token("https://api-m.sandbox.paypal.com", cid, sec)
    print(f"\nlive endpoint    : {'OK (token issued)' if live_ok else f'rejected ({live_code})'}")
    print(f"sandbox endpoint : {'OK (token issued)' if sand_ok else f'rejected ({sand_code})'}")

    belongs = "live" if live_ok else "sandbox" if sand_ok else None
    print()
    if belongs is None:
        print("=> Credentials are INVALID for both live and sandbox. The client id/secret")
        print("   are wrong or revoked. Regenerate them in the PayPal Developer dashboard.")
        sys.exit(2)

    expected = "live" if mode == "live" else "sandbox"
    if belongs == expected:
        print(f"=> Credentials are VALID and MATCH PAYPAL_MODE={mode!r}. Auth is fine.")
        print("   If buttons still don't render, look at the browser side: the PayPal SDK")
        print("   being blocked (ad blocker / CSP) or the account not being eligible to")
        print("   show PayPal for USD. Check the browser console on terranemaps.com/studio.")
    else:
        print(f"=> MODE MISMATCH. Your credentials are {belongs.upper()} keys, but")
        print(f"   PAYPAL_MODE={mode!r} (expects {expected} keys).")
        print(f"   Fix: set PAYPAL_MODE={belongs!r} in backend/.env (or swap in the matching")
        print(f"   keys) and restart the backend. This is a common cause of blank buttons.")


if __name__ == "__main__":
    main()

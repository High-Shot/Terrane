# Running terranemaps.com from a home laptop (Windows)

This guide turns an always-plugged-in Windows laptop into the server for the
whole site — frontend, API, and database — for $0/month, using a free
Cloudflare Tunnel so you never touch your router and never expose your home
IP address.

How traffic flows:

```
visitor → Cloudflare (HTTPS, your DNS) → Cloudflare Tunnel (outbound-only
from the laptop) → nginx container on localhost:80 → API + MongoDB containers
```

**You need:** the laptop on wall power (ethernet beats Wi-Fi if possible), your
Cloudflare account that manages terranemaps.com, and about an hour.

**Laptop specs:** 8 GB RAM is comfortable. 4 GB works, but close everything
else during the first build and expect it to be slow.

---

## Part 1 — Make Windows behave like a server

1. **Never sleep.** Settings → System → Power & battery → Screen and sleep →
   set "When plugged in, put my device to sleep" to **Never**. Then Control
   Panel → Power Options → "Choose what closing the lid does" → When plugged
   in: **Do nothing** (so you can close the lid and shelve it).
   Belt-and-braces from PowerShell (right-click Start → Terminal):

   ```powershell
   powercfg /change standby-timeout-ac 0
   powercfg /change hibernate-timeout-ac 0
   ```

2. **Auto sign-in after reboots.** Docker Desktop only starts once someone is
   signed in, so the machine must sign itself in after a Windows Update reboot:
   - Settings → Accounts → Sign-in options → turn **off** "For improved
     security, only allow Windows Hello sign-in for Microsoft accounts".
   - Press Win+R, run `netplwiz`, **uncheck** "Users must enter a user name
     and password to use this computer", enter your password, OK.

   (This means anyone who opens the laptop is signed in — treat it like the
   appliance it now is and keep it somewhere sensible.)

3. **Tame Windows Update.** Settings → Windows Update → Advanced options →
   set **Active hours** to the hours your customers are most likely shopping
   (updates then install/reboot outside that window). With auto sign-in plus
   the container restart policies already in `docker-compose.yml`, an
   overnight update reboot self-heals in a few minutes without you.

---

## Part 2 — Install the tools

1. **Git for Windows** — download from https://git-scm.com, install with all
   default options.
2. **Docker Desktop** — download from https://www.docker.com, install with the
   default **WSL 2** backend, reboot when asked. Then open Docker Desktop →
   Settings → General → check **"Start Docker Desktop when you sign in to
   your computer"**.

> If Docker complains that virtualization is disabled, enable
> "Virtualization" / "Intel VT-x" / "AMD SVM" in the laptop's BIOS (usually
> F2 or Del at power-on).

---

## Part 3 — Get the site running on the laptop

Open PowerShell and run:

```powershell
cd $HOME
git clone https://github.com/High-Shot/Terrane.git
cd Terrane
copy .env.example backend\.env
notepad backend\.env
```

In Notepad, fill in:

- `JWT_SECRET` — generate a strong one by pasting this into PowerShell and
  copying the output:

  ```powershell
  $b = New-Object byte[] 32; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); ($b | ForEach-Object { $_.ToString('x2') }) -join ''
  ```

- `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` — start with **sandbox** credentials
  from https://developer.paypal.com (Apps & Credentials → Sandbox) and keep
  `PAYPAL_MODE=sandbox` until you've placed a test order end to end.

Save, close Notepad, then build and start everything:

```powershell
docker compose up -d --build
```

The first build takes 5–15 minutes on an older machine. Verify:

- http://localhost → the Terrane site
- http://localhost/api/ → `{"message":"Terrane API", ...}`

---

## Part 4 — Connect terranemaps.com (Cloudflare Tunnel)

1. In the Cloudflare dashboard: **Zero Trust → Networks → Tunnels → Create a
   tunnel → Cloudflared**. Name it `terrane-laptop`.
2. On the connector page pick **Windows**, copy the install command, and run
   it in an **Administrator** PowerShell. This installs `cloudflared` as a
   Windows **service** — it starts at boot, even before sign-in.
3. Under the tunnel's **Public hostnames**, add two entries:

   | Public hostname | Service |
   |---|---|
   | `terranemaps.com` | `HTTP` → `localhost:80` |
   | `www.terranemaps.com` | `HTTP` → `localhost:80` |

   Cloudflare creates the DNS records automatically. If it complains a record
   already exists, delete the old A/CNAME for that name in DNS first.

4. Visit **https://terranemaps.com** — you're live, with HTTPS handled by
   Cloudflare. No ports were opened on your router; the tunnel is
   outbound-only, and your home IP is never published.

---

## Part 5 — Prove it survives a disaster

Reboot the laptop and don't touch it. Within ~5 minutes the site should be
back on its own (auto sign-in → Docker Desktop autostarts → containers have
`restart: unless-stopped` → cloudflared service reconnects). If that works,
a 2am Windows Update can't hurt you.

---

## Part 6 — Know when it breaks before customers do

Create a free monitor at https://uptimerobot.com: HTTPS monitor on
`https://terranemaps.com/api/`, check every 5 minutes, alert to your email.
When the house eats the server, your phone tells you.

---

## Part 7 — Backups (do not skip)

Your orders and customer accounts live in MongoDB **on this laptop**. Back the
database up weekly to a cloud-synced folder:

1. The repo includes `scripts/backup-mongo.ps1`. Test it once:

   ```powershell
   cd $HOME\Terrane
   powershell -ExecutionPolicy Bypass -File scripts\backup-mongo.ps1
   ```

   It writes a dated `.archive` file to `$HOME\TerraneBackups` — point that
   folder at OneDrive/Google Drive/Dropbox sync, or change `$BackupDir` in the
   script to a folder that already syncs.

2. Automate it: open **Task Scheduler → Create Basic Task** → weekly, pick a
   time the laptop is on → Action: Start a program →
   Program: `powershell`
   Arguments: `-ExecutionPolicy Bypass -File "%USERPROFILE%\Terrane\scripts\backup-mongo.ps1"`

To restore a backup onto any machine running the stack:

```powershell
Get-Content backup-file.archive -Raw -AsByteStream | docker compose exec -T mongo mongorestore --archive --drop
```

---

## Part 8 — Day-2 operations

| Task | Command (PowerShell, in the Terrane folder) |
|---|---|
| Update the site after changes are merged on GitHub | `git pull` then `docker compose up -d --build` |
| Watch API logs | `docker compose logs -f backend` |
| Restart everything | `docker compose restart` |
| Switch PayPal to real payments | edit `backend\.env` → live credentials + `PAYPAL_MODE=live`, then `docker compose up -d backend` |

**When you outgrow the laptop:** rent a small VPS, follow DEPLOY.md Option A
there, and move the data with the backup/restore commands above. Nothing else
changes — same repo, same compose file.

---

## Alternative: put Ubuntu on the laptop instead

If the laptop has nothing else on it, Ubuntu Server (free, https://ubuntu.com)
turns it into a proper Linux server: Docker installs with one command
(`curl -fsSL https://get.docker.com | sh`), there's no auto-sign-in dance
because Docker runs as a system service, and unattended upgrades don't force
reboots the way Windows does. Cloudflare Tunnel has the same one-line Linux
installer in the tunnel setup page. Every other step in this guide is
identical.

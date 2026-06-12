# streaming/ — run BizFlow in the browser

Runs the BizFlow desktop app on a server and streams it to the browser. For the
full explanation and alternatives, see
[../docs/RUN-BIZFLOW-IN-BROWSER.md](../docs/RUN-BIZFLOW-IN-BROWSER.md).

## Prerequisite

Docker installed and running:

```powershell
docker --version
docker compose version
```

## Option A — Lightweight (Linux + Wine)

```powershell
docker compose up --build
```

- Web client: <http://localhost:6080/vnc.html>
- Installer is read from `./app/bizflow-1.0.0-commerce.exe`
- Electron runs with `--no-sandbox` (set in `docker-compose.yml`)

## Option B — Real Windows (most reliable for BizFlow)

```powershell
docker compose -f docker-compose.windows.yml up
```

- Viewer: <http://localhost:8006> (Windows installs on first run)
- Put installers/files in `./shared` to access them inside Windows
- Requires a host with **KVM** (Linux/cloud VM, not Docker Desktop for Windows)

## Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Wine + Xvfb + x11vnc + noVNC image |
| `entrypoint.sh` | Boots the desktop, installs + launches BizFlow, serves noVNC |
| `docker-compose.yml` | Lightweight Wine path |
| `docker-compose.windows.yml` | Real-Windows VM path (`dockurr/windows`) |
| `app/` | Drop the BizFlow installer here (git-ignored) |

## Security

Before exposing beyond localhost: set `VNC_PASSWORD`, put it behind HTTPS + auth,
and give each user their own container. Never expose raw VNC/RDP to the internet.

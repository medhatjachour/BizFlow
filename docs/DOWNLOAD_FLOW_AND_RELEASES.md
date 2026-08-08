# Download Flow and Release Handling

## Goal

Users should not be sent to a generic GitHub releases page.
They should choose module + OS (Windows/macOS/Linux), then start the correct installer download.

## Why assets were missing

Production was falling back because no matching installer assets existed in the public latest release.

- Latest release data had no attached assets.
- CI Windows workflow was failing at install (`npm ci`) due lockfile drift, so packaging never ran.
- No active workflow was publishing per-module + per-OS assets with the names the website expects.

## What is now implemented

- All major website CTAs now route to the in-site builder: `/download`
- Module download links pass the selected module id
- Quick install links support OS preselection and auto-start:
  - `/download?module=<id>&os=windows&autoStart=1`
  - `/download?module=<id>&os=mac&autoStart=1`
  - `/download?module=<id>&os=linux&autoStart=1`
- Checkout fallback now stays inside the website flow for internal links.

## How installer filename is resolved

Current naming convention:

- `BizFlow-<Module>-windows.exe`
- `BizFlow-<Module>-mac.dmg`
- `BizFlow-<Module>-linux.AppImage`

Examples:

- `BizFlow-Commerce-windows.exe`
- `BizFlow-Pharmacy-mac.dmg`
- `BizFlow-Suite-linux.AppImage`

## Direct-download setup (recommended)

Set this env var on the website service to point at asset downloads:

```env
NEXT_PUBLIC_DOWNLOAD_BASE=https://github.com/<owner>/<repo>/releases/latest/download
```

With this set, the app checks whether the exact file exists and starts download directly.

If not set, fallback remains the generic releases URL.

## Optional on-demand build setup (advanced)

To trigger builds automatically when artifact is missing:

```env
GITHUB_BUILD_REPO=<owner>/<repo>
GITHUB_BUILD_WORKFLOW=build-desktop.yml
GITHUB_BUILD_REF=main
GITHUB_BUILD_TOKEN=<github_token_with_actions_write>
```

Flow:

1. User requests download
2. If artifact exists: download starts
3. If artifact missing and build configured: workflow is dispatched
4. UI polls until artifact appears, then starts download

## New workflow to publish installers

This repo now includes:

- `.github/workflows/build-desktop-release.yml`

Use GitHub Actions -> "Build Desktop Release Asset" and run it with:

- `module`: one of `suite`, `commerce`, `bakery`, `restaurant`, `coffee`, `warehouse`, `clinic`, `vet`, `pharmacy`, `gym`
- `os`: `windows`, `mac`, or `linux`
- `release_tag`: keep `downloads-latest` (recommended)

The workflow builds the selected target and uploads a normalized asset name:

- `BizFlow-<Module>-windows.exe`
- `BizFlow-<Module>-mac.dmg`
- `BizFlow-<Module>-linux.AppImage`

These names are the same format used by the website resolver.

## Deployment checklist after changing download logic

```bash
# local
npm --prefix apps/website run lint

# deploy
scp apps/website/src/... medhat@<server>:~/bizflow/apps/website/src/...
ssh medhat@<server> "cd ~/bizflow && docker compose up -d --build bizflow-app"

# verify
open https://<domain>/bizflow/download?module=commerce&os=windows
open https://<domain>/bizflow/download?module=pharmacy&os=mac
open https://<domain>/bizflow/download?module=suite&os=linux
```

## Business recommendation

Use one of these two production models:

1. Prebuild all installers per release and host in GitHub Releases assets.
2. Keep prebuilt popular installers + on-demand build for less-used combinations.

This gives users a clean installer-first experience while keeping operations manageable.

## Recommended production blueprint (next step)

For BizFlow scale (many modules x 3 OS), use this architecture:

1. CI/build server builds installers on push to main (or on release tag), not on user click.
2. Artifacts are uploaded to object storage + CDN (for example Cloudflare R2/S3), not only GitHub Releases.
3. Website API resolves from a versioned manifest, then falls back to GitHub release only as safety.
4. Keep only a short history of installers (for example last 3 versions per module+OS).

### Artifact path format

Use deterministic paths:

- `installers/<module>/<os>/latest/BizFlow-<Module>-<os>.<ext>`
- `installers/<module>/<os>/<version>/BizFlow-<Module>-<os>.<ext>`
- `manifests/latest.json`

### Manifest shape

`manifests/latest.json` should include explicit URLs and checksums:

```json
{
  "generatedAt": "2026-08-06T00:00:00Z",
  "modules": {
    "commerce": {
      "windows": {
        "version": "1.0.12",
        "fileName": "BizFlow-Commerce-windows.exe",
        "url": "https://downloads.bizflow.app/installers/commerce/windows/latest/BizFlow-Commerce-windows.exe",
        "sha256": "..."
      }
    }
  }
}
```

### Cleanup policy

After each successful publish:

1. Keep `latest` pointer files.
2. Keep last 3 version folders per module+OS.
3. Delete older objects automatically with a cleanup script/job.

### DB strategy for module installers

Yes, each module installer should ship only what it needs.

Rule set:

1. Include shared core tables in every build.
2. Include only selected module tables in the module installer template DB.
3. If the customer adds another module later, run additive migrations to add missing tables.
4. Keep one compatibility contract for core tables to avoid plugin drift.

This keeps installer size and initialization lean while preserving upgrade safety.

## Server validation commands

Use these checks in production after every publish:

```bash
# direct asset existence
curl -I https://github.com/<owner>/<repo>/releases/download/downloads-latest/BizFlow-Commerce-windows.exe

# website resolver state
curl https://<domain>/bizflow/api/download?module=commerce&os=windows
```

Expected steady-state response:

- `state: "ready"`
- `url` points to direct installer

## Demo operations and VPS hardening

The production stack now includes:

- Nginx API/demo rate limits and security headers.
- One-year immutable caching for Next.js hashed static assets.
- Docker healthchecks, CPU/memory limits, and bounded JSON logs.
- A GitHub Trivy image scan on production-relevant changes.
- `scripts/reset-demo-data.sh`, guarded by `DEMO_RESET_CONFIRM=1`.

Run a reset manually from the deployment directory:

```bash
DEMO_RESET_CONFIRM=1 ./scripts/reset-demo-data.sh
```

For a disposable demo environment, schedule it after taking any required backup:

```cron
0 */6 * * * cd /opt/bizflow && DEMO_RESET_CONFIRM=1 ./scripts/reset-demo-data.sh >> /var/log/bizflow-demo-reset.log 2>&1
```

Do not schedule this against a customer-data volume. The current Compose volume is the application database volume, so customer tenancy must be separated before enabling unattended resets in a selling environment.

## Selling layer status

The existing `/admin` dashboard is protected by an HMAC cookie and `ADMIN_PASSWORD`. Production now fails fast if that password is missing. Buyer authentication, tenant provisioning, license lifecycle, and payment webhooks still require a persistent account model and a selected gateway (Stripe, Paymob, Fawry, or PayTabs); those should be implemented before accepting real customer data.

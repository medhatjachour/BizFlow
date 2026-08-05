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

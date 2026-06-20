#!/usr/bin/env bash
#
# Boots a virtual desktop, exposes it over VNC, bridges it to the browser with
# noVNC, then installs + launches the BizFlow Electron app under Wine.
#
# Pipeline inside the container:
#   Xvfb (virtual display) -> fluxbox (WM)
#   wine <installer> /S     -> installs BizFlow into the Wine prefix
#   wine BizFlow.exe        -> the real app draws onto the display
#   x11vnc                  -> exposes the display over VNC
#   websockify + noVNC      -> serves a web client at :6080
set -e

INSTALLER_PATH="${INSTALLER_PATH:-/app/bizflow-1.0.0-commerce.exe}"
GEOMETRY="${GEOMETRY:-1280x800x24}"
VNC_PORT=5900
WEB_PORT=6080
# Electron under Wine/root needs the sandbox disabled to start Chromium.
EXTRA_ARGS="${EXTRA_ARGS:---no-sandbox --disable-gpu}"

# 1) Virtual display
Xvfb :0 -screen 0 "$GEOMETRY" -ac +extension RANDR >/dev/null 2>&1 &
sleep 1

# 2) Lightweight window manager
fluxbox >/dev/null 2>&1 &

# 3) VNC server. Use a password if VNC_PASSWORD is set (recommended).
if [ -n "$VNC_PASSWORD" ]; then
  mkdir -p /root/.vnc
  x11vnc -storepasswd "$VNC_PASSWORD" /root/.vnc/passwd >/dev/null 2>&1
  AUTH="-rfbauth /root/.vnc/passwd"
else
  echo "WARNING: no VNC_PASSWORD set — stream is unauthenticated (localhost/demo only)."
  AUTH="-nopw"
fi
x11vnc -display :0 -forever -shared $AUTH -rfbport "$VNC_PORT" -quiet >/dev/null 2>&1 &

# 4) Bridge VNC -> WebSocket and serve the noVNC web client
websockify --web=/usr/share/novnc "$WEB_PORT" "localhost:${VNC_PORT}" >/dev/null 2>&1 &

# 5) Initialise the Wine prefix on first run
wineboot --init >/dev/null 2>&1 || true
sleep 2

# 6) Install BizFlow once (electron-builder NSIS supports silent /S install)
find_app() {
  find "$WINEPREFIX/drive_c" -iname "BizFlow.exe" -not -iname "*Uninstall*" 2>/dev/null | head -n1
}

APP_EXE="$(find_app || true)"
if [ -z "$APP_EXE" ]; then
  if [ -f "$INSTALLER_PATH" ]; then
    echo "Installing BizFlow under Wine (silent)…"
    wine "$INSTALLER_PATH" /S >/dev/null 2>&1 || true
    sleep 5
    APP_EXE="$(find_app || true)"
  else
    echo "Installer not found at '$INSTALLER_PATH'."
    echo "Place bizflow-1.0.0-commerce.exe in ./app, then rebuild."
    tail -f /dev/null
  fi
fi

# 7) Launch the app (restart it if the user closes it)
if [ -n "$APP_EXE" ]; then
  echo "Launching $APP_EXE under Wine…"
  while true; do
    wine "$APP_EXE" $EXTRA_ARGS || true
    sleep 2
  done
else
  echo "BizFlow.exe was not found after install. Connect via noVNC to debug."
  tail -f /dev/null
fi

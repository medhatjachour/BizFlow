# Streams a Windows .exe to the browser via Wine + noVNC.
#
# Pipeline inside the container:
#   Xvfb (virtual display)  ->  fluxbox (window manager)
#   wine your-app.exe       ->  draws onto the display
#   x11vnc                  ->  exposes the display over VNC
#   websockify + noVNC      ->  serves a web client at :6080
#
# NOTE: Wine compatibility is app-specific. If your .exe does not run under
# Wine (e.g. heavy DirectX/anti-cheat/deep Windows integration), use the real
# Windows path instead (see docker-compose.windows.yml).

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:0 \
    WINEDEBUG=-all \
    WINEPREFIX=/root/.wine

# Enable 32-bit architecture (many Windows apps still need 32-bit Wine libs).
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      wine wine64 wine32:i386 \
      xvfb x11vnc fluxbox \
      novnc websockify \
      xdotool ca-certificates procps \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Web client (noVNC) port.
EXPOSE 6080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

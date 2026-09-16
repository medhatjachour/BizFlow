/**
 * Minimal keep-alive HTTP client for the load harness.
 *
 * Uses node:http / node:https directly so there is no dependency to install and
 * so we control the socket pool: keep-alive plus a fixed maxSockets is what
 * makes a closed-loop load generator measure server time instead of TCP setup
 * time.
 */

import http from "node:http";
import https from "node:https";

/**
 * @param {string} target e.g. `https://www.example.com` or `http://127.0.0.1:3000`
 * @param {{ maxSockets?: number, timeoutMs?: number, insecure?: boolean, headers?: Record<string, string> }} [options]
 */
export function createClient(target, options = {}) {
  const base = new URL(target);
  const secure = base.protocol === "https:";
  const agentOptions = {
    keepAlive: true,
    maxSockets: options.maxSockets ?? 64,
    maxFreeSockets: Math.min(options.maxSockets ?? 64, 16),
    timeout: options.timeoutMs ?? 20000,
    scheduling: "lifo",
  };
  if (secure && options.insecure) agentOptions.rejectUnauthorized = false;

  const agent = secure ? new https.Agent(agentOptions) : new http.Agent(agentOptions);
  /**
   * Connection bookkeeping.
   *
   * A closed-loop harness is supposed to measure *server* time, so it is
   * important to know when a sample actually includes a TCP + TLS handshake
   * instead of reusing a warm socket. `req.reusedSocket` gives that per request;
   * listening for the socket's connect event on a brand-new socket gives the
   * handshake cost itself. Together they turn "the site is slow" into "every
   * request is paying a fresh handshake", which is a completely different fix.
   */
  const connections = { newSockets: 0, samples: [] };
  const MAX_CONNECT_SAMPLES = 20_000;
  function watchHandshake(socket) {
    if (!socket.connecting) return; // pooled socket: no handshake to pay for
    connections.newSockets += 1;
    const started = process.hrtime.bigint();
    socket.once(secure ? "secureConnect" : "connect", () => {
      if (connections.samples.length < MAX_CONNECT_SAMPLES) {
        connections.samples.push(Number(process.hrtime.bigint() - started) / 1e6);
      }
    });
  }
  const baseHeaders = {
    // Match a real browser: without this the Next.js server sends everything
    // uncompressed and the measured transfer is ~3x larger than reality.
    "accept-encoding": "gzip, deflate, br",
    "user-agent": "bizflow-perf-harness/1.0",
    ...(options.headers ?? {}),
  };

  /**
   * @param {{ method?: string, path: string, headers?: Record<string, string>, body?: string }} request
   * @returns {Promise<{ status: number, ms: number, ttfbMs: number, bytes: number, reusedSocket: boolean, error?: string, errorCode?: string }>}
   */
  function request(request) {
    return new Promise((resolve) => {
      const started = process.hrtime.bigint();
      const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;
      const finish = (payload) => {
        resolve({ ms: elapsed(), ttfbMs: elapsed(), status: 0, bytes: 0, reusedSocket: true, ...payload });
      };
      // `errorCode` is kept so the runner can tell "the socket never opened"
      // apart from "the server answered slowly" - only the first is fatal.
      const fail = (error) =>
        finish({ error: String(error?.message ?? error), errorCode: error?.code ?? undefined });

      const req = (secure ? https : http).request(
        {
          protocol: base.protocol,
          hostname: base.hostname,
          port: base.port || (secure ? 443 : 80),
          method: request.method ?? "GET",
          path: request.path,
          agent,
          headers: { ...baseHeaders, ...(request.headers ?? {}) },
        },
        (res) => {
          // Time to first byte: when the server started answering, which for a
          // server-rendered marketing page is the number that matters most.
          const ttfbMs = elapsed();
          let bytes = 0;
          res.on("data", (chunk) => {
            bytes += chunk.length;
          });
          res.on("end", () =>
            finish({
              ttfbMs,
              status: res.statusCode ?? 0,
              bytes,
              reusedSocket: req.reusedSocket === true,
            }),
          );
          res.on("error", (error) => fail(error));
        },
      );

      req.setTimeout(options.timeoutMs ?? 20000, () => {
        req.destroy(new Error("timeout"));
      });
      req.on("error", fail);
      req.on("socket", (socket) => watchHandshake(socket));

      if (request.body !== undefined) req.write(request.body);
      req.end();
    });
  }

  return {
    base,
    request,
    /** Handshake accounting, for explaining latency instead of guessing at it. */
    connectionStats() {
      return { newSockets: connections.newSockets, connectSamples: connections.samples };
    },
    close() {
      agent.destroy();
    },
  };
}

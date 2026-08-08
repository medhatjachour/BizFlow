export type LogLevel = "info" | "warn" | "error";

export function requestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") ?? globalThis.crypto.randomUUID();
}

export function logEvent(level: LogLevel, event: string, data: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

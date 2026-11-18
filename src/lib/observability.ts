// Error + web-vitals reporting (F-OPS-03). Posts to NEXT_PUBLIC_TELEMETRY_URL when set, else logs in dev.
// shortcut: plain beacon instead of the Sentry SDK; swap to @sentry/nextjs once HEBUZA's Sentry DSN exists (Q-PRJ-04).
const URL_ = process.env.NEXT_PUBLIC_TELEMETRY_URL;

function send(kind: "error" | "vital", payload: Record<string, unknown>) {
  const body = JSON.stringify({ kind, ...payload, path: typeof location !== "undefined" ? location.pathname : undefined, ts: Date.now() });
  if (!URL_) {
    if (process.env.NODE_ENV !== "production") console.debug(`[${kind}]`, payload);
    return;
  }
  // No PII: only message/stack/path; never request bodies or user fields.
  if (typeof navigator !== "undefined" && navigator.sendBeacon) navigator.sendBeacon(URL_, body);
  else fetch(URL_, { method: "POST", body, keepalive: true }).catch(() => {});
}

export function reportError(error: unknown, extra: Record<string, unknown> = {}) {
  const e = error instanceof Error ? error : new Error(String(error));
  send("error", { message: e.message, stack: e.stack?.slice(0, 2000), ...extra });
}

export function reportVital(metric: { name: string; value: number; rating?: string; id: string }) {
  send("vital", { name: metric.name, value: Math.round(metric.value), rating: metric.rating, id: metric.id });
}

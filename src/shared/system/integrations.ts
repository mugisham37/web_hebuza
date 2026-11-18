// Mirror of server/src/domain/system/integrations.ts — UI display only; the server enforces.
// Integration health truth (plan 06 §2.5, C3.16): never shown working unless the last test passed.
import type { Health, IntegrationGroup, IntegrationVM } from "./types";

/** PLACEHOLDER(integration-thresholds) */
export const DEGRADED_AT = 0.05;
export const DOWN_AT = 0.5;

export function health(i: Pick<IntegrationVM, "configured" | "lastTest" | "credentials" | "envChangedAt" | "errorRate1h" | "maintenance" | "env">): Health {
  if (i.maintenance) return "maintenance";
  const t = i.lastTest;
  if (!i.configured || !t) return "untested";
  const at = Date.parse(t.at);
  if (i.credentials.some((c) => Date.parse(c.rotatedAt) > at)) return "untested";
  if (i.envChangedAt && Date.parse(i.envChangedAt) > at) return "untested";
  if (t.env !== i.env) return "untested";
  if (!t.ok || i.errorRate1h >= DOWN_AT) return "down";
  if (i.errorRate1h >= DEGRADED_AT) return "degraded";
  return "operational";
}

/** Switching to production needs a passing production test (409 integration_untested). */
export const canGoLive = (i: Pick<IntegrationVM, "lastTest">) => !!i.lastTest?.ok && i.lastTest.env === "production";

export const INTEGRATION_GROUPS: readonly IntegrationGroup[] = ["payments", "messaging", "ai", "identity", "platform"];
export const HEALTH_ORDER: readonly Health[] = ["down", "degraded", "untested", "maintenance", "operational"];

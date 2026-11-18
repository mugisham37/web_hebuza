// Liveness/readiness JSON for uptime probes (spec/06 observability). Bypasses locale routing via proxy RAW.
import { connection } from "next/server";
import pkg from "../../package.json";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version;

export async function health(status: "ok" | "degraded", code = 200, checks?: Record<string, string>) {
  await connection(); // per-request time, never prerendered
  return Response.json({ status, version, time: new Date().toISOString(), ...(checks ? { checks } : {}) }, { status: code, headers: { "cache-control": "no-store" } });
}

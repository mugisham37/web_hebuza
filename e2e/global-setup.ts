import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { join } from "node:path";
// Fresh database per run (drop → migrate → seed) so journeys never depend on leftover state. Env from ../server/.env
// (never printed); E2E_NO_RESET=1 skips it when pointing at a stack you must not wipe.
export default function globalSetup() {
  if (process.env.E2E_NO_RESET || process.env.E2E_BASE_URL) return;
  const api = parseEnv(readFileSync(join(__dirname, "../../server/.env"), "utf8"));
  execSync(`pnpm --dir ${join(__dirname, "../../server")} db:reset`, { stdio: ["ignore", "ignore", "inherit"], env: { ...api, ...process.env, NODE_ENV: "development" } });
}

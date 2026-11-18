"use client";
// Staff-only: warns sysadmin/ops when /api/status reports the background worker down (SPLIT-PLAN §4).
import { useEffect, useState } from "react";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { fill, systemCommon } from "@/content/pages/system-common";

type Status = components["schemas"]["PlatformStatusResponse"];
const ROLES = ["staff:sysadmin", "staff:service_manager"];

export function WorkerBanner() {
  const { locale } = useI18n();
  const { user } = useSession();
  const show = !!user?.roles.some((r) => ROLES.includes(r));
  const [down, setDown] = useState<{ since?: string | null } | null>(null);
  useEffect(() => {
    if (!show) return;
    const load = () => unwrap<Status>(api.GET("/api/status"))
      .then((d) => { const w = d.components.find((c) => c.key === "worker"); setDown(w?.state === "operational" || !w ? null : w); })
      .catch(() => null);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [show]);
  if (!show || !down) return null;
  const t = down.since ? new Date(down.since).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "—";
  return <p role="status" className="mb-4 bg-warning-bg px-3 py-2 text-small text-warning">{fill(systemCommon(locale).banners.workerOffline, { t })}</p>;
}

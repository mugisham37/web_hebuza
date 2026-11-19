"use client";
// F-BKG-10: link the adviser's Google / Microsoft calendar; confirmed bookings are then added there automatically.
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/tag";

type Status = { providers: { provider: "google" | "microsoft"; available: boolean; linked: boolean }[] };
const COPY = {
  en: { t: "Calendar sync", google: "Google Calendar", microsoft: "Outlook / Microsoft 365", link: "Connect", relink: "Reconnect", linked: "Connected", failed: "Could not start the connection." },
  fr: { t: "Synchronisation du calendrier", google: "Google Agenda", microsoft: "Outlook / Microsoft 365", link: "Connecter", relink: "Reconnecter", linked: "Connecté", failed: "Impossible de démarrer la connexion." },
  rw: { t: "Guhuza ingengabihe", google: "Google Calendar", microsoft: "Outlook / Microsoft 365", link: "Huza", relink: "Ongera uhuze", linked: "Byahujwe", failed: "Ntibyashobotse gutangira." },
} as const;

export function CalendarLinks() {
  const { locale } = useI18n();
  const c = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const q = useQuery({ queryKey: ["bkg", "calendar-sync"], queryFn: () => unwrap<Status>(api.GET("/api/me/calendar-sync")), retry: false });
  const start = useMutation({
    mutationFn: (provider: string) => unwrap<{ url: string }>(api.GET("/api/me/calendar-sync/{provider}/start", { params: { path: { provider } } })),
    onSuccess: (d) => { window.location.href = d.url; },
  });
  const shown = q.data?.providers.filter((p) => p.available) ?? [];
  if (!shown.length) return null; // no provider configured, or not an adviser
  return (
    <section aria-labelledby="cal-sync-h" className="flex flex-wrap items-center gap-3 border border-border p-4">
      <h2 id="cal-sync-h" className="text-label">{c.t}</h2>
      {shown.map((p) => (
        <span key={p.provider} className="flex items-center gap-2">
          <span className="text-small">{c[p.provider]}</span>
          {p.linked && <Badge tone="success">{c.linked}</Badge>}
          <Button type="button" size="sm" variant="secondary" disabled={start.isPending} onClick={() => start.mutate(p.provider)}>{p.linked ? c.relink : c.link}</Button>
        </span>
      ))}
      {start.isError && <p role="alert" className="text-small text-danger">{c.failed}</p>}
    </section>
  );
}

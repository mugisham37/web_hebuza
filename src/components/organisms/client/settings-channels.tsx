"use client";
import { useEffect, useState } from "react";
import { webPushCopy } from "@/content/pages/web-push";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { Button } from "@/components/atoms/button";
import { Field, Input, Switch } from "@/components/atoms/field";
import { ErrorState, Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { Panel, useC4 } from "@/components/molecules/client/client";

const CATS = [
  "requests",
  "documents",
  "payments",
  "messages",
  "deadlines",
  "news",
] as const;
const CHANNELS = ["inapp", "sms", "whatsapp", "email"] as const;
type Cat = (typeof CATS)[number];
type Ch = (typeof CHANNELS)[number];
type Matrix = Record<Cat, Record<Ch, boolean>>;
// Server contract: { email_enabled, digest_enabled, matrix?, quiet? } (notification_preferences.channels, F-NTF-03).
type Prefs = {
  email_enabled: boolean;
  digest_enabled: boolean;
  matrix?: Matrix;
  quiet?: { on: boolean; from: string; to: string };
};
/** In-app for requests/documents/payments is mandatory (case-critical, F-NTF-01). */
const LOCKED = (cat: Cat, ch: Ch) => ch === "inapp" && cat !== "news";

const defaults = (email: boolean): Matrix =>
  Object.fromEntries(
    CATS.map((c) => [
      c,
      { inapp: true, sms: c !== "news", whatsapp: false, email },
    ]),
  ) as Matrix;

/** C13 Notification channels: category × channel matrix + quiet hours (GET/PUT /api/me/notification-preferences). */
export function ChannelSettings() {
  const { c } = useC4();
  const q = useQuery({
    queryKey: ["c4", "prefs"],
    queryFn: () => unwrap<Prefs>(api.GET("/api/me/notification-preferences")),
  });
  if (q.isPending) return <Skeleton className="h-96 w-full " />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <div className="grid gap-6">
      <Editor
        initial={q.data}
        key={q.dataUpdatedAt}
        copy={c.settings.channels}
        saved={c.saved}
        failed={c.generic}
      />
      <PushToggle />
    </div>
  );
}

/** F-NTF-18: subscribe this browser to payload-less web push (hidden when the server has no VAPID key). */
function PushToggle() {
  const { locale } = useC4();
  const k = webPushCopy(locale);
  const toast = useToast();
  const key = useQuery({ queryKey: ["push", "vapid"], queryFn: () => unwrap<{ publicKey: string | null }>(api.GET("/api/push/vapid-key")) });
  const [on, setOn] = useState<boolean | null>(null);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setOn(!!s));
  }, [supported]);
  if (!supported || !key.data?.publicKey || on === null) return null;
  const toggle = async (next: boolean) => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const cur = await reg.pushManager.getSubscription();
      if (!next) {
        if (cur) {
          await unwrap(api.DELETE("/api/me/push-subscriptions", { body: { endpoint: cur.endpoint } }));
          await cur.unsubscribe();
        }
        return setOn(false);
      }
      if ((await Notification.requestPermission()) !== "granted") return toast({ title: k.blocked, tone: "danger" });
      const raw = Uint8Array.from(atob(key.data!.publicKey!.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
      const sub = cur ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw }));
      await unwrap(api.POST("/api/me/push-subscriptions", { body: { endpoint: sub.endpoint } }));
      setOn(true);
    } catch {
      toast({ title: k.failed, tone: "danger" });
    }
  };
  return (
    <Panel icon="message" title={k.title} body={k.body}>
      <Switch label={k.on} checked={on} onChange={(e) => void toggle(e.target.checked)} />
    </Panel>
  );
}

function Editor({
  initial,
  copy: k,
  saved,
  failed,
}: {
  initial: Prefs;
  copy: ReturnType<typeof useC4>["c"]["settings"]["channels"];
  saved: string;
  failed: string;
}) {
  const toast = useToast();
  const [m, setM] = useState<Matrix>(
    initial.matrix ?? defaults(initial.email_enabled),
  );
  const [quiet, setQuiet] = useState(
    initial.quiet ?? { on: false, from: "21:00", to: "07:00" },
  );
  const save = useMutation({
    mutationFn: () => {
      const body: Prefs = {
        email_enabled: CATS.some((x) => m[x].email),
        digest_enabled: initial.digest_enabled,
        matrix: m,
        quiet,
      };
      return unwrap(
        api.PUT("/api/me/notification-preferences", { body }),
      );
    },
    onSuccess: () => toast({ title: saved, tone: "success" }),
    onError: () => toast({ title: failed, tone: "danger" }),
  });
  const flip = (cat: Cat, ch: Ch) =>
    setM((x) => ({ ...x, [cat]: { ...x[cat], [ch]: !x[cat][ch] } }));

  return (
    <div className="grid gap-5">
      <Panel icon="message" title={k.title} body={k.lede}>
        <div className="overflow-x-auto">
          <table data-guide="client-channels-table" className="w-full min-w-[32rem] text-left">
            <caption className="sr-only">{k.title}</caption>
            <thead>
              <tr className="text-small text-fg-subtle">
                <th scope="col" className="py-2 font-medium">
                  {k.topic}
                </th>
                {CHANNELS.map((ch) => (
                  <th
                    key={ch}
                    scope="col"
                    className="px-2 py-2 text-center font-medium"
                  >
                    {k.channels[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CATS.map((cat) => (
                <tr key={cat}>
                  <th scope="row" className="py-3 pr-4 text-body font-normal">
                    {k.cats[cat]}
                  </th>
                  {CHANNELS.map((ch) => (
                    <td key={ch} className="px-2 py-3 text-center">
                      <Switch
                        label={
                          <span className="sr-only">{`${k.cats[cat]}, ${k.channels[ch]}`}</span>
                        }
                        checked={LOCKED(cat, ch) || m[cat][ch]}
                        disabled={LOCKED(cat, ch)}
                        title={LOCKED(cat, ch) ? k.required : undefined}
                        onChange={() => flip(cat, ch)}
                        className="gap-0"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-small text-fg-subtle">
          {k.channels.inapp}: {k.required}
        </p>
      </Panel>

      <Panel
        icon="clock"
        title={k.quiet}
        body={k.quietLede}
        action={
          <Switch
            data-guide="client-channels-quiet"
            label={<span className="sr-only">{k.quiet}</span>}
            checked={quiet.on}
            onChange={() => setQuiet((x) => ({ ...x, on: !x.on }))}
          />
        }
      >
        <div className="flex flex-wrap gap-4">
          <Field label={k.from} className="w-36">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                value={quiet.from}
                disabled={!quiet.on}
                onChange={(e) =>
                  setQuiet((x) => ({ ...x, from: e.target.value }))
                }
              />
            )}
          </Field>
          <Field label={k.to} className="w-36">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                value={quiet.to}
                disabled={!quiet.on}
                onChange={(e) =>
                  setQuiet((x) => ({ ...x, to: e.target.value }))
                }
              />
            )}
          </Field>
        </div>
      </Panel>
      <div>
        <Button data-guide="client-channels-save" dots loading={save.isPending} onClick={() => save.mutate()}>
          {k.save}
        </Button>
      </div>
    </div>
  );
}

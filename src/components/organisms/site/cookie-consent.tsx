"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { api } from "@/lib/api/client";
import { localHref } from "@/shared/i18n/config";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import type { MarketingCopy } from "@/content/marketing";

/** G3 cookie consent (F-PRV-03). Choice + policy version live in a first-party cookie; bump VERSION to re-ask everyone. */
const COOKIE = "hebuza_consent";
const VERSION = "1";
export type Consent = { analytics: boolean; marketing: boolean };

export function parseConsent(raw: string | undefined): Consent | null {
  const m = raw?.match(/^v(\w+)\.a([01])\.m([01])$/);
  return m && m[1] === VERSION
    ? { analytics: m[2] === "1", marketing: m[3] === "1" }
    : null;
}
const read = () =>
  document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))?.[1] ?? "";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function save(c: Consent) {
  document.cookie = `${COOKIE}=v${VERSION}.a${+c.analytics}.m${+c.marketing}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  listeners.forEach((fn) => fn());
  record(c);
}
/** Anonymous banner id so the server ledger can tie a visitor's choices together (F-CMS-15). */
function anonId() {
  const k = "hebuza_cid";
  let id = document.cookie.match(new RegExp(`(?:^|; )${k}=([^;]*)`))?.[1];
  if (!id) {
    id = crypto.randomUUID();
    document.cookie = `${k}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }
  return id;
}
/** Server-side consent ledger; best-effort (the cookie stays the source of truth for gating). */
function record(c: Consent) {
  void api.POST("/api/consent", {
    params: { header: { "user-agent": navigator.userAgent } }, // typed as required; browsers send it anyway
    body: {
      anon_id: anonId(),
      source: "cookie_banner",
      policy_version: `cookies-v${VERSION}`,
      purposes: { cookies_analytics: c.analytics, cookies_marketing: c.marketing },
    },
  }).catch(() => undefined);
}
/** Raw cookie string, "" before choice, "ssr" on the server (render nothing until hydrated). */
const useRaw = () => useSyncExternalStore(subscribe, read, () => "ssr");

/** Gate GA4 / Ads loaders on this; null until the visitor has chosen. */
export function useConsent(): Consent | null {
  return parseConsent(useRaw());
}

/** Footer "Cookie settings" link — reopens the dialog from anywhere. */
export function CookieSettingsButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("hebuza:consent"))}
      className="hover:text-fg-heading"
    >
      {children}
    </button>
  );
}

export function CookieConsent({ copy }: { copy: MarketingCopy["consent"] }) {
  const { locale } = useI18n();
  const raw = useRaw();
  const current = parseConsent(raw);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const open = () => dialog.current?.showModal();
    window.addEventListener("hebuza:consent", open);
    return () => window.removeEventListener("hebuza:consent", open);
  }, []);

  const choose = (c: Consent) => {
    save(c);
    dialog.current?.close();
  };
  const fromForm = () => {
    const d = new FormData(form.current!);
    return { analytics: d.has("analytics"), marketing: d.has("marketing") };
  };
  const none = { analytics: false, marketing: false };

  return (
    <>
      {raw !== "ssr" && !current && (
        <div
          role="region"
          aria-label={copy.title}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-45 animate-reveal theme-dark bg-bg p-5 text-fg shadow-md sm:right-auto sm:left-4 sm:max-w-md md:p-6"
        >
          <p className="text-body">
            {copy.bar}{" "}
            <Link
              href={localHref(locale, "/legal/cookies")}
              className="underline underline-offset-4"
            >
              {copy.policy}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => choose(none)}
            >
              {copy.reject}
            </Button>
            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => dialog.current?.showModal()}
            >
              {copy.customise}
            </Button>
            <Button
              variant="primary"
              size="sm"
              dots
              onClick={() => choose({ analytics: true, marketing: true })}
            >
              {copy.accept}
            </Button>
          </div>
        </div>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="consent-title"
        className="m-auto w-[min(100%-1.5rem,32rem)] bg-white p-0 text-fg shadow-md backdrop:bg-ink-950/60"
      >
        <form
          ref={form}
          key={raw}
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            choose(fromForm());
          }}
          className="p-6 md:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="consent-title" className="text-h3">
              {copy.title}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={copy.close}
              className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center hover:bg-navy-50"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <p className="mt-2 text-body text-fg-muted">{copy.intro}</p>
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {(
              [
                ["essential", copy.essential, copy.essentialBody],
                ["analytics", copy.analytics, copy.analyticsBody],
                ["marketing", copy.marketing, copy.marketingBody],
              ] as const
            ).map(([k, label, body]) => (
              <li key={k}>
                <label className="flex cursor-pointer items-start gap-3 py-4 has-disabled:cursor-default">
                  <Icon
                    name="lock"
                    size={16}
                    className="mt-1 shrink-0 text-navy-700"
                  />
                  <span className="grid flex-1 gap-1">
                    <span className="text-label">{label}</span>
                    <span className="text-small text-fg-subtle">{body}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    name={k}
                    disabled={k === "essential"}
                    defaultChecked={
                      k === "essential" || !!current?.[k]
                    }
                    className="peer mt-1 h-6 w-10 shrink-0 cursor-pointer appearance-none bg-border-strong transition-colors duration-(--duration-fast) before:block before:size-5 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow-sm before:transition-transform before:duration-(--duration-fast) checked:bg-secondary checked:before:translate-x-[1.125rem] disabled:cursor-default disabled:opacity-50"
                  />
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => choose(none)}>
              {copy.reject}
            </Button>
            <Button type="submit" dots>
              {copy.save}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

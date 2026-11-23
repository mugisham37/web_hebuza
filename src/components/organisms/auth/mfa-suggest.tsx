"use client";
// Optional-2FA nudge (F-IAM-05): a small, non-modal tour-style card shown once per sign-in when the API says `suggest`
// (it is false for enrolled users, view-as sessions and after a snooze). "Not now", X and Escape snooze until next sign-in.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { useSession } from "@/lib/auth/session";
import { opsTeam } from "@/content/pages/ops-team";
import { cKeys, mfaSnooze, useMfaStatus } from "@/lib/ops/c";
import { Dialog } from "@/components/atoms/dialog";
import { Button } from "@/components/atoms/button";
import { Icon } from "@/components/atoms/icon";
import { useToast } from "@/components/atoms/toast";
import { MfaEnrol } from "@/components/organisms/auth/mfa-setup";

let handled = false; // once per page session; the server snooze covers reloads

export function MfaSuggest() {
  const { locale, t } = useI18n();
  const c = opsTeam(locale);
  const { status } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const mfa = useMfaStatus(status === "authenticated" && !handled);
  const [state, setState] = useState<"card" | "setup" | "closed">("card");
  const card = useRef<HTMLDivElement>(null);
  const show = state === "card" && !handled && mfa.data?.suggest === true;

  const dismiss = () => {
    handled = true;
    setState("closed");
    mfaSnooze().catch(() => null);
  };
  useEffect(() => {
    if (!show) return;
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  return (
    <>
      {show && (
        <div
          ref={card}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="mfa-suggest-title"
          aria-describedby="mfa-suggest-body"
          className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 w-[calc(100%-2rem)] max-w-sm border border-border bg-surface p-5 shadow-lg outline-none motion-safe:animate-reveal"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("common.close")}
            className="absolute top-2 right-2 inline-flex size-9 items-center justify-center text-fg-muted hover:bg-navy-50 hover:text-fg-heading"
          >
            <Icon name="x" size={16} aria-hidden />
          </button>
          <span
            aria-hidden
            className="mb-3 flex size-10 items-center justify-center rounded-full bg-navy-50 text-navy-700"
          >
            <Icon name="shield" size={20} />
          </span>
          <h2
            id="mfa-suggest-title"
            className="pr-8 text-label-lg text-fg-heading"
          >
            {c.suggest.title}
          </h2>
          <p id="mfa-suggest-body" className="mt-1 text-small text-fg-muted">
            {c.suggest.body}
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {c.suggest.later}
            </Button>
            <Button
              size="sm"
              onClick={() => ((handled = true), setState("setup"))}
            >
              {c.suggest.setup}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={state === "setup"}
        onClose={() => state === "setup" && dismiss()}
        title={c.suggest.title}
      >
        {state === "setup" && (
          <MfaEnrol
            finishLabel={c.suggest.done}
            onFinish={() => {
              setState("closed");
              qc.invalidateQueries({ queryKey: cKeys.mfa });
              toast({ title: c.security.enabled, tone: "success" });
            }}
          />
        )}
      </Dialog>
    </>
  );
}

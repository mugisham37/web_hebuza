"use client";
import { useState, type ReactNode } from "react";
import {
  AiLabel, BkgStatus, Captcha, Citations, ConfidenceBadge, HoldTimer, IllusAssistantResting, IllusHandoff, IllusKbEmpty, IllusLinkExpired, IllusNoSlots,
  JoinButton, KbStatusPill, ModeTag, PolicyNote, PriceBadge, ReminderTimeline, StatePanel, TypingDots, TzNote,
} from "@/components/atoms/booking";
import type { BookingStatus, KbStatus, Mode } from "@/shared/booking/types";

const Box = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-3 border border-border bg-white p-5"><h2 className="text-label">{title}</h2><div className="flex flex-wrap items-start gap-3">{children}</div></section>
);
// Fixed demo instants (relative to page load) so every state renders.
export function BookingKitShowcase() {
  const [now] = useState(() => Date.now());
  const iso = (ms: number) => new Date(now + ms).toISOString();
  const [captcha, setCaptcha] = useState("");
  const statuses: BookingStatus[] = ["held", "pending_payment", "confirmed", "rescheduled", "cancelled_by_client", "cancelled_by_staff", "completed", "no_show", "expired"];
  const kb: KbStatus[] = ["draft", "approved_for_ai", "indexed", "stale", "withdrawn", "changes_requested"];
  const modes: Mode[] = ["office", "video", "phone", "premises"];
  return (
    <div className="container-page grid gap-5 px-gutter py-10">
      <h1 className="text-h2">Booking & assistant kit</h1>
      <Box title="Status pills">{statuses.map((s) => <BkgStatus key={s} status={s} />)}{kb.map((s) => <KbStatusPill key={s} status={s} />)}</Box>
      <Box title="Modes & price">{modes.map((m) => <ModeTag key={m} mode={m} />)}<PriceBadge price={0} /><PriceBadge price={20_000} /></Box>
      <Box title="Hold timer (fresh · warn · expired · offline)"><HoldTimer expiresAt={iso(600_000)} /><HoldTimer expiresAt={iso(90_000)} /><HoldTimer expiresAt={iso(-1)} /><HoldTimer expiresAt={iso(400_000)} online={false} /></Box>
      <Box title="Join (locked · open · ended)">
        <JoinButton state="locked" startsAt={iso(3_600_000)} fetchUrl={async () => ({ url: "#" })} />
        <JoinButton state="open" startsAt={iso(300_000)} fetchUrl={async () => ({ url: "#" })} />
        <JoinButton state="ended" startsAt={iso(-7_200_000)} fetchUrl={async () => ({ url: "#" })} />
      </Box>
      <Box title="Timezone & policy"><TzNote at={iso(86_400_000)} /><PolicyNote /></Box>
      <Box title="Reminders"><div className="w-full max-w-md"><ReminderTimeline items={[
        { kind: "confirmation", at: iso(-60_000), channel: "whatsapp", status: "sent" },
        { kind: "24h", at: iso(43_200_000), channel: "whatsapp", status: "deferred" },
        { kind: "1h", at: iso(82_800_000), channel: "sms", status: "planned" },
        { kind: "adviser_15m", at: iso(85_500_000), channel: "email", status: "skipped" },
      ]} /></div></Box>
      <Box title="Assistant atoms"><AiLabel /><AiLabel kind="assistant" /><TypingDots /><ConfidenceBadge pct={0.82} />
        <div className="w-full"><Citations items={[1, 2, 3, 4, 5].map((i) => ({ id: `c${i}`, title: `Guide ${i}: registering a company`, url: "/knowledge", updatedAt: "2026-11-03", sourceLang: i === 2 ? "en" : "fr" }))} /></div>
      </Box>
      <Box title="Captcha"><Captcha value={captcha} onChange={setCaptcha} /><Captcha value="" onChange={() => {}} error="Complete the check." /></Box>
      <Box title="Illustrations">{[IllusAssistantResting, IllusNoSlots, IllusHandoff, IllusLinkExpired, IllusKbEmpty].map((I, i) => <I key={i} className="size-20 text-navy-700" />)}</Box>
      <StatePanel art={<IllusNoSlots />} title="No times this week" body="Next available: Tue 18 Nov" />
    </div>
  );
}

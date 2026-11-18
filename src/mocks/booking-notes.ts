// Booking & AI notifications (plan 11 §8.3) produced from the live booking/assistant worlds, so deep links hit real ids.
// `type` + `vars` let the UI localise (content/pages/notification-types.ts); `text` is the server-side English fallback.
import { BOOKINGS, ownerAdviser } from "./booking-world";
import { HANDOFFS } from "./assistant-world";
import { LEADS } from "./marketing-world";
import { notifCopy } from "@/content/pages/notification-types";

export type BookingNote = {
  id: string;
  type: string;
  vars: Record<string, string>;
  text: string;
  href: string;
  at: string;
  read: boolean;
};
type Audience = "client" | "ops" | "agent" | "marketing";

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const note = (
  id: string,
  type: string,
  vars: Record<string, string>,
  href: string,
  min: number,
  read = false,
): BookingNote => ({
  id,
  type,
  vars,
  href,
  at: ago(min),
  read,
  text: notifCopy("en", type, vars)?.title ?? type,
});

export function bookingNotes(
  audience: Audience,
  personaKey?: string,
): BookingNote[] {
  const live = BOOKINGS.filter((b) => b.reference);
  const v = (b: (typeof live)[number]): Record<string, string> => ({
    ref: b.reference!,
    type: b.typeName.en,
    type_en: b.typeName.en,
    type_fr: b.typeName.fr,
    type_rw: b.typeName.rw,
    when: b.startsAt,
    name: b.contact.name,
  });
  if (audience === "client") {
    const mine = live.filter((b) => b.clientId === "cl-aline");
    const next = mine.find((b) => b.status === "confirmed");
    const done = mine.find((b) => b.status === "completed");
    return [
      ...(next
        ? [
            note(
              `bn-c-rem-${next.id}`,
              "booking.reminder_24h",
              v(next),
              `/bookings/${next.id}`,
              30,
            ),
            note(
              `bn-c-conf-${next.id}`,
              "booking.confirmed",
              v(next),
              `/bookings/${next.id}`,
              3 * 24 * 60,
              true,
            ),
          ]
        : []),
      ...(done
        ? [
            note(
              `bn-c-out-${done.id}`,
              "consultation.outcome_ready",
              v(done),
              `/bookings/${done.id}`,
              11 * 24 * 60,
              true,
            ),
          ]
        : []),
    ];
  }
  if (audience === "agent") {
    const me = ownerAdviser(personaKey);
    return live
      .filter((b) => b.adviser?.id === me && b.status === "confirmed")
      .slice(0, 2)
      .map((b, i) =>
        i === 0
          ? note(
              `bn-a-15-${b.id}`,
              "booking.reminder_15m",
              v(b),
              `/agent/bookings/${b.id}`,
              2,
            )
          : note(
              `bn-a-adv-${b.id}`,
              "booking.adviser_changed",
              { ...v(b), name: b.adviser?.name ?? "" },
              `/agent/bookings/${b.id}`,
              6 * 60,
              true,
            ),
      );
  }
  if (audience === "marketing") {
    const lead = LEADS[1] ?? LEADS[0];
    return lead
      ? [
          note(
            `bn-m-lead-${lead.id}`,
            "ai.lead_captured",
            { name: lead.name },
            `/marketing/leads/${lead.id}`,
            15,
          ),
        ]
      : [];
  }
  const noShow = live.find((b) => b.status === "no_show");
  const today = live.find((b) => b.status === "confirmed");
  return [
    ...HANDOFFS.filter((h) => !h.claimedBy).map((h) =>
      note(
        `bn-o-ho-${h.id}`,
        "ai.handoff",
        { name: h.who, summary: h.summary },
        `/ops/conversations/${h.conversationId}`,
        Math.max(1, Math.round((Date.now() - Date.parse(h.at)) / 60_000)),
      ),
    ),
    ...(today
      ? [
          note(
            `bn-o-req-${today.id}`,
            "consultation_request.new",
            v(today),
            `/ops/bookings/${today.id}`,
            40,
          ),
        ]
      : []),
    ...(noShow
      ? [
          note(
            `bn-o-ns-${noShow.id}`,
            "booking.no_show",
            v(noShow),
            `/ops/bookings/${noShow.id}`,
            26 * 60,
            true,
          ),
        ]
      : []),
  ];
}

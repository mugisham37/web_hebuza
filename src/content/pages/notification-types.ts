// Booking & AI notification copy (plan 11 §8.3). Mocks send `type` + `vars`; bells and the notification centre
// render the localised line here and fall back to the server's own text for unknown types.
import type { Locale } from "@/shared/i18n/config";
import { formatDateTime } from "@/shared/format";

export type NotifType =
  | "booking.confirmed"
  | "booking.reminder_24h"
  | "booking.reminder_1h"
  | "booking.reminder_15m"
  | "booking.rescheduled"
  | "booking.cancelled"
  | "booking.no_show"
  | "booking.adviser_changed"
  | "booking.payment_late_refunded"
  | "consultation_request.new"
  | "waitlist.offer"
  | "consultation.outcome_ready"
  | "ai.handoff"
  | "ai.lead_captured";

type Copy = Record<NotifType, { title: string; body: string }>;

const en: Copy = {
  "booking.confirmed": {
    title: "Consultation confirmed, {ref}",
    body: "{type} on {when}.",
  },
  "booking.reminder_24h": {
    title: "Reminder: consultation tomorrow",
    body: "{type} on {when} ({ref}).",
  },
  "booking.reminder_1h": {
    title: "Your consultation starts in 1 hour",
    body: "{type} at {when} ({ref}).",
  },
  "booking.reminder_15m": {
    title: "Session in 15 minutes, {name}",
    body: "{type} at {when} ({ref}).",
  },
  "booking.rescheduled": {
    title: "Consultation moved, {ref}",
    body: "New time: {when}.",
  },
  "booking.cancelled": {
    title: "Consultation cancelled, {ref}",
    body: "{name} · {type}.",
  },
  "booking.no_show": {
    title: "No-show, {name}",
    body: "{type} on {when} ({ref}).",
  },
  "booking.adviser_changed": {
    title: "Adviser changed, {ref}",
    body: "{name} is now your adviser for {when}.",
  },
  "booking.payment_late_refunded": {
    title: "Late payment refunded, {ref}",
    body: "The slot was released before your payment arrived; the money is on its way back.",
  },
  "consultation_request.new": {
    title: "New callback request, {name}",
    body: "Wants a consultation; call back today.",
  },
  "waitlist.offer": {
    title: "A slot opened up",
    body: "{type} on {when}. Book it before someone else does.",
  },
  "consultation.outcome_ready": {
    title: "Your next steps are ready, {ref}",
    body: "Your adviser shared the summary of {type}.",
  },
  "ai.handoff": {
    title: "Assistant handed over a conversation, {name}",
    body: "{summary}",
  },
  "ai.lead_captured": {
    title: "New lead from the assistant, {name}",
    body: "Captured during an assistant chat.",
  },
};

const fr: Copy = {
  "booking.confirmed": {
    title: "Consultation confirmée, {ref}",
    body: "{type} le {when}.",
  },
  "booking.reminder_24h": {
    title: "Rappel : consultation demain",
    body: "{type} le {when} ({ref}).",
  },
  "booking.reminder_1h": {
    title: "Votre consultation commence dans 1 heure",
    body: "{type} à {when} ({ref}).",
  },
  "booking.reminder_15m": {
    title: "Séance dans 15 minutes, {name}",
    body: "{type} à {when} ({ref}).",
  },
  "booking.rescheduled": {
    title: "Consultation déplacée, {ref}",
    body: "Nouvel horaire : {when}.",
  },
  "booking.cancelled": {
    title: "Consultation annulée, {ref}",
    body: "{name} · {type}.",
  },
  "booking.no_show": {
    title: "Absence, {name}",
    body: "{type} le {when} ({ref}).",
  },
  "booking.adviser_changed": {
    title: "Changement de conseiller, {ref}",
    body: "{name} est désormais votre conseiller pour le {when}.",
  },
  "booking.payment_late_refunded": {
    title: "Paiement tardif remboursé, {ref}",
    body: "Le créneau a été libéré avant votre paiement ; le remboursement est en cours.",
  },
  "consultation_request.new": {
    title: "Nouvelle demande de rappel, {name}",
    body: "Souhaite une consultation ; rappeler aujourd'hui.",
  },
  "waitlist.offer": {
    title: "Un créneau s'est libéré",
    body: "{type} le {when}. Réservez-le avant les autres.",
  },
  "consultation.outcome_ready": {
    title: "Vos prochaines étapes sont prêtes, {ref}",
    body: "Votre conseiller a partagé le résumé de {type}.",
  },
  "ai.handoff": {
    title: "L'assistant a transféré une conversation, {name}",
    body: "{summary}",
  },
  "ai.lead_captured": {
    title: "Nouveau prospect via l'assistant, {name}",
    body: "Capté pendant une discussion avec l'assistant.",
  },
};

const rw: Copy = {
  "booking.confirmed": {
    title: "Inama yemejwe, {ref}",
    body: "{type} ku wa {when}.",
  },
  "booking.reminder_24h": {
    title: "Kwibutsa: inama ni ejo",
    body: "{type} ku wa {when} ({ref}).",
  },
  "booking.reminder_1h": {
    title: "Inama yawe itangira mu isaha 1",
    body: "{type} saa {when} ({ref}).",
  },
  "booking.reminder_15m": {
    title: "Inama mu minota 15, {name}",
    body: "{type} saa {when} ({ref}).",
  },
  "booking.rescheduled": {
    title: "Inama yimuwe, {ref}",
    body: "Igihe gishya: {when}.",
  },
  "booking.cancelled": {
    title: "Inama yahagaritswe, {ref}",
    body: "{name} · {type}.",
  },
  "booking.no_show": {
    title: "Ntiyitabiriye, {name}",
    body: "{type} ku wa {when} ({ref}).",
  },
  "booking.adviser_changed": {
    title: "Umujyanama yahindutse, {ref}",
    body: "{name} ni we mujyanama wawe ku wa {when}.",
  },
  "booking.payment_late_refunded": {
    title: "Ubwishyu bwatinze bwasubijwe, {ref}",
    body: "Umwanya warekuwe mbere y'uko ubwishyu bugera; amafaranga arimo gusubizwa.",
  },
  "consultation_request.new": {
    title: "Gusaba guhamagarwa gushya, {name}",
    body: "Arashaka inama; muhamagare uyu munsi.",
  },
  "waitlist.offer": {
    title: "Habonetse umwanya",
    body: "{type} ku wa {when}. Wufate mbere y'abandi.",
  },
  "consultation.outcome_ready": {
    title: "Intambwe zikurikira ziteguye, {ref}",
    body: "Umujyanama wawe yasangije incamake ya {type}.",
  },
  "ai.handoff": {
    title: "Umufasha yohereje ikiganiro ku muntu, {name}",
    body: "{summary}",
  },
  "ai.lead_captured": {
    title: "Umukiriya mushya uturutse ku mufasha, {name}",
    body: "Yabonetse mu kiganiro n'umufasha.",
  },
};

const COPY: Record<Locale, Copy> = { en, fr, rw };

/** Localised title/body for a typed notification, or null so callers keep the server text. */
export function notifCopy(
  locale: Locale,
  type: string | undefined,
  vars: Record<string, string> = {},
) {
  const c = type ? COPY[locale][type as NotifType] : undefined;
  if (!c) return null;
  // `when` arrives as ISO; `type_<locale>` carries the localised consultation name.
  const v: Record<string, string> = { ...vars, type: vars[`type_${locale}`] ?? vars.type ?? "" };
  if (vars.when) v.when = formatDateTime(vars.when, locale);
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
  return { title: fill(c.title), body: fill(c.body) };
}

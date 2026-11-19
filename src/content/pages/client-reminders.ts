// CLP-12 reminders hub copy. rw/fr are first drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Reminders",
  lede: "Everything waiting on you, in one place.",
  kinds: { document: "Document requested", payment: "Payment due", quote: "Quote to review", expiry: "Document expiring" },
  due: "Due {date}",
  done: "Done", snooze: "Snooze 3 days", reopen: "Reopen",
  tabs: { open: "Open", snoozed: "Snoozed", done: "Done" },
  empty: "Nothing waiting on you.",
  failed: "Could not update. Try again.",
};
export type RemindersCopy = typeof en;
const rw: RemindersCopy = {
  title: "Ibyibutsa", lede: "Ibigutegereje byose ahantu hamwe.",
  kinds: { document: "Inyandiko isabwa", payment: "Kwishyura", quote: "Igiciro cyo gusuzuma", expiry: "Inyandiko irenda kurangira" },
  due: "Bitarenze {date}", done: "Byarangiye", snooze: "Subika iminsi 3", reopen: "Ongera ufungure",
  tabs: { open: "Bifunguye", snoozed: "Byasubitswe", done: "Byarangiye" },
  empty: "Nta kigutegereje.", failed: "Ntibyakunze. Ongera ugerageze.",
};
const fr: RemindersCopy = {
  title: "Rappels", lede: "Tout ce qui vous attend, au même endroit.",
  kinds: { document: "Document demandé", payment: "Paiement dû", quote: "Devis à examiner", expiry: "Document bientôt expiré" },
  due: "Avant le {date}", done: "Fait", snooze: "Reporter de 3 jours", reopen: "Rouvrir",
  tabs: { open: "Ouverts", snoozed: "Reportés", done: "Faits" },
  empty: "Rien ne vous attend.", failed: "Mise à jour impossible. Réessayez.",
};
export const remindersCopy = (l: Locale): RemindersCopy => ({ en, fr, rw })[l];

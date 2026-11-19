// F-CAL-04 client compliance calendar copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Compliance calendar",
  lede: "Your filing and renewal deadlines. We remind you before each one.",
  empty: "No deadlines yet",
  emptyBody: "When you subscribe to a recurring service, its deadlines appear here.",
  subscribe: "Add to my calendar app",
  subscribeHint: "Copy this private link into Google Calendar, Outlook or Apple Calendar (subscribe by URL). Keep it to yourself.",
  copy: "Copy link",
  copied: "Link copied",
  ask: "Ask HEBUZA",
  due: "Due",
  status: { upcoming: "Upcoming", in_progress: "In progress", done: "Done", missed: "Missed", skipped: "Not needed" } as Record<string, string>,
};
type Copy = typeof en;
const fr: Copy = {
  title: "Calendrier de conformité",
  lede: "Vos échéances de déclaration et de renouvellement. Nous vous les rappelons à l'avance.",
  empty: "Aucune échéance",
  emptyBody: "Quand vous souscrivez un service récurrent, ses échéances apparaissent ici.",
  subscribe: "Ajouter à mon agenda",
  subscribeHint: "Copiez ce lien privé dans Google Agenda, Outlook ou Apple Calendrier (abonnement par URL). Ne le partagez pas.",
  copy: "Copier le lien",
  copied: "Lien copié",
  ask: "Demander à HEBUZA",
  due: "Échéance",
  status: { upcoming: "À venir", in_progress: "En cours", done: "Fait", missed: "Manquée", skipped: "Non requis" },
};
const rw: Copy = {
  title: "Ingengabihe y'inshingano",
  lede: "Amatariki ntarengwa yo gutanga imenyekanisha no kuvugurura. Tukwibutsa mbere ya buri rimwe.",
  empty: "Nta tariki ntarengwa irahari",
  emptyBody: "Niwiyandikisha kuri serivisi isubirwamo, amatariki yayo azagaragara hano.",
  subscribe: "Shyira muri kalendari yanjye",
  subscribeHint: "Koporora iyi link yihariye uyishyire muri Google Calendar, Outlook cyangwa Apple Calendar. Ntuyisangize abandi.",
  copy: "Koporora link",
  copied: "Link yakoporowe",
  ask: "Baza HEBUZA",
  due: "Itariki ntarengwa",
  status: { upcoming: "Biri imbere", in_progress: "Birakorwa", done: "Byarangiye", missed: "Byarenze", skipped: "Ntibikenewe" },
};
export const calendarCopy = (l: Locale) => ({ en, fr, rw })[l];

// F-RPT-05 report subscription copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";

const en = { subscribe: "Email me this report", weekly: "Weekly (Mondays)", monthly: "Monthly (1st)", format: "Format", save: "Subscribe", saved: "Subscribed. It arrives by email.", active: "You get this report", stop: "Stop", stopped: "Subscription stopped.", failed: "Couldn't save. Try again.", cancel: "Cancel" };
type Copy = typeof en;
const fr: Copy = { subscribe: "Recevoir ce rapport par e-mail", weekly: "Hebdomadaire (lundi)", monthly: "Mensuel (le 1er)", format: "Format", save: "S'abonner", saved: "Abonnement enregistré. Il arrivera par e-mail.", active: "Vous recevez ce rapport", stop: "Arrêter", stopped: "Abonnement arrêté.", failed: "Échec de l'enregistrement. Réessayez.", cancel: "Annuler" };
const rw: Copy = { subscribe: "Nyoherereza iyi raporo kuri imeyili", weekly: "Buri cyumweru (ku wa mbere)", monthly: "Buri kwezi (ku itariki 1)", format: "Ubwoko bwa dosiye", save: "Iyandikishe", saved: "Byemejwe. Izaza kuri imeyili.", active: "Wakira iyi raporo", stop: "Hagarika", stopped: "Byahagaritswe.", failed: "Ntibyabitswe. Ongera ugerageze.", cancel: "Reka" };
export const reportSubscribeCopy = (l: Locale) => ({ en, fr, rw })[l];

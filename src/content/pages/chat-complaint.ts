// F-MSG-14 complaint flag copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const en = { flag: "Flag as complaint", title: "Open a complaint ticket", summary: "What is the complaint about?", hint: "At least 10 characters. The client sees this ticket in Help.", create: "Open ticket", done: "Complaint {ref} opened", cancel: "Cancel" };
type Copy = typeof en;
const fr: Copy = { flag: "Signaler une plainte", title: "Ouvrir un ticket de plainte", summary: "Objet de la plainte", hint: "Au moins 10 caractères. Le client voit ce ticket dans Aide.", create: "Ouvrir le ticket", done: "Plainte {ref} ouverte", cancel: "Annuler" };
const rw: Copy = { flag: "Andika nk'ikirego", title: "Fungura itike y'ikirego", summary: "Ikirego kivuga iki?", hint: "Nibura inyuguti 10. Umukiriya abona iyi tike mu Bufasha.", create: "Fungura itike", done: "Ikirego {ref} cyafunguwe", cancel: "Reka" };
export const complaintCopy = (l: Locale) => ({ en, fr, rw })[l];

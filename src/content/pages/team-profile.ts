// F-WRK-16 public team profile (worker opt-in + marketing approval). rw/fr are drafts for native review.
import type { Locale } from "@/shared/i18n/config";
const en = {
  title: "Public team profile",
  body: "Optional. If you opt in, your name, title and this short bio can appear on hebuza.rw/about/team after marketing approves it. No contact details or CV are published.",
  optIn: "Show me on the public team page", jobTitle: "Title shown", bio: "Short bio", save: "Save", saved: "Saved — sent for approval.",
  status: { pending: "Waiting for marketing approval", approved: "Live on the team page", rejected: "Not approved" } as Record<string, string>,
  queue: "Team page requests", approve: "Approve", reject: "Reject", note: "Note to the worker (optional)", empty: "No opt-in requests.", decided: "Decision saved.",
};
type Copy = typeof en;
const rw: Copy = {
  title: "Umwirondoro ku rubuga",
  body: "Si ngombwa. Niwemera, izina ryawe, umwanya n'iyi ncamake bishobora kugaragara kuri hebuza.rw/about/team nyuma y'uko abashinzwe kwamamaza babyemeje. Nta makuru yo kukuvugisha cyangwa CV bitangazwa.",
  optIn: "Nyerekana ku rupapuro rw'itsinda", jobTitle: "Umwanya ugaragara", bio: "Incamake ngufi", save: "Bika", saved: "Byabitswe — byoherejwe kwemezwa.",
  status: { pending: "Bitegereje kwemezwa", approved: "Biragaragara ku rubuga", rejected: "Ntibyemejwe" },
  queue: "Abasaba kugaragara ku rubuga", approve: "Emeza", reject: "Anga", note: "Ubutumwa ku mukozi (si ngombwa)", empty: "Nta busabe.", decided: "Icyemezo cyabitswe.",
};
const fr: Copy = {
  title: "Profil public d'équipe",
  body: "Facultatif. Si vous acceptez, votre nom, votre titre et cette courte bio peuvent apparaître sur hebuza.rw/about/team après validation par le marketing. Aucune coordonnée ni CV n'est publié.",
  optIn: "M'afficher sur la page équipe", jobTitle: "Titre affiché", bio: "Courte bio", save: "Enregistrer", saved: "Enregistré — envoyé pour validation.",
  status: { pending: "En attente de validation", approved: "En ligne sur la page équipe", rejected: "Non validé" },
  queue: "Demandes page équipe", approve: "Valider", reject: "Refuser", note: "Note au collaborateur (facultatif)", empty: "Aucune demande.", decided: "Décision enregistrée.",
};
const ALL: Record<Locale, Copy> = { en, rw, fr };
export const teamProfileCopy = (l: Locale): Copy => ALL[l] ?? en;

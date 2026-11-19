// DOC-09 retention queue copy. rw/fr are first drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Document retention",
  lede: "Documents past their retention period. Shredding deletes the file for good; the record keeps a tombstone.",
  tabs: { open: "To decide", decided: "Decided" },
  cols: { doc: "Document", cls: "Class", case: "Case", since: "Retained since", decision: "Decision" },
  classes: { id_document: "ID document (2 y)", case_document: "Case document (5 y)", deliverable: "Deliverable (10 y)", chat_attachment: "Chat attachment (7 y)" },
  shred: "Shred", keep: "Keep", reason: "Reason (required to keep)", shredded: "Shredded", kept: "Kept",
  empty: "Nothing past retention.", done: "Saved", failed: "Could not save.",
};
export type RetentionCopy = typeof en;
const rw: RetentionCopy = {
  title: "Kubika inyandiko", lede: "Inyandiko zarengeje igihe cyo kubikwa. Gusiba bikuraho dosiye burundu; hasigara ikimenyetso.",
  tabs: { open: "Ibyo gufataho icyemezo", decided: "Byafashweho icyemezo" },
  cols: { doc: "Inyandiko", cls: "Icyiciro", case: "Dosiye", since: "Ibitswe kuva", decision: "Icyemezo" },
  classes: { id_document: "Indangamuntu (imyaka 2)", case_document: "Inyandiko ya dosiye (imyaka 5)", deliverable: "Igisubizo (imyaka 10)", chat_attachment: "Umugereka w'ikiganiro (imyaka 7)" },
  shred: "Siba burundu", keep: "Bika", reason: "Impamvu (ngombwa kubika)", shredded: "Byasibwe", kept: "Byabitswe",
  empty: "Nta nyandiko yarengeje igihe.", done: "Byabitswe", failed: "Ntibyabitswe.",
};
const fr: RetentionCopy = {
  title: "Conservation des documents", lede: "Documents au-delà de leur durée de conservation. La destruction supprime le fichier ; la fiche garde une trace.",
  tabs: { open: "À décider", decided: "Décidés" },
  cols: { doc: "Document", cls: "Catégorie", case: "Dossier", since: "Conservé depuis", decision: "Décision" },
  classes: { id_document: "Pièce d'identité (2 ans)", case_document: "Document de dossier (5 ans)", deliverable: "Livrable (10 ans)", chat_attachment: "Pièce jointe (7 ans)" },
  shred: "Détruire", keep: "Conserver", reason: "Motif (obligatoire pour conserver)", shredded: "Détruit", kept: "Conservé",
  empty: "Rien au-delà de la durée de conservation.", done: "Enregistré", failed: "Enregistrement impossible.",
};
export const opsRetention = (l: Locale): RetentionCopy => ({ en, fr, rw })[l];

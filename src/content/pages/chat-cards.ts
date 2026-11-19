// F-MSG-05 typed chat card copy for the client thread (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";

const en = {
  kinds: { appointment: "Appointment", payment_request: "Payment request", document_request: "Document request", doc_request: "Document request", quotation: "Quotation", deliverable_ready: "Your document is ready", visit_checkin: "Visit check-in", status: "Status update" } as Record<string, string>,
  accept: "Accept quotation",
  decline: "Decline",
  accepted: "You accepted this quotation",
  declined: "You declined this quotation",
  pay: "Pay now",
  upload: "Upload document",
  open: "Open",
  failed: "Couldn't send your answer. Try again.",
};
type Copy = typeof en;
const fr: Copy = {
  kinds: { appointment: "Rendez-vous", payment_request: "Demande de paiement", document_request: "Demande de document", doc_request: "Demande de document", quotation: "Devis", deliverable_ready: "Votre document est prêt", visit_checkin: "Arrivée sur place", status: "Mise à jour" },
  accept: "Accepter le devis",
  decline: "Refuser",
  accepted: "Vous avez accepté ce devis",
  declined: "Vous avez refusé ce devis",
  pay: "Payer",
  upload: "Envoyer le document",
  open: "Ouvrir",
  failed: "Votre réponse n'a pas pu être envoyée. Réessayez.",
};
const rw: Copy = {
  kinds: { appointment: "Gahunda yo guhura", payment_request: "Gusaba kwishyura", document_request: "Gusaba inyandiko", doc_request: "Gusaba inyandiko", quotation: "Igiciro cyatanzwe", deliverable_ready: "Inyandiko yawe yiteguye", visit_checkin: "Kugera ku isura", status: "Amakuru mashya" },
  accept: "Emera igiciro",
  decline: "Anga",
  accepted: "Wemeye iki giciro",
  declined: "Wanze iki giciro",
  pay: "Ishyura ubu",
  upload: "Ohereza inyandiko",
  open: "Fungura",
  failed: "Igisubizo cyawe nticyoherejwe. Ongera ugerageze.",
};
export const chatCardCopy = (l: Locale) => ({ en, fr, rw })[l];

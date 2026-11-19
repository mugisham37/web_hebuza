// F-NTF-17 manual client message copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const en = { button: "Message client", title: "Send the client a message", subject: "Title", body: "Message", channels: "Also send by", email: "Email", sms: "SMS", whatsapp: "WhatsApp", hint: "Always shown in their HEBUZA notifications. Their channel preferences and quiet hours still apply.", send: "Send", sent: "Message queued", cancel: "Cancel" };
type Copy = typeof en;
const fr: Copy = { button: "Écrire au client", title: "Envoyer un message au client", subject: "Titre", body: "Message", channels: "Envoyer aussi par", email: "E-mail", sms: "SMS", whatsapp: "WhatsApp", hint: "Toujours visible dans ses notifications HEBUZA. Ses préférences et heures calmes s'appliquent.", send: "Envoyer", sent: "Message en file d'envoi", cancel: "Annuler" };
const rw: Copy = { button: "Andikira umukiriya", title: "Oherereza umukiriya ubutumwa", subject: "Umutwe", body: "Ubutumwa", channels: "Ohereza kandi kuri", email: "Imeyili", sms: "SMS", whatsapp: "WhatsApp", hint: "Buhora bugaragara mu matangazo ye ya HEBUZA. Ibyo yahisemo n'amasaha y'ituze birubahirizwa.", send: "Ohereza", sent: "Ubutumwa bwateguwe koherezwa", cancel: "Reka" };
export const clientMessageCopy = (l: Locale) => ({ en, fr, rw })[l];

// F-FBK-02 NPS prompt copy. rw/fr are drafts for native review.
import type { Locale } from "@/shared/i18n/config";
const en = {
  q: "How likely are you to recommend HEBUZA to a friend or colleague?",
  low: "Not likely", high: "Very likely", comment: "What is the main reason for your score? (optional)",
  send: "Send", later: "Not now", thanks: "Thank you, your answer helps us improve.", error: "Could not send. Try again.",
};
type Copy = typeof en;
const rw: Copy = {
  q: "Ni ku rugero rungana iki wasaba inshuti cyangwa mugenzi wawe gukoresha HEBUZA?",
  low: "Ntibishoboka", high: "Cyane", comment: "Ni iyihe mpamvu nyamukuru y'amanota yawe? (si ngombwa)",
  send: "Ohereza", later: "Ubutaha", thanks: "Murakoze, igisubizo cyanyu kidufasha kwiteza imbere.", error: "Ntibyoherejwe. Ongera ugerageze.",
};
const fr: Copy = {
  q: "Quelle est la probabilité que vous recommandiez HEBUZA à un ami ou un collègue ?",
  low: "Peu probable", high: "Très probable", comment: "Quelle est la raison principale de votre note ? (facultatif)",
  send: "Envoyer", later: "Plus tard", thanks: "Merci, votre réponse nous aide à progresser.", error: "Envoi impossible. Réessayez.",
};
const ALL: Record<Locale, Copy> = { en, rw, fr };
export const npsCopy = (l: Locale): Copy => ALL[l] ?? en;

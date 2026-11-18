// /accessibility statement copy (spec/06 accessibility §2: known limitations + contact) in rw / en / fr.
import type { Locale } from "@/shared/i18n/config";

const en = {
  eyebrow: "Accessibility",
  title: "Accessibility statement",
  intro: "We want everyone to be able to use HEBUZA, on any device and any connection. We aim to meet WCAG 2.2 level AA on every public, client and worker page.",
  doTitle: "What you can do",
  do: [
    "Use every page with a keyboard only, with a visible focus ring and a “Skip to content” link.",
    "Zoom text to 200% and use pages at 320 px wide without scrolling sideways.",
    "Use a screen reader: pages have landmarks, labelled forms and announced status messages.",
    "Turn off motion: we respect your device's reduced-motion setting.",
    "Read every page in Kinyarwanda, English or French.",
  ],
  limitsTitle: "Known limitations",
  limits: [
    "Some generated PDFs (invoices, receipts) are not yet fully tagged for screen readers. Ask us and we will send the content in another format.",
    "Wide data tables in staff and finance areas may need sideways scrolling on small screens.",
    "Some older guides and uploaded documents may lack full text alternatives.",
    "Mobile money confirmation prompts come from your provider and are outside our control.",
  ],
  testTitle: "How we test",
  test: "Automated checks run on every page in all three languages, and we test the main journeys (apply, pay, track) with a keyboard and screen readers before each release.",
  contactTitle: "Tell us about a problem",
  contact: "If something is hard to use, or you need information in another format, contact us. We reply within {days} working days.",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  updated: "Statement reviewed: {date}",
};
type Copy = typeof en;

const rw: Copy = {
  eyebrow: "Uburyo bworoheye bose",
  title: "Itangazo ku buryo bworoheye bose",
  intro: "Turifuza ko buri wese ashobora gukoresha HEBUZA, ku gikoresho icyo ari cyo cyose na interineti iyo ari yo yose. Tugamije kubahiriza WCAG 2.2 urwego AA ku mapaji yose ya rubanda, ay'abakiriya n'ay'abakozi.",
  doTitle: "Ibyo ushobora gukora",
  do: [
    "Gukoresha buri paji ukoresheje clavier gusa, ufite ikimenyetso kigaragara n'ihuza “Jya ku bikubiyemo”.",
    "Kongera inyandiko kugeza kuri 200% no gukoresha amapaji ku bugari bwa 320 px utanyerera ku ruhande.",
    "Gukoresha porogaramu isoma ecran: amapaji afite ibice bisobanutse, amafishi afite amazina n'ubutumwa butangazwa.",
    "Guhagarika ibinyeganyega: twubahiriza igenamiterere ry'igikoresho cyawe.",
    "Gusoma buri paji mu Kinyarwanda, Icyongereza cyangwa Igifaransa.",
  ],
  limitsTitle: "Imbogamizi zizwi",
  limits: [
    "Zimwe muri PDF dukora (fagitire, inyemezabwishyu) ntiziteguye neza ku basoma ecran. Tubaze tukwoherereze ibikubiyemo mu bundi buryo.",
    "Imbonerahamwe nini mu bice by'abakozi n'imari zishobora gusaba kunyerera ku ruhande kuri telefoni.",
    "Zimwe mu nyobozi za kera n'inyandiko zashyizweho zishobora kubura ibisobanuro byuzuye.",
    "Ubutumwa bwemeza kwishyura kuri mobile money buva ku mutanga serivisi, ntibuturiho.",
  ],
  testTitle: "Uko tugenzura",
  test: "Igenzura ryikora rikorwa kuri buri paji mu ndimi eshatu, kandi tugerageza inzira z'ingenzi (gusaba, kwishyura, gukurikirana) dukoresheje clavier n'abasoma ecran mbere ya buri vugurura.",
  contactTitle: "Tubwire ikibazo",
  contact: "Niba hari ikigoye gukoresha, cyangwa ukeneye amakuru mu bundi buryo, twandikire. Dusubiza mu minsi y'akazi {days}.",
  email: "Imeli",
  phone: "Telefoni",
  whatsapp: "WhatsApp",
  updated: "Itangazo ryasuzumwe: {date}",
};

const fr: Copy = {
  eyebrow: "Accessibilité",
  title: "Déclaration d'accessibilité",
  intro: "Nous voulons que chacun puisse utiliser HEBUZA, sur n'importe quel appareil et n'importe quelle connexion. Nous visons le niveau AA des WCAG 2.2 sur toutes les pages publiques, clients et prestataires.",
  doTitle: "Ce que vous pouvez faire",
  do: [
    "Utiliser chaque page au clavier seul, avec un focus visible et un lien « Aller au contenu ».",
    "Agrandir le texte à 200 % et utiliser les pages sur 320 px de large sans défilement horizontal.",
    "Utiliser un lecteur d'écran : repères, formulaires étiquetés et messages d'état annoncés.",
    "Réduire les animations : nous respectons le réglage de votre appareil.",
    "Lire chaque page en kinyarwanda, en anglais ou en français.",
  ],
  limitsTitle: "Limites connues",
  limits: [
    "Certains PDF générés (factures, reçus) ne sont pas encore entièrement balisés pour les lecteurs d'écran. Demandez-nous et nous enverrons le contenu dans un autre format.",
    "Les grands tableaux des espaces personnel et finance peuvent nécessiter un défilement horizontal sur petit écran.",
    "Certains anciens guides et documents téléversés peuvent manquer d'alternatives textuelles complètes.",
    "Les invites de confirmation mobile money viennent de votre opérateur et échappent à notre contrôle.",
  ],
  testTitle: "Comment nous testons",
  test: "Des contrôles automatiques passent sur chaque page dans les trois langues, et nous testons les parcours principaux (demande, paiement, suivi) au clavier et avec des lecteurs d'écran avant chaque version.",
  contactTitle: "Signaler un problème",
  contact: "Si quelque chose est difficile à utiliser, ou si vous avez besoin d'une information dans un autre format, contactez-nous. Nous répondons sous {days} jours ouvrables.",
  email: "E-mail",
  phone: "Téléphone",
  whatsapp: "WhatsApp",
  updated: "Déclaration revue le : {date}",
};

export const A11Y: Record<Locale, Copy> = { en, rw, fr };

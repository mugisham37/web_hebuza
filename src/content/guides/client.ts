import type { Guide } from "./types";

// Client guides. Each step's `shot` is a screen captured by `pnpm guides:shots`; `marks` label that screen's markers in
// capture order (see scripts/guides/capture.spec.ts). rw/fr are drafts for native review.
const UPDATED = "2026-11-25";

export const CLIENT_GUIDES: Guide[] = [
  {
    slug: "create-an-account",
    audience: "client",
    cat: "start",
    minutes: 2,
    updated: UPDATED,
    popular: true,
    t: {
      en: {
        title: "Create your HEBUZA account",
        summary:
          "One account to apply, pay, upload documents and follow every request. It takes about two minutes.",
        keywords: "sign up register new account google phone email",
        facts: {
          who: "Anyone in Rwanda or abroad",
          time: "2 minutes",
          cost: "Free",
          need: ["A phone number or email", "A password you will remember"],
        },
        sections: [
          {
            id: "create",
            title: "Create the account",
            steps: [
              {
                text: "Open **Create an account** from the **Sign in** button at the top of any page.",
                shot: "signup",
                marks: [
                  "Fastest: use Google",
                  "Your phone number",
                  "Your full name",
                  "Choose a password",
                  "Create the account",
                ],
                caption: "The sign-up screen.",
              },
              {
                text: "Either tap **Sign up with Google**, or enter your **phone number** (or switch to email), your **full name** and a **password**.",
              },
              {
                text: "Tap **Create account**. We send a code by SMS or email to confirm it is really you; type it in and you are in.",
              },
            ],
            tips: [
              "Use the phone number you check every day: we send updates about your requests there.",
              "Your password needs at least 10 characters, with a number and a letter.",
            ],
          },
          { id: "dashboard", title: "Next: your dashboard and its guides", intro: "Sign in and your dashboard opens. Everything you do there has its own step-by-step guide.", steps: [{ text: "In the menu on the left, open **Guides** for every dashboard task, or tap **Help** (the **?** at the top) on any screen to see the guides for that screen.", shot: "dash-guides", marks: ["Guides for every task", "Help for this screen"] }] },
        ],
      },
      fr: {
        title: "Créer votre compte HEBUZA",
        summary:
          "Un seul compte pour faire vos demandes, payer, envoyer vos documents et suivre chaque dossier. Environ deux minutes.",
        keywords: "inscription créer compte google téléphone email",
        facts: {
          who: "Tout le monde, au Rwanda ou à l'étranger",
          time: "2 minutes",
          cost: "Gratuit",
          need: ["Un numéro de téléphone ou un email", "Un mot de passe"],
        },
        sections: [
          {
            id: "create",
            title: "Créer le compte",
            steps: [
              {
                text: "Ouvrez **Créer un compte** depuis le bouton **Se connecter** en haut de chaque page.",
                shot: "signup",
                marks: [
                  "Le plus rapide : Google",
                  "Votre numéro",
                  "Votre nom complet",
                  "Un mot de passe",
                  "Créer le compte",
                ],
                caption: "L'écran d'inscription.",
              },
              {
                text: "Touchez **S'inscrire avec Google**, ou saisissez votre **numéro** (ou passez à l'email), votre **nom complet** et un **mot de passe**.",
              },
              {
                text: "Touchez **Créer le compte**. Nous envoyons un code par SMS ou email pour confirmer ; saisissez-le et c'est prêt.",
              },
            ],
            tips: [
              "Utilisez le numéro que vous consultez chaque jour : nous y envoyons le suivi de vos demandes.",
              "Le mot de passe : au moins 10 caractères, avec un chiffre et une lettre.",
            ],
          },
          { id: "dashboard", title: "Ensuite : votre espace et ses guides", intro: "Connectez-vous et votre espace s'ouvre. Chaque tâche y a son guide pas à pas.", steps: [{ text: "Dans le menu de gauche, ouvrez **Guides** pour toutes les tâches, ou touchez **Aide** (le **?** en haut) sur n'importe quel écran pour voir ses guides.", shot: "dash-guides", marks: ["Guides de toutes les tâches", "Aide pour cet écran"] }] },
        ],
      },
      rw: {
        title: "Fungura konti yawe ya HEBUZA",
        summary:
          "Konti imwe yo gusaba, kwishyura, kohereza inyandiko no gukurikirana buri busabe. Bifata iminota ibiri.",
        keywords: "kwiyandikisha konti nshya google telefone imeyili",
        facts: {
          who: "Buri wese, mu Rwanda cyangwa hanze",
          time: "Iminota 2",
          cost: "Ni ubuntu",
          need: ["Nimero ya telefone cyangwa imeyili", "Ijambobanga uzibuka"],
        },
        sections: [
          {
            id: "create",
            title: "Fungura konti",
            steps: [
              {
                text: "Fungura **Fungura konti** uhereye kuri buto ya **Injira** iri hejuru ya buri paji.",
                shot: "signup",
                marks: [
                  "Byihuse: koresha Google",
                  "Nimero ya telefone",
                  "Amazina yawe yose",
                  "Hitamo ijambobanga",
                  "Fungura konti",
                ],
                caption: "Ahafungurirwa konti.",
              },
              {
                text: "Kanda **Iyandikishe na Google**, cyangwa wandike **nimero ya telefone** (cyangwa imeyili), **amazina yawe** n'**ijambobanga**.",
              },
              {
                text: "Kanda **Fungura konti**. Twohereza kode kuri SMS cyangwa imeyili kugira ngo twemeze ko ari wowe; yandike uhite winjira.",
              },
            ],
            tips: [
              "Koresha nimero ureba buri munsi: ni ho twohereza amakuru y'ubusabe bwawe.",
              "Ijambobanga rigomba kugira nibura inyuguti 10, harimo umubare n'inyuguti.",
            ],
          },
          { id: "dashboard", title: "Ibikurikira: konti yawe n'amabwiriza yayo", intro: "Injira, konti yawe irafunguka. Buri gikorwa ukoreramo gifite amabwiriza yacyo intambwe ku yindi.", steps: [{ text: "Mu rutonde ruri ibumoso, fungura **Amabwiriza** ku bikorwa byose, cyangwa ukande **Ubufasha** (**?** iri hejuru) kuri paji iyo ari yo yose urebe amabwiriza yayo.", shot: "dash-guides", marks: ["Amabwiriza y'ibikorwa byose", "Ubufasha kuri iyi paji"] }] },
        ],
      },
    },
  },
  {
    slug: "sign-in",
    audience: "client",
    cat: "account",
    minutes: 2,
    updated: UPDATED,
    t: {
      en: {
        title: "Sign in, and reset a forgotten password",
        summary:
          "How to sign in with your phone, email or Google, and what to do if you forgot your password.",
        keywords: "login log in password forgot reset",
        sections: [
          {
            id: "sign-in",
            title: "Sign in",
            steps: [
              {
                text: "Tap **Sign in** at the top of the page. Choose **Phone** or **Email**, type it, then your **password**, and tap **Sign in**.",
                shot: "login",
                marks: [
                  "Phone or email",
                  "Your password",
                  "Sign in",
                  "Forgot it? Reset here",
                ],
              },
            ],
            tips: [
              "Tick **Keep me signed in** only on your own phone or computer.",
            ],
          },
          {
            id: "reset",
            title: "Forgot your password",
            steps: [
              {
                text: "On the sign-in screen tap **Forgot password?** and enter your phone number or email.",
              },
              {
                text: "Type the code we send you, choose a new password and sign in again.",
              },
            ],
            warn: "HEBUZA staff will never ask for your password or your code. Do not share them, even on WhatsApp.",
          },
        ],
      },
      fr: {
        title: "Se connecter, et réinitialiser un mot de passe oublié",
        summary:
          "Se connecter avec votre téléphone, email ou Google, et que faire si vous avez oublié votre mot de passe.",
        keywords: "connexion mot de passe oublié réinitialiser",
        sections: [
          {
            id: "sign-in",
            title: "Se connecter",
            steps: [
              {
                text: "Touchez **Se connecter** en haut de la page. Choisissez **Téléphone** ou **Email**, saisissez-le, puis votre **mot de passe**, et touchez **Se connecter**.",
                shot: "login",
                marks: [
                  "Téléphone ou email",
                  "Mot de passe",
                  "Se connecter",
                  "Oublié ? Réinitialiser",
                ],
              },
            ],
            tips: [
              "Cochez **Rester connecté** uniquement sur votre propre appareil.",
            ],
          },
          {
            id: "reset",
            title: "Mot de passe oublié",
            steps: [
              {
                text: "Sur l'écran de connexion, touchez **Mot de passe oublié ?** et saisissez votre numéro ou email.",
              },
              {
                text: "Saisissez le code reçu, choisissez un nouveau mot de passe et reconnectez-vous.",
              },
            ],
            warn: "Le personnel HEBUZA ne vous demandera jamais votre mot de passe ni votre code. Ne les partagez pas, même sur WhatsApp.",
          },
        ],
      },
      rw: {
        title: "Kwinjira, no guhindura ijambobanga wibagiwe",
        summary:
          "Uko winjira ukoresheje telefone, imeyili cyangwa Google, n'icyo wakora niba wibagiwe ijambobanga.",
        keywords: "kwinjira ijambobanga wibagiwe guhindura",
        sections: [
          {
            id: "sign-in",
            title: "Kwinjira",
            steps: [
              {
                text: "Kanda **Injira** hejuru ya paji. Hitamo **Telefone** cyangwa **Imeyili**, uyandike, wandike **ijambobanga**, hanyuma ukande **Injira**.",
                shot: "login",
                marks: [
                  "Telefone cyangwa imeyili",
                  "Ijambobanga",
                  "Injira",
                  "Wibagiwe? Rihindure",
                ],
              },
            ],
            tips: [
              "Hitamo **Guma winjiye** gusa kuri telefone cyangwa mudasobwa yawe bwite.",
            ],
          },
          {
            id: "reset",
            title: "Wibagiwe ijambobanga",
            steps: [
              {
                text: "Ku paji yo kwinjira kanda **Wibagiwe ijambobanga?** wandike nimero cyangwa imeyili yawe.",
              },
              {
                text: "Andika kode twakoherereje, uhitemo ijambobanga rishya, wongere winjire.",
              },
            ],
            warn: "Abakozi ba HEBUZA ntibazigera bagusaba ijambobanga cyangwa kode yawe. Ntuzibwire umuntu, no kuri WhatsApp.",
          },
        ],
      },
    },
  },
  {
    slug: "find-a-service",
    audience: "client",
    cat: "start",
    minutes: 3,
    updated: UPDATED,
    popular: true,
    t: {
      en: {
        title: "Find the right service",
        summary:
          "Search the catalogue, filter by price and time, and check what a service needs before you apply.",
        keywords: "search catalogue services price filter qualify",
        sections: [
          {
            id: "search",
            title: "Search the catalogue",
            steps: [
              {
                text: "Open **Services**. Type what you need in the search box, for example **TIN**, **VAT** or **company registration**.",
                shot: "services",
                marks: [
                  "Search by name or abbreviation",
                  "Filter by price and time",
                ],
              },
              {
                text: "Narrow the list with the category tabs and the **price** and **turnaround** filters.",
              },
            ],
          },
          {
            id: "check",
            title: "Check the service before applying",
            steps: [
              {
                text: "Open a service. The price card shows the full fee and how long it takes; tap **Check if you qualify** to answer three quick questions.",
                shot: "service",
                marks: ["Start the application", "Check if you qualify"],
              },
            ],
            tips: [
              "Not sure which service you need? Tap **Book a free consultation** and an adviser will tell you.",
            ],
          },
        ],
      },
      fr: {
        title: "Trouver le bon service",
        summary:
          "Cherchez dans le catalogue, filtrez par prix et délai, et vérifiez ce qu'un service demande avant de postuler.",
        keywords: "recherche catalogue services prix filtre éligibilité",
        sections: [
          {
            id: "search",
            title: "Chercher dans le catalogue",
            steps: [
              {
                text: "Ouvrez **Services**. Tapez ce qu'il vous faut, par exemple **TIN**, **TVA** ou **création de société**.",
                shot: "services",
                marks: [
                  "Chercher par nom ou sigle",
                  "Filtrer par prix et délai",
                ],
              },
              {
                text: "Affinez avec les onglets de catégorie et les filtres **prix** et **délai**.",
              },
            ],
          },
          {
            id: "check",
            title: "Vérifier le service avant de postuler",
            steps: [
              {
                text: "Ouvrez un service. La carte de prix indique le tarif complet et le délai ; touchez **Vérifier mon éligibilité** pour trois questions rapides.",
                shot: "service",
                marks: ["Commencer la demande", "Vérifier l'éligibilité"],
              },
            ],
            tips: [
              "Vous ne savez pas quel service choisir ? Touchez **Réserver une consultation gratuite**.",
            ],
          },
        ],
      },
      rw: {
        title: "Shaka serivisi ikwiye",
        summary:
          "Shakisha mu rutonde, uyungurure ukurikije igiciro n'igihe, urebe ibyo serivisi isaba mbere yo gusaba.",
        keywords: "gushakisha serivisi igiciro kuyungurura",
        sections: [
          {
            id: "search",
            title: "Shakisha mu rutonde",
            steps: [
              {
                text: "Fungura **Serivisi**. Andika icyo ukeneye mu gasanduku ko gushakisha, urugero **TIN**, **TVA** cyangwa **kwandikisha ikigo**.",
                shot: "services",
                marks: [
                  "Shakisha izina cyangwa impine",
                  "Yungurura igiciro n'igihe",
                ],
              },
              {
                text: "Gabanya urutonde ukoresheje ibyiciro n'akayunguruzo k'**igiciro** n'**igihe**.",
              },
            ],
          },
          {
            id: "check",
            title: "Reba serivisi mbere yo gusaba",
            steps: [
              {
                text: "Fungura serivisi. Ikarita y'igiciro yerekana amafaranga yose n'igihe bifata; kanda **Reba niba wemerewe** usubize ibibazo bitatu.",
                shot: "service",
                marks: ["Tangira gusaba", "Reba niba wemerewe"],
              },
            ],
            tips: [
              "Ntuzi serivisi ukeneye? Kanda **Fata inama y'ubuntu** umujyanama akubwire.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "apply-for-company-registration",
    audience: "client",
    cat: "apply",
    service: "company-registration",
    minutes: 8,
    updated: UPDATED,
    popular: true,
    t: {
      en: {
        title: "Apply for Company Registration, start to finish",
        summary:
          "The full walkthrough: answer three questions, fill in your details, upload your documents, submit and pay with MoMo.",
        keywords:
          "rdb company registration business apply application wizard momo pay",
        facts: {
          who: "Anyone starting a company or business name in Rwanda",
          time: "About 10 minutes to apply · ready in 5 business days",
          cost: "RWF 20,000 (standard)",
          need: [
            "National ID or passport",
            "Proof of business address",
            "A phone that receives SMS",
          ],
        },
        sections: [
          {
            id: "before",
            title: "Before you start",
            intro:
              "Have your documents as photos or PDFs on your phone or computer. You can save and come back at any time: your answers are kept on this device.",
          },
          {
            id: "eligibility",
            title: "1. Check you qualify",
            steps: [
              {
                text: "On the service page tap **Apply**. Answer the three **Yes / No** questions, pick a **tier**, and tap **Start application**.",
                shot: "apply-0",
                marks: [
                  "Three quick questions",
                  "Answer Yes or No",
                  "Start application",
                  "Your total, always visible",
                ],
              },
            ],
          },
          {
            id: "details",
            title: "2. Your details",
            steps: [
              {
                text: "Fill in **About you**: name, phone, email and national ID number, then tap **Continue**.",
                shot: "apply-1",
                marks: ["Start here", "Continue"],
              },
              {
                text: "Fill in the **company details** the institution needs, then tap **Continue**.",
                shot: "apply-2",
                marks: ["Company details", "Continue"],
              },
            ],
          },
          {
            id: "documents",
            title: "3. Upload your documents",
            steps: [
              {
                text: "Tap **Choose file** (or take a photo) for each document. PDFs and clear photos are both fine.",
                shot: "apply-3",
                marks: ["Add your document", "Continue"],
              },
            ],
            tips: [
              "Missing a document? Choose **I'll upload later**: you can add it from your dashboard and we start as soon as it arrives.",
            ],
          },
          {
            id: "submit",
            title: "4. Review and submit",
            steps: [
              {
                text: "Check everything on the **Review** page, tick the two confirmations and tap **Submit request**.",
                shot: "apply-4",
                marks: ["Check your answers", "Submit request"],
              },
              {
                text: "Your request code appears (it starts with **HBZ-**). We also send it by SMS. Tap **Pay** to pay now.",
                shot: "apply-done",
                marks: ["Your request code", "Pay or open the request"],
              },
            ],
          },
          {
            id: "pay",
            title: "5. Pay with mobile money",
            steps: [
              {
                text: "Choose **MTN MoMo** (or Airtel Money, card or bank), enter the paying phone number and tap **Pay**.",
                shot: "pay",
                marks: ["Choose how to pay", "Paying phone number", "Pay"],
              },
              {
                text: "Approve the prompt on your phone with your mobile-money PIN. The page updates by itself when the payment arrives.",
              },
            ],
            warn: "Only approve a payment prompt you started yourself, and only for the amount shown on the page.",
          },
          {
            id: "after",
            title: "What happens next",
            faq: [
              {
                q: "How do I know it is moving?",
                a: "Every change is shown on the request's Timeline and sent to you by SMS. You can also track it with the code, without signing in.",
              },
              {
                q: "What if the institution asks for something else?",
                a: "Your adviser writes to you in the request's Messages tab, and it appears under Needs you on your dashboard.",
              },
            ],
          },
        ],
      },
      fr: {
        title: "Demander la création de société, de bout en bout",
        summary:
          "Le parcours complet : trois questions, vos informations, vos documents, l'envoi et le paiement par MoMo.",
        keywords:
          "rdb création société entreprise demande formulaire momo payer",
        facts: {
          who: "Toute personne qui crée une société ou un nom commercial au Rwanda",
          time: "Environ 10 minutes · prêt en 5 jours ouvrés",
          cost: "20 000 RWF (standard)",
          need: [
            "Carte d'identité ou passeport",
            "Justificatif d'adresse",
            "Un téléphone qui reçoit les SMS",
          ],
        },
        sections: [
          {
            id: "before",
            title: "Avant de commencer",
            intro:
              "Préparez vos documents en photo ou PDF. Vous pouvez enregistrer et revenir quand vous voulez : vos réponses restent sur cet appareil.",
          },
          {
            id: "eligibility",
            title: "1. Vérifier l'éligibilité",
            steps: [
              {
                text: "Sur la page du service, touchez **Faire la demande**. Répondez aux trois questions **Oui / Non**, choisissez une **formule** et touchez **Commencer**.",
                shot: "apply-0",
                marks: [
                  "Trois questions rapides",
                  "Oui ou Non",
                  "Commencer",
                  "Votre total, toujours visible",
                ],
              },
            ],
          },
          {
            id: "details",
            title: "2. Vos informations",
            steps: [
              {
                text: "Remplissez **À propos de vous** : nom, téléphone, email et numéro d'identité, puis **Continuer**.",
                shot: "apply-1",
                marks: ["Commencez ici", "Continuer"],
              },
              {
                text: "Remplissez les **informations de la société**, puis **Continuer**.",
                shot: "apply-2",
                marks: ["Informations société", "Continuer"],
              },
            ],
          },
          {
            id: "documents",
            title: "3. Envoyer vos documents",
            steps: [
              {
                text: "Touchez **Choisir un fichier** (ou prenez une photo) pour chaque document. PDF et photos nettes sont acceptés.",
                shot: "apply-3",
                marks: ["Ajouter le document", "Continuer"],
              },
            ],
            tips: [
              "Il manque un document ? Choisissez **Je l'enverrai plus tard** : ajoutez-le depuis votre espace, nous commençons dès réception.",
            ],
          },
          {
            id: "submit",
            title: "4. Vérifier et envoyer",
            steps: [
              {
                text: "Vérifiez tout sur la page **Récapitulatif**, cochez les deux confirmations et touchez **Envoyer la demande**.",
                shot: "apply-4",
                marks: ["Vérifiez vos réponses", "Envoyer la demande"],
              },
              {
                text: "Votre code de demande s'affiche (il commence par **HBZ-**), et nous l'envoyons par SMS. Touchez **Payer** pour payer maintenant.",
                shot: "apply-done",
                marks: ["Votre code", "Payer ou ouvrir la demande"],
              },
            ],
          },
          {
            id: "pay",
            title: "5. Payer par mobile money",
            steps: [
              {
                text: "Choisissez **MTN MoMo** (ou Airtel Money, carte ou banque), saisissez le numéro qui paie et touchez **Payer**.",
                shot: "pay",
                marks: ["Moyen de paiement", "Numéro qui paie", "Payer"],
              },
              {
                text: "Validez la demande sur votre téléphone avec votre code mobile money. La page se met à jour toute seule.",
              },
            ],
            warn: "Ne validez qu'un paiement que vous avez lancé vous-même, et seulement pour le montant affiché.",
          },
          {
            id: "after",
            title: "Et ensuite",
            faq: [
              {
                q: "Comment savoir que ça avance ?",
                a: "Chaque étape apparaît dans la Chronologie de la demande et vous est envoyée par SMS. Vous pouvez aussi suivre avec le code, sans vous connecter.",
              },
              {
                q: "Et si l'institution demande autre chose ?",
                a: "Votre conseiller vous écrit dans l'onglet Messages, et cela apparaît sous « À faire » dans votre espace.",
              },
            ],
          },
        ],
      },
      rw: {
        title: "Saba kwandikisha ikigo, kuva utangiye kugeza urangije",
        summary:
          "Inzira yose: subiza ibibazo bitatu, wuzuze amakuru yawe, wohereze inyandiko, wohereze ubusabe kandi wishyure na MoMo.",
        keywords: "rdb kwandikisha ikigo ubucuruzi gusaba momo kwishyura",
        facts: {
          who: "Uwo ari we wese utangiza ikigo cyangwa izina ry'ubucuruzi mu Rwanda",
          time: "Iminota 10 yo gusaba · birangira mu minsi 5 y'akazi",
          cost: "RWF 20,000 (bisanzwe)",
          need: [
            "Indangamuntu cyangwa pasiporo",
            "Icyemezo cy'aho ubucuruzi bukorera",
            "Telefone yakira SMS",
          ],
        },
        sections: [
          {
            id: "before",
            title: "Mbere yo gutangira",
            intro:
              "Tegura inyandiko zawe nk'amafoto cyangwa PDF. Ushobora kubika ukagaruka igihe icyo ari cyo cyose: ibisubizo byawe bigumaho kuri iki gikoresho.",
          },
          {
            id: "eligibility",
            title: "1. Reba niba wemerewe",
            steps: [
              {
                text: "Ku paji ya serivisi kanda **Saba**. Subiza ibibazo bitatu **Yego / Oya**, uhitemo **icyiciro**, hanyuma ukande **Tangira gusaba**.",
                shot: "apply-0",
                marks: [
                  "Ibibazo bitatu byihuse",
                  "Subiza Yego cyangwa Oya",
                  "Tangira gusaba",
                  "Igiteranyo cyawe",
                ],
              },
            ],
          },
          {
            id: "details",
            title: "2. Amakuru yawe",
            steps: [
              {
                text: "Uzuza **Ibikwerekeye**: amazina, telefone, imeyili na nimero y'indangamuntu, hanyuma ukande **Komeza**.",
                shot: "apply-1",
                marks: ["Tangirira aha", "Komeza"],
              },
              {
                text: "Uzuza **amakuru y'ikigo** urwego rukeneye, hanyuma ukande **Komeza**.",
                shot: "apply-2",
                marks: ["Amakuru y'ikigo", "Komeza"],
              },
            ],
          },
          {
            id: "documents",
            title: "3. Ohereza inyandiko",
            steps: [
              {
                text: "Kanda **Hitamo dosiye** (cyangwa ufate ifoto) kuri buri nyandiko. PDF n'amafoto agaragara neza byose biremewe.",
                shot: "apply-3",
                marks: ["Ongeraho inyandiko", "Komeza"],
              },
            ],
            tips: [
              "Hari inyandiko udafite? Hitamo **Nzayohereza nyuma**: uzayongeraho uhereye kuri konti yawe, tugatangira ikihagera.",
            ],
          },
          {
            id: "submit",
            title: "4. Genzura wohereze",
            steps: [
              {
                text: "Genzura byose kuri paji ya **Isuzuma**, wemeze ibintu bibiri, hanyuma ukande **Ohereza ubusabe**.",
                shot: "apply-4",
                marks: ["Genzura ibisubizo", "Ohereza ubusabe"],
              },
              {
                text: "Kode y'ubusabe bwawe iragaragara (itangirwa na **HBZ-**). Tunayikoherereza kuri SMS. Kanda **Ishyura** wishyure ubu.",
                shot: "apply-done",
                marks: ["Kode y'ubusabe", "Ishyura cyangwa fungura ubusabe"],
              },
            ],
          },
          {
            id: "pay",
            title: "5. Ishyura na mobile money",
            steps: [
              {
                text: "Hitamo **MTN MoMo** (cyangwa Airtel Money, ikarita cyangwa banki), wandike nimero yishyura, ukande **Ishyura**.",
                shot: "pay",
                marks: ["Hitamo uko wishyura", "Nimero yishyura", "Ishyura"],
              },
              {
                text: "Emeza ubutumwa kuri telefone yawe ukoresheje PIN ya mobile money. Paji yihindura ubwayo amafaranga ageze.",
              },
            ],
            warn: "Emeza gusa ubwishyu watangije ubwawe, kandi ku mafaranga agaragara kuri paji gusa.",
          },
          {
            id: "after",
            title: "Ibikurikira",
            faq: [
              {
                q: "Nzamenya nte ko bigenda?",
                a: "Buri mpinduka igaragara ku Ngengabihe y'ubusabe kandi ikoherezwa kuri SMS. Ushobora no gukurikirana ukoresheje kode, utinjiye.",
              },
              {
                q: "Bigenda bite urwego rusabye ikindi?",
                a: "Umujyanama wawe akwandikira mu gice cy'Ubutumwa, bikagaragara munsi ya Ibigutegereje kuri konti yawe.",
              },
            ],
          },
        ],
      },
    },
  },
  {
    slug: "pay-for-a-request",
    audience: "client",
    cat: "pay",
    minutes: 3,
    updated: UPDATED,
    popular: true,
    t: {
      en: {
        title: "Pay for a request with MoMo, Airtel Money, card or bank",
        summary:
          "Where to find what you owe, how to pay, and how to know the payment arrived.",
        keywords: "pay payment momo mtn airtel card bank invoice fee",
        sections: [
          {
            id: "find",
            title: "Find what you owe",
            steps: [
              {
                text: "Open your **dashboard**. Anything waiting for payment is listed under **Needs you** with a **Pay** button.",
                shot: "dashboard",
                marks: [
                  "Start a new request",
                  "Upload a missing document",
                  "Pay what you owe",
                ],
              },
            ],
          },
          {
            id: "pay",
            title: "Pay",
            steps: [
              {
                text: "Choose how to pay, enter the paying phone number (for mobile money) and tap **Pay**.",
                shot: "pay",
                marks: ["Choose how to pay", "Paying phone number", "Pay"],
              },
              {
                text: "Approve the prompt on your phone with your PIN. Keep the page open: it confirms by itself.",
              },
            ],
            tips: [
              "Someone else can pay for you: just enter their number. They approve on their phone.",
            ],
            warn: "HEBUZA never asks you to send money to a personal number. Pay only through this page.",
          },
          {
            id: "proof",
            title: "Your receipt",
            intro:
              "The receipt appears in the request's **Payments** tab and under **Billing** in your account.",
          },
        ],
      },
      fr: {
        title: "Payer une demande par MoMo, Airtel Money, carte ou banque",
        summary:
          "Où voir ce que vous devez, comment payer et comment savoir que le paiement est arrivé.",
        keywords: "payer paiement momo mtn airtel carte banque facture",
        sections: [
          {
            id: "find",
            title: "Voir ce que vous devez",
            steps: [
              {
                text: "Ouvrez votre **espace**. Tout ce qui attend un paiement est listé sous **À faire** avec un bouton **Payer**.",
                shot: "dashboard",
                marks: [
                  "Nouvelle demande",
                  "Envoyer un document manquant",
                  "Payer",
                ],
              },
            ],
          },
          {
            id: "pay",
            title: "Payer",
            steps: [
              {
                text: "Choisissez le moyen de paiement, saisissez le numéro qui paie (mobile money) et touchez **Payer**.",
                shot: "pay",
                marks: ["Moyen de paiement", "Numéro qui paie", "Payer"],
              },
              {
                text: "Validez sur votre téléphone avec votre code. Gardez la page ouverte : elle confirme toute seule.",
              },
            ],
            tips: [
              "Quelqu'un d'autre peut payer pour vous : saisissez son numéro, il valide sur son téléphone.",
            ],
            warn: "HEBUZA ne vous demande jamais d'envoyer de l'argent à un numéro personnel. Payez uniquement par cette page.",
          },
          {
            id: "proof",
            title: "Votre reçu",
            intro:
              "Le reçu apparaît dans l'onglet **Paiements** de la demande et dans **Facturation**.",
          },
        ],
      },
      rw: {
        title:
          "Ishyura ubusabe ukoresheje MoMo, Airtel Money, ikarita cyangwa banki",
        summary:
          "Aho ubona ibyo ugomba kwishyura, uko wishyura, n'uko umenya ko amafaranga yageze.",
        keywords: "kwishyura momo mtn airtel ikarita banki fagitire",
        sections: [
          {
            id: "find",
            title: "Reba ibyo ugomba kwishyura",
            steps: [
              {
                text: "Fungura **konti yawe**. Ibitegereje kwishyurwa byose biri munsi ya **Ibigutegereje** bifite buto ya **Ishyura**.",
                shot: "dashboard",
                marks: [
                  "Tangira ubusabe bushya",
                  "Ohereza inyandiko ibura",
                  "Ishyura",
                ],
              },
            ],
          },
          {
            id: "pay",
            title: "Kwishyura",
            steps: [
              {
                text: "Hitamo uko wishyura, wandike nimero yishyura (kuri mobile money), ukande **Ishyura**.",
                shot: "pay",
                marks: ["Hitamo uko wishyura", "Nimero yishyura", "Ishyura"],
              },
              {
                text: "Emeza ubutumwa kuri telefone ukoresheje PIN. Ntufunge paji: iremeza ubwayo.",
              },
            ],
            tips: [
              "Undi muntu ashobora kukwishyurira: andika nimero ye, akemeza kuri telefone ye.",
            ],
            warn: "HEBUZA ntizigera igusaba kohereza amafaranga kuri nimero y'umuntu ku giti cye. Ishyurira kuri iyi paji gusa.",
          },
          {
            id: "proof",
            title: "Inyemezabwishyu",
            intro:
              "Inyemezabwishyu igaragara mu gice cya **Ubwishyu** cy'ubusabe no muri **Fagitire** kuri konti yawe.",
          },
        ],
      },
    },
  },
  {
    slug: "track-a-request",
    audience: "client",
    cat: "track",
    minutes: 3,
    updated: UPDATED,
    popular: true,
    t: {
      en: {
        title: "Track a request",
        summary:
          "Follow your request with the code from your SMS, or from your account, step by step.",
        keywords: "track status progress code hbz timeline where is my request",
        sections: [
          {
            id: "code",
            title: "With the code (no sign-in)",
            steps: [
              {
                text: "Open **Track** at the top of any page, type the code from your SMS (it starts with **HBZ-**) and tap **Track**.",
                shot: "track",
                marks: ["Your HBZ- code", "Track"],
              },
            ],
          },
          
          {
            id: "statuses",
            title: "What the statuses mean",
            faq: [
              {
                q: "Awaiting your documents",
                a: "We need a document from you. Upload it from your dashboard and we continue straight away.",
              },
              {
                q: "In progress / Submitted to institution",
                a: "Your adviser is working on it, or it is with the institution (RDB, RRA…). The institution's decision is shown separately.",
              },
              {
                q: "Completed and delivered",
                a: "Your result is ready in Deliverables and in My documents → From HEBUZA.",
              },
            ],
          },
        ],
      },
      fr: {
        title: "Suivre une demande",
        summary:
          "Suivez votre demande avec le code reçu par SMS, ou depuis votre compte, étape par étape.",
        keywords: "suivre statut avancement code hbz chronologie",
        sections: [
          {
            id: "code",
            title: "Avec le code (sans connexion)",
            steps: [
              {
                text: "Ouvrez **Suivre** en haut de la page, saisissez le code du SMS (il commence par **HBZ-**) et touchez **Suivre**.",
                shot: "track",
                marks: ["Votre code HBZ-", "Suivre"],
              },
            ],
          },
          
          {
            id: "statuses",
            title: "Ce que veulent dire les statuts",
            faq: [
              {
                q: "En attente de vos documents",
                a: "Il nous manque un document. Envoyez-le depuis votre espace et nous reprenons aussitôt.",
              },
              {
                q: "En cours / Soumis à l'institution",
                a: "Votre conseiller s'en occupe, ou le dossier est chez l'institution (RDB, RRA…). Sa décision est affichée à part.",
              },
              {
                q: "Terminé et livré",
                a: "Votre résultat est dans Livrables et dans Mes documents → De HEBUZA.",
              },
            ],
          },
        ],
      },
      rw: {
        title: "Gukurikirana ubusabe",
        summary:
          "Kurikirana ubusabe bwawe ukoresheje kode wahawe kuri SMS, cyangwa kuri konti yawe, intambwe ku yindi.",
        keywords: "gukurikirana aho bigeze kode hbz ingengabihe",
        sections: [
          {
            id: "code",
            title: "Ukoresheje kode (utinjiye)",
            steps: [
              {
                text: "Fungura **Kurikirana** hejuru ya paji, wandike kode iri muri SMS (itangirwa na **HBZ-**) ukande **Kurikirana**.",
                shot: "track",
                marks: ["Kode yawe ya HBZ-", "Kurikirana"],
              },
            ],
          },
          
          {
            id: "statuses",
            title: "Icyo imimerere isobanura",
            faq: [
              {
                q: "Bitegereje inyandiko zawe",
                a: "Dukeneye inyandiko yawe. Yohereze uhereye kuri konti yawe, duhite dukomeza.",
              },
              {
                q: "Birakorwa / Byoherejwe ku rwego",
                a: "Umujyanama wawe ari kubikoraho, cyangwa biri ku rwego (RDB, RRA…). Icyemezo cy'urwego kigaragazwa ukwacyo.",
              },
              {
                q: "Byarangiye byatanzwe",
                a: "Igisubizo cyawe kiri mu Bisubizo no mu Nyandiko zanjye → Biva kuri HEBUZA.",
              },
            ],
          },
        ],
      },
    },
  },
  {
    slug: "book-a-free-consultation", audience: "client", cat: "start", minutes: 3, updated: "2026-11-26",
    t: {
      en: {
        title: "Book a free consultation, no account needed",
        summary: "Not sure which service you need? Book a free 30-minute intro with an adviser by phone, video or at our office.",
        keywords: "book consultation adviser call meeting appointment free intro",
        facts: { who: "Anyone, with or without an account", time: "2 minutes to book · 30-minute call", cost: "The intro is free (60-minute consultations are paid)", need: ["A phone number or email"] },
        sections: [
          { id: "book", title: "Book it", steps: [
            { text: "Tap **Book a free consultation** on any page (or open **Contact**). The booking has four short steps: **Type**, **Topic**, **Time**, **Details**." },
            { text: "**Type**: choose the free **30-minute intro**, or a paid **60-minute consultation** for detailed advice on your case." },
            { text: "**Topic**: pick the service you want to discuss, or **Not sure yet**, then how you want to meet: **Phone**, **Video (Google Meet)**, **At our office** or **At your premises (Kigali)**, and your language." },
            { text: "**Time**: choose a day, then an open time. Times are shown in Kigali time." },
            { text: "**Details**: enter your name and phone or email and confirm. You get a confirmation with a link to change or cancel the booking." },
          ], tips: ["The intro is free once per service area, with no obligation.", "If you go ahead with the service, a paid consultation is credited to it."] },
        ],
      },
      fr: {
        title: "Réserver une consultation gratuite, sans compte",
        summary: "Vous ne savez pas quel service choisir ? Réservez une introduction gratuite de 30 minutes par téléphone, vidéo ou à notre bureau.",
        keywords: "réserver consultation conseiller appel rendez-vous gratuit",
        facts: { who: "Tout le monde, avec ou sans compte", time: "2 minutes · appel de 30 minutes", cost: "L'introduction est gratuite (consultations de 60 minutes payantes)", need: ["Un téléphone ou un email"] },
        sections: [
          { id: "book", title: "Réserver", steps: [
            { text: "Touchez **Réserver une consultation gratuite** sur n'importe quelle page (ou **Contact**). La réservation a quatre étapes : **Type**, **Sujet**, **Horaire**, **Coordonnées**." },
            { text: "**Type** : choisissez l'**introduction de 30 minutes** gratuite, ou une **consultation de 60 minutes** payante pour un avis détaillé." },
            { text: "**Sujet** : choisissez le service à discuter, ou « je ne sais pas encore », puis le moyen : **Téléphone**, **Vidéo (Google Meet)**, **À notre bureau** ou **Chez vous (Kigali)**, et la langue." },
            { text: "**Horaire** : choisissez un jour, puis un créneau libre. Les heures sont à l'heure de Kigali." },
            { text: "**Coordonnées** : saisissez votre nom et votre téléphone ou email, puis confirmez. Vous recevez une confirmation avec un lien pour modifier ou annuler." },
          ], tips: ["L'introduction est gratuite une fois par domaine, sans engagement.", "Si vous poursuivez, une consultation payante est déduite du service."] },
        ],
      },
      rw: {
        title: "Fata inama y'ubuntu, nta konti ukeneye",
        summary: "Ntuzi serivisi ukeneye? Fata ikiganiro cy'ubuntu cy'iminota 30 n'umujyanama kuri telefone, kuri videwo cyangwa ku biro byacu.",
        keywords: "gufata inama umujyanama guhamagara gahunda ubuntu",
        facts: { who: "Buri wese, ufite konti cyangwa utayifite", time: "Iminota 2 · ikiganiro cy'iminota 30", cost: "Ikiganiro cy'intangiriro ni ubuntu (inama y'iminota 60 irishyurwa)", need: ["Telefone cyangwa imeyili"] },
        sections: [
          { id: "book", title: "Gufata gahunda", steps: [
            { text: "Kanda **Fata inama y'ubuntu** kuri paji iyo ari yo yose (cyangwa **Twandikire**). Gufata gahunda bifite intambwe enye: **Ubwoko**, **Ingingo**, **Igihe**, **Amakuru yawe**." },
            { text: "**Ubwoko**: hitamo **ikiganiro cy'iminota 30** cy'ubuntu, cyangwa **inama y'iminota 60** yishyurwa ku nama irambuye." },
            { text: "**Ingingo**: hitamo serivisi mushaka kuganiraho, cyangwa « simbizi neza », hanyuma uko muzahura: **Telefone**, **Videwo (Google Meet)**, **Ku biro byacu** cyangwa **Aho ukorera (Kigali)**, n'ururimi." },
            { text: "**Igihe**: hitamo umunsi, hanyuma isaha ihari. Amasaha ari ku isaha ya Kigali." },
            { text: "**Amakuru yawe**: andika amazina na telefone cyangwa imeyili, wemeze. Uhabwa ubutumwa bwemeza bufite umuyoboro wo guhindura cyangwa guhagarika gahunda." },
          ], tips: ["Ikiganiro cy'intangiriro ni ubuntu rimwe kuri buri rwego, nta gutegekwa.", "Niba ukomeje na serivisi, inama yishyuwe ikurwa ku giciro cyayo."] },
        ],
      },
    },
  },
];

import type { WsGuideSet } from "./index";

// agent dashboard guides. rw/fr are drafts for native review.
const U = "2026-11-26";

export const AGENT_WS: WsGuideSet = {
  workspace: "agent",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "work",
      t: {
        en: "Offers & cases",
        fr: "Offres et dossiers",
        rw: "Ibyifuzo na dosiye",
      },
    },
    {
      key: "comms",
      t: {
        en: "Clients & messages",
        fr: "Clients et messages",
        rw: "Abakiriya n'ubutumwa",
      },
    },
    {
      key: "field",
      t: { en: "Field visits", fr: "Visites terrain", rw: "Ingendo z'akazi" },
    },
    {
      key: "money",
      t: {
        en: "Earnings & performance",
        fr: "Revenus et performance",
        rw: "Ibyo winjije n'imikorere",
      },
    },
    {
      key: "account",
      t: {
        en: "Profile & settings",
        fr: "Profil et paramètres",
        rw: "Umwirondoro n'igenamiterere",
      },
    },
  ],
  guides: [
    // ------------------------------------------------------------------ start
    {
      slug: "agent-first-day",
      cat: "start",
      minutes: 8,
      updated: U,
      start: true,
      pages: ["/agent/onboarding", "/agent"],
      t: {
        en: {
          title: "Your first day: get cleared for work",
          summary:
            "Fill the five onboarding steps, sign the agreements and submit for clearance so offers can reach you.",
          facts: {
            who: "New HEBUZA agents",
            time: "About 20 minutes",
            need: [
              "A clear face photo (JPG or PNG, up to 5 MB)",
              "Your certificates with expiry dates",
              "Bank, MTN MoMo or Airtel Money details",
            ],
          },
          keywords:
            "onboarding clearance cleared new agent cv certificates nda code of conduct",
          sections: [
            {
              id: "steps",
              title: "Fill the five steps",
              intro:
                "Until you are cleared, a banner at the top asks you to **Continue profile**. Every field saves automatically.",
              steps: [
                {
                  text: "Click **Continue profile** in the banner. Onboarding opens on **Step 1 of 5**.",
                  shot: "agent-onboarding",
                  marks: [""],
                },
                {
                  text: "**Profile**: click **Upload your photo**, check **Full name** and **Phone number**, tick your **Languages** and write a **Short bio** (max 300 characters). Click **Continue**.",
                },
                {
                  text: "**CV**: under **Education** and **Experience** click **Add another**, fill the entry and click **Save**. Choose your **Expertise areas** and **Years of experience**, then **Continue**.",
                },
                {
                  text: "**Certificates**: click **Upload certificates**, then enter the **Expiry date** of each file. It is required.",
                },
                {
                  text: "**Payout**: choose a **Payout method** (Bank, MTN MoMo or Airtel Money), fill the account and **Account holder name**, then click **Save payout details**.",
                },
              ],
              tips: [
                "You can leave and come back: Onboarding shows **Resume** at the step where you stopped.",
              ],
            },
            {
              id: "sign",
              title: "Sign and submit",
              steps: [
                {
                  text: "**Agreements**: scroll each document (**NDA / Confidentiality Agreement**, **Code of Conduct**) to the end. The checkbox unlocks.",
                },
                {
                  text: "Tick **I have read and agree** and type your full name in **Signature (type your full name)**. It must match your profile name.",
                },
                {
                  text: "Click **Submit for clearance**. A page confirms your profile is with your manager for approval.",
                },
                {
                  text: "Click **Go to Today**. When your manager clears you, a notification says offers are unlocked.",
                },
              ],
              warn: "Until you are cleared you cannot accept offers, upload deliverables or message clients.",
              faq: [
                {
                  q: "My manager asked for changes. What now?",
                  a: "The banner shows **Review changes**. Click it, fix the highlighted sections and submit again.",
                },
                {
                  q: "Can I change my work email?",
                  a: "No. It is set by HEBUZA; ask your manager.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Premier jour : obtenir votre habilitation",
          summary:
            "Remplissez les cinq étapes d'intégration, signez les accords et soumettez pour habilitation afin de recevoir des offres.",
          facts: {
            who: "Nouveaux agents HEBUZA",
            time: "Environ 20 minutes",
            need: [
              "Une photo nette du visage (JPG ou PNG, 5 Mo max.)",
              "Vos certificats avec leur date d'expiration",
              "Coordonnées bancaires, MTN MoMo ou Airtel Money",
            ],
          },
          keywords:
            "intégration habilitation nouvel agent cv certificats nda code de conduite",
          sections: [
            {
              id: "steps",
              title: "Remplir les cinq étapes",
              intro:
                "Tant que vous n'êtes pas habilité, un bandeau vous invite à **Continuer le profil**. Chaque champ s'enregistre automatiquement.",
              steps: [
                {
                  text: "Cliquez sur **Continuer le profil** dans le bandeau. L'intégration s'ouvre à l'étape 1 sur 5.",
                  shot: "agent-onboarding",
                  marks: [""],
                },
                {
                  text: "**Profil** : cliquez sur **Téléversez votre photo**, vérifiez **Nom complet** et **Numéro de téléphone**, cochez vos **Langues** et rédigez une **Courte biographie** (300 caractères max.). Cliquez sur **Continuer**.",
                },
                {
                  text: "**CV** : sous **Formation** et **Expérience**, cliquez sur **Ajouter**, remplissez puis cliquez sur **Enregistrer**. Choisissez vos **Domaines d'expertise** et **Années d'expérience**, puis **Continuer**.",
                },
                {
                  text: "**Certificats** : cliquez sur **Téléverser des certificats**, puis saisissez la **Date d'expiration** de chaque fichier. Elle est obligatoire.",
                },
                {
                  text: "**Paiement** : choisissez un **Mode de paiement** (banque, MTN MoMo ou Airtel Money), remplissez le compte et le **Titulaire du compte**, puis cliquez sur **Enregistrer le paiement**.",
                },
              ],
              tips: [
                "Vous pouvez partir et revenir : l'intégration propose **Reprendre** à l'étape où vous vous êtes arrêté.",
              ],
            },
            {
              id: "sign",
              title: "Signer et soumettre",
              steps: [
                {
                  text: "**Accords** : faites défiler chaque document (**Accord de confidentialité (NDA)**, **Code de conduite**) jusqu'à la fin. La case se débloque.",
                },
                {
                  text: "Cochez **J'ai lu et j'accepte** et tapez votre nom dans **Signature (tapez votre nom complet)**. Il doit correspondre à votre profil.",
                },
                {
                  text: "Cliquez sur **Soumettre pour habilitation**. Une page confirme que votre profil est chez votre manager.",
                },
                {
                  text: "Cliquez sur **Aller à Aujourd'hui**. Une notification vous prévient quand les offres sont débloquées.",
                },
              ],
              warn: "Avant l'habilitation, vous ne pouvez ni accepter d'offres, ni téléverser de livrables, ni écrire aux clients.",
              faq: [
                {
                  q: "Mon manager demande des modifications. Que faire ?",
                  a: "Le bandeau affiche **Voir les modifications**. Cliquez, corrigez les sections en surbrillance et soumettez à nouveau.",
                },
                {
                  q: "Puis-je changer mon e-mail professionnel ?",
                  a: "Non. Il est défini par HEBUZA ; adressez-vous à votre manager.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Umunsi wa mbere: kwemererwa gukora",
          summary:
            "Uzuza intambwe eshanu zo kwiyandikisha, usinye amasezerano kandi wohereze usaba kwemererwa kugira ngo ubone ibyifuzo.",
          facts: {
            who: "Abakozi bashya ba HEBUZA",
            time: "Iminota nka 20",
            need: [
              "Ifoto igaragara neza y'isura (JPG cyangwa PNG, MB 5)",
              "Impamyabumenyi zawe n'amatariki zirangiriraho",
              "Konti ya banki, MTN MoMo cyangwa Airtel Money",
            ],
          },
          keywords:
            "kwiyandikisha kwemererwa umukozi mushya cv impamyabumenyi nda",
          sections: [
            {
              id: "steps",
              title: "Uzuza intambwe eshanu",
              intro:
                "Mbere yo kwemezwa, hejuru hagaragara itangazo rigusaba **Komeza umwirondoro**. Buri kintu kibikwa ako kanya.",
              steps: [
                {
                  text: "Kanda **Komeza umwirondoro** mu itangazo. Kwiyandikisha bifunguka ku ntambwe ya 1 kuri 5.",
                  shot: "agent-onboarding",
                  marks: [""],
                },
                {
                  text: "**Umwirondoro**: kanda **Shyiraho ifoto yawe**, genzura **Amazina yose** na **Nimero ya telefoni**, hitamo **Indimi** kandi wandike **Incamake y'umwirondoro** (inyuguti 300). Kanda **Komeza**.",
                },
                {
                  text: "**CV**: munsi ya **Amashuri** na **Uburambe** kanda **Ongeraho**, wuzuze hanyuma ukande **Bika**. Hitamo **Ibyo uzobereyemo** n'**Imyaka y'uburambe**, ukande **Komeza**.",
                },
                {
                  text: "**Impamyabumenyi**: kanda **Shyiraho impamyabumenyi**, hanyuma wandike **Itariki irangiriraho** ya buri imwe. Irasabwa.",
                },
                {
                  text: "**Kwishyurwa**: hitamo **Uburyo bwo kwishyurwa** (banki, MTN MoMo cyangwa Airtel Money), uzuze konti na **Nyir'konti**, ukande **Bika uburyo bwo kwishyurwa**.",
                },
              ],
              tips: [
                "Ushobora kugenda ukagaruka: hagaragara **Komeza aho wari ugeze** ku ntambwe wasigiyeho.",
              ],
            },
            {
              id: "sign",
              title: "Sinya wohereze",
              steps: [
                {
                  text: "**Amasezerano**: manura buri nyandiko (**Amasezerano y'ibanga (NDA)**, **Amategeko agenga imyitwarire**) kugeza ku iherezo. Akazu ko gukanda karafunguka.",
                },
                {
                  text: "Kanda **Narasomye kandi ndemera** maze wandike amazina yawe muri **Umukono (andika amazina yawe yose)**. Agomba guhura n'ari ku mwirondoro.",
                },
                {
                  text: "Kanda **Ohereza usaba kwemererwa**. Urupapuro rukwereka ko umwirondoro wawe uri ku muyobozi.",
                },
                {
                  text: "Kanda **Jya ku By'uyu munsi**. Iyo umuyobozi akwemeje, ubona imenyesha ko ibyifuzo byafunguwe.",
                },
              ],
              warn: "Mbere yo kwemezwa ntushobora kwemera ibyifuzo, kohereza ibyakozwe cyangwa kwandikira abakiriya.",
              faq: [
                {
                  q: "Umuyobozi yasabye impinduka. Nkore iki?",
                  a: "Itangazo rigaragaza **Reba impinduka**. Rikande, ukosore ibice byagaragajwe hanyuma wongere wohereze.",
                },
                {
                  q: "Nshobora guhindura imeyili y'akazi?",
                  a: "Oya. Ishyirwaho na HEBUZA; baza umuyobozi wawe.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-today",
      cat: "start",
      minutes: 4,
      updated: U,
      start: true,
      pages: ["/agent"],
      t: {
        en: {
          title: "Read your Today screen",
          summary:
            "What each block on Today shows, and how to act on offers, cases, messages and your calendar from one place.",
          keywords: "dashboard home today notifications bell duty kpi",
          sections: [
            {
              id: "blocks",
              title: "What you see",
              steps: [
                {
                  text: "Open **Today** in the side menu. The top bar has your **Availability** pill and the **Notifications** bell.",
                  shot: "agent-today",
                  marks: ["Availability", "Notifications", "Offers", "Help"],
                },
                {
                  text: "The offers block lists new offers with **Accept** and **Decline**. Each shows **Your share** and the time left to respond.",
                },
                {
                  text: "**My work** groups your cases by urgency (**Overdue**, **Due today**, **This week**…). Click a case, or use J/K and Enter, to open it.",
                },
                {
                  text: "**Unread messages** and **Calendar** show what needs a reply and what is coming. Click **View calendar** for the full view.",
                },
                {
                  text: "The metrics card (**On-time**, **Cases**, **Rating**, **Earned this month**) opens **Performance** when clicked.",
                  shot: "agent-today",
                  marks: ["", "", "", ""],
                },
              ],
            },
            {
              id: "bell",
              title: "Notifications",
              steps: [
                {
                  text: "Click the bell. A panel opens with tabs **All**, **Offers**, **Clients** and **Reviews**.",
                },
                {
                  text: "Click a notification to go to its offer or case. Click **Mark all read** to clear the badge.",
                },
                {
                  text: "Click **Notification settings** to choose In-app, SMS or WhatsApp per event.",
                },
              ],
              tips: [
                "If **My work** is empty, keep your skills and availability up to date with **Update skills** and **Set availability**.",
              ],
            },
          ],
        },
        fr: {
          title: "Lire votre écran Aujourd'hui",
          summary:
            "Ce que montre chaque bloc d'Aujourd'hui, et comment agir sur offres, dossiers, messages et agenda au même endroit.",
          keywords:
            "tableau de bord accueil aujourd'hui notifications cloche disponibilité",
          sections: [
            {
              id: "blocks",
              title: "Ce que vous voyez",
              steps: [
                {
                  text: "Ouvrez **Aujourd'hui** dans le menu latéral. La barre du haut contient votre pastille de **Disponibilité** et la cloche **Notifications**.",
                  shot: "agent-today",
                  marks: ["Disponibilité", "Notifications", "Offres", "Aide"],
                },
                {
                  text: "Le bloc des offres liste les nouvelles offres avec **Accepter** et **Refuser**, votre part et le temps restant.",
                },
                {
                  text: "**Mon travail** regroupe vos dossiers par urgence (**En retard**, **À rendre aujourd'hui**…). Cliquez sur un dossier, ou utilisez J/K et Entrée, pour l'ouvrir.",
                },
                {
                  text: "**Messages non lus** et **Agenda** montrent ce qui attend une réponse et ce qui arrive. Cliquez sur **Voir l'agenda** pour la vue complète.",
                },
                {
                  text: "La carte des indicateurs (**Dans les délais**, **Gains du mois**…) ouvre **Performance** au clic.",
                },
              ],
            },
            {
              id: "bell",
              title: "Notifications",
              steps: [
                {
                  text: "Cliquez sur la cloche. Un panneau s'ouvre avec les onglets **Tous**, **Offres**, **Clients** et **Avis**.",
                },
                {
                  text: "Cliquez sur une notification pour aller à l'offre ou au dossier. **Tout marquer comme lu** efface le badge.",
                },
                {
                  text: "**Paramètres de notification** permet de choisir In-app, SMS ou WhatsApp par événement.",
                },
              ],
              tips: [
                "Si **Mon travail** est vide, tenez à jour vos compétences et disponibilités avec **Mettre à jour mes compétences** et **Définir mes disponibilités**.",
              ],
            },
          ],
        },
        rw: {
          title: "Soma urupapuro rw'Uyu munsi",
          summary:
            "Icyo buri gice cy'Uyu munsi kigaragaza, n'uko wakora ku byifuzo, dosiye, ubutumwa na kalendari ahantu hamwe.",
          keywords: "ahabanza uyu munsi imenyesha inzogera ku kazi",
          sections: [
            {
              id: "blocks",
              title: "Ibyo ubona",
              steps: [
                {
                  text: "Fungura **Uyu munsi** mu rutonde rw'ibumoso. Hejuru hari akabuto ka **Kuboneka** n'inzogera y'**Imenyesha**.",
                  shot: "agent-today",
                  marks: ["Kuboneka", "Imenyesha", "Ibyifuzo", "Ubufasha"],
                },
                {
                  text: "Igice cy'ibyifuzo kigaragaza ibyifuzo bishya bifite **Emera** na **Anga**, umugabane wawe n'igihe gisigaye.",
                },
                {
                  text: "**Akazi kanjye** gashyira dosiye zawe mu byihutirwa (**Byarenze igihe**, **Uyu munsi**…). Kanda dosiye, cyangwa ukoreshe J/K na Enter, kugira ngo uyifungure.",
                },
                {
                  text: "**Ubutumwa butarasomwa** na **Ingengabihe** byerekana ibikeneye igisubizo n'ibiri imbere. Kanda **Reba ingengabihe**.",
                },
                {
                  text: "Ikarita y'imibare (**Ku gihe**, **Byinjiye uku kwezi**…) ifungura **Imikorere** iyo uyikanze.",
                },
              ],
            },
            {
              id: "bell",
              title: "Imenyesha",
              steps: [
                {
                  text: "Kanda inzogera. Hafunguka urutonde rufite **Byose**, **Ibyifuzo**, **Abakiriya** na **Isuzuma**.",
                },
                {
                  text: "Kanda imenyesha ujye ku cyifuzo cyangwa dosiye. **Byose byasomwe** bikuraho umubare.",
                },
                {
                  text: "**Igenamiterere ry'imenyesha** rigufasha guhitamo In-app, SMS cyangwa WhatsApp.",
                },
              ],
              tips: [
                "Niba **Akazi kanjye** karimo ubusa, vugurura ubumenyi n'igihe uboneka ukoresheje **Vugurura ubumenyi** na **Shyiraho igihe uboneka**.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-help",
      cat: "start",
      minutes: 2,
      updated: U,
      start: true,
      pages: ["/agent/guides", "/agent"],
      t: {
        en: {
          title: "Find help with the ? button",
          summary:
            "Open the guides for the screen you are on, search them, or browse every guide from the Guides page.",
          keywords: "help guides ? question mark search shortcuts palette",
          sections: [
            {
              id: "panel",
              title: "Open help on any screen",
              steps: [
                {
                  text: "Click **Help** (the **?** in the top bar). The **Guides** panel opens on the right.",
                  shot: "agent-help",
                  marks: ["Guides panel"],
                },
                {
                  text: "Guides for the screen you are on are listed first. Click one to read it in the panel; click **Back** to return to the list.",
                },
                {
                  text: "Type in the search box to find a guide by task, for example “accept offer” or “payout”.",
                },
                {
                  text: "Close the panel with the **×** or Esc. You stay on the same screen.",
                },
              ],
            },
            {
              id: "page",
              title: "Browse every guide",
              steps: [
                {
                  text: "Click **Guides** in the side menu to see every guide for your dashboard, grouped by topic.",
                  shot: "agent-guides",
                  marks: ["Guides"],
                },
              ],
              tips: [
                "Press ⌘K (Ctrl+K) to search your cases and clients or jump to an action like **Upload deliverable…**.",
                "Press ? on the keyboard to see all keyboard shortcuts.",
              ],
            },
          ],
        },
        fr: {
          title: "Trouver de l'aide avec le bouton ?",
          summary:
            "Ouvrez les guides de l'écran courant, cherchez-les ou parcourez-les tous depuis la page Guides.",
          keywords: "aide guides ? recherche raccourcis",
          sections: [
            {
              id: "panel",
              title: "Ouvrir l'aide sur n'importe quel écran",
              steps: [
                {
                  text: "Cliquez sur **Aide** (le **?** de la barre du haut). Le panneau **Guides** s'ouvre à droite.",
                  shot: "agent-help",
                  marks: ["Panneau Guides"],
                },
                {
                  text: "Les guides de l'écran courant apparaissent en premier. Cliquez pour lire ; **Retour** ramène à la liste.",
                },
                {
                  text: "Tapez dans la recherche pour trouver un guide par tâche, par ex. « accepter une offre » ou « paiement ».",
                },
                {
                  text: "Fermez le panneau avec **×** ou Échap. Vous restez sur le même écran.",
                },
              ],
            },
            {
              id: "page",
              title: "Parcourir tous les guides",
              steps: [
                {
                  text: "Cliquez sur **Guides** dans le menu latéral pour voir tous les guides, regroupés par thème.",
                  shot: "agent-guides",
                  marks: ["Guides"],
                },
              ],
              tips: [
                "⌘K (Ctrl+K) cherche vos dossiers et clients ou lance une action comme **Téléverser un livrable…**.",
                "La touche ? affiche tous les raccourcis clavier.",
              ],
            },
          ],
        },
        rw: {
          title: "Shaka ubufasha ukoresheje akabuto ?",
          summary:
            "Fungura amabwiriza y'urupapuro uriho, uyashakishe, cyangwa urebe yose ku rupapuro rw'Amabwiriza.",
          keywords: "ubufasha amabwiriza ? gushakisha",
          sections: [
            {
              id: "panel",
              title: "Fungura ubufasha aho uri hose",
              steps: [
                {
                  text: "Kanda **Ubufasha** (**?** hejuru). Urutonde rw'**Amabwiriza** rufunguka iburyo.",
                  shot: "agent-help",
                  marks: ["Amabwiriza"],
                },
                {
                  text: "Amabwiriza y'urupapuro uriho aza mbere. Kanda rimwe urisome; **Subira inyuma** igusubiza ku rutonde.",
                },
                {
                  text: "Andika mu gushakisha ubone ibwiriza, urugero « kwemera icyifuzo » cyangwa « kwishyurwa ».",
                },
                {
                  text: "Funga ukoresheje **×** cyangwa Esc. Uguma ku rupapuro rumwe.",
                },
              ],
            },
            {
              id: "page",
              title: "Reba amabwiriza yose",
              steps: [
                {
                  text: "Kanda **Amabwiriza** mu rutonde rw'ibumoso urebe amabwiriza yose ashyizwe mu byiciro.",
                  shot: "agent-guides",
                  marks: ["Amabwiriza"],
                },
              ],
              tips: [
                "⌘K (Ctrl+K) ishakisha dosiye n'abakiriya cyangwa igikorwa nka **Ohereza icyakozwe…**.",
                "Kanda ? kuri clavier urebe utubuto twose.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ work
    {
      slug: "agent-offers",
      cat: "work",
      minutes: 5,
      updated: U,
      start: true,
      pages: ["/agent/offers", "/agent"],
      t: {
        en: {
          title: "Accept or decline an offer",
          summary:
            "How offers work, how long you have to answer, and what to do when there is a conflict of interest.",
          facts: {
            who: "Cleared agents on duty",
            time: "Before the offer timer runs out",
          },
          keywords:
            "offer accept decline conflict of interest timer expired returned",
          sections: [
            {
              id: "read",
              title: "Read the offer",
              intro:
                "Your manager offers you cases that match your skills. Each offer has a timer; if it runs out the case goes back to the manager's queue.",
              steps: [
                {
                  text: "Open **Offers**. Tabs **Pending**, **Accepted**, **Declined** and **Expired** sort your offers.",
                  shot: "agent-offers",
                  marks: ["Tabs"],
                },
                {
                  text: "Each card shows the service, client, items shared, effort, **Required skills**, **Your share** and the time left.",
                },
                {
                  text: "Click **View details** to read the **Brief excerpt**, what is **Shared with you** and the **Deadline**. Other items unlock after you accept.",
                },
              ],
            },
            {
              id: "accept",
              title: "Accept",
              steps: [
                {
                  text: "Click **Accept**. A dialog asks you to confirm there is no conflict of interest.",
                },
                {
                  text: "Choose **No conflict**. Leave **Start work now** ticked to move the case straight to In progress.",
                },
                {
                  text: "Click **Accept offer**. The case appears in **Cases**; a toast offers **Undo** for a few seconds.",
                },
              ],
              tips: [
                "If **Accept** is greyed out, read the message on the card: you may need clearance, or to switch back **On duty**.",
              ],
            },
            {
              id: "conflict",
              title: "Declare a conflict",
              steps: [
                {
                  text: "In the accept dialog choose **Related to client**, **Competitor** or **Other**.",
                },
                {
                  text: "Write in **Tell Diane about the conflict** and click **Declare & return to manager**. The case is never assigned to you and the declaration is logged.",
                },
              ],
            },
            {
              id: "decline",
              title: "Decline",
              steps: [
                {
                  text: "Click **Decline**. Choose why: **Outside my expertise**, **Workload**, **Conflict of interest**, **Unavailable / on leave** or **Other**.",
                },
                {
                  text: "For **Other**, write in **More details**. Click **Decline offer**; the case goes back to your manager's queue.",
                },
              ],
              warn: "A declined or expired offer cannot be taken back. Ask your manager if you change your mind.",
            },
          ],
        },
        fr: {
          title: "Accepter ou refuser une offre",
          summary:
            "Fonctionnement des offres, délai de réponse, et que faire en cas de conflit d'intérêts.",
          facts: {
            who: "Agents habilités en service",
            time: "Avant la fin du délai de l'offre",
          },
          keywords: "offre accepter refuser conflit d'intérêts délai expirée",
          sections: [
            {
              id: "read",
              title: "Lire l'offre",
              intro:
                "Votre manager vous propose des dossiers adaptés à vos compétences. Chaque offre a un délai ; à expiration, le dossier retourne dans sa file.",
              steps: [
                {
                  text: "Ouvrez **Offres**. Les onglets **En attente**, **Acceptées**, **Refusées** et **Expirées** trient vos offres.",
                  shot: "agent-offers",
                  marks: ["Onglets"],
                },
                {
                  text: "Chaque carte affiche le service, le client, les éléments partagés, l'effort, les compétences, **Votre part** et le temps restant.",
                },
                {
                  text: "Cliquez sur **Voir les détails** pour lire l'**Extrait du brief**, ce qui est **Partagé avec vous** et l'**Échéance**.",
                },
              ],
            },
            {
              id: "accept",
              title: "Accepter",
              steps: [
                {
                  text: "Cliquez sur **Accepter**. Une fenêtre vous demande de confirmer l'absence de conflit d'intérêts.",
                },
                {
                  text: "Choisissez **Aucun conflit**. Laissez **Commencer maintenant** coché pour passer le dossier En cours.",
                },
                {
                  text: "Cliquez sur **Accepter l'offre**. Le dossier apparaît dans **Dossiers** ; un message propose **Annuler** quelques secondes.",
                },
              ],
              tips: [
                "Si **Accepter** est grisé, lisez le message de la carte : habilitation manquante ou statut Absent.",
              ],
            },
            {
              id: "conflict",
              title: "Déclarer un conflit",
              steps: [
                {
                  text: "Dans la fenêtre, choisissez **Lié au client**, **Concurrent** ou **Autre**.",
                },
                {
                  text: "Écrivez dans **Expliquez le conflit à Diane** puis cliquez sur **Déclarer et renvoyer au responsable**. La déclaration est journalisée.",
                },
              ],
            },
            {
              id: "decline",
              title: "Refuser",
              steps: [
                {
                  text: "Cliquez sur **Refuser**. Choisissez le motif : **Hors de mon expertise**, **Charge de travail**, **Conflit d'intérêts**, **Indisponible / en congé** ou **Autre**.",
                },
                {
                  text: "Pour **Autre**, remplissez **Plus de détails**. Cliquez sur **Refuser l'offre** ; le dossier retourne dans la file du manager.",
                },
              ],
              warn: "Une offre refusée ou expirée ne peut pas être reprise. Parlez-en à votre manager.",
            },
          ],
        },
        rw: {
          title: "Kwemera cyangwa kwanga icyifuzo",
          summary:
            "Uko ibyifuzo bikora, igihe ufite cyo gusubiza, n'icyo wakora iyo hari inyungu zivuguruzanya.",
          facts: {
            who: "Abakozi bemejwe kandi bari ku kazi",
            time: "Mbere y'uko igihe cy'icyifuzo kirangira",
          },
          keywords: "icyifuzo emera anga inyungu zivuguruzanya igihe",
          sections: [
            {
              id: "read",
              title: "Soma icyifuzo",
              intro:
                "Umuyobozi aguha dosiye zihuye n'ubumenyi bwawe. Buri cyifuzo gifite igihe; iyo kirangiye dosiye isubira ku muyobozi.",
              steps: [
                {
                  text: "Fungura **Ibyo wahawe**. Ibice **Bitegereje**, **Byemewe**, **Byanzwe** na **Byarangiye** bitondeka ibyifuzo.",
                  shot: "agent-offers",
                  marks: ["Ibice"],
                },
                {
                  text: "Buri karita yerekana serivisi, umukiriya, ibyasangijwe, igihe bizatwara, ubumenyi bukenewe, **Umugabane wawe** n'igihe gisigaye.",
                },
                {
                  text: "Kanda **Reba ibisobanuro** usome **Igice cy'amabwiriza**, **Byasangijwe nawe** n'**Itariki ntarengwa**.",
                },
              ],
            },
            {
              id: "accept",
              title: "Kwemera",
              steps: [
                {
                  text: "Kanda **Emera**. Hafunguka idirishya rigusaba kwemeza ko nta nyungu zivuguruzanya.",
                },
                {
                  text: "Hitamo **Nta nyungu zivuguruzanya**. Reka **Tangira ubu** ihitwemo kugira ngo dosiye ijye mu Irimo gukorwa.",
                },
                {
                  text: "Kanda **Emera icyifuzo**. Dosiye igaragara muri **Dosiye**; ubutumwa bugufasha **Subiza inyuma** mu masegonda make.",
                },
              ],
              tips: [
                "Niba **Emera** idakora, soma ubutumwa ku ikarita: ushobora kuba utaremezwa cyangwa uri **Ntahari**.",
              ],
            },
            {
              id: "conflict",
              title: "Gutangaza inyungu zivuguruzanya",
              steps: [
                {
                  text: "Mu idirishya hitamo **Mfitanye isano n'umukiriya**, **Umunywanyi** cyangwa **Ibindi**.",
                },
                {
                  text: "Andika muri **Sobanurira Diane** hanyuma ukande **Tangaza kandi usubize umuyobozi**. Biranditswe.",
                },
              ],
            },
            {
              id: "decline",
              title: "Kwanga",
              steps: [
                {
                  text: "Kanda **Anga**. Hitamo impamvu: **Ntibiri mu bumenyi bwanjye**, **Akazi kenshi**, **Inyungu zivuguruzanya**, **Ntabwo mboneka / ndi mu kiruhuko** cyangwa **Ibindi**.",
                },
                {
                  text: "Kuri **Ibindi**, andika muri **Ibisobanuro birambuye**. Kanda **Anga icyifuzo**; dosiye isubira ku muyobozi.",
                },
              ],
              warn: "Icyifuzo wanze cyangwa cyarangiye ntigishobora kugarurwa. Vugana n'umuyobozi wawe.",
            },
          ],
        },
      },
    },
    {
      slug: "agent-work-case",
      cat: "work",
      minutes: 7,
      updated: U,
      pages: ["/agent/cases"],
      t: {
        en: {
          title: "Work a case from start to finish",
          summary:
            "Find a case, read the brief, check the client's documents and keep the client moving until delivery.",
          keywords:
            "case workbench brief checklist documents re-upload start work",
          sections: [
            {
              id: "find",
              title: "Find the case",
              steps: [
                {
                  text: "Open **Cases**. Use the views **All**, **Overdue**, **Due today**, **Waiting on client**, **Waiting on institution**, **In review**, **Completed**.",
                  shot: "agent-cases",
                  marks: ["Views", "Search"],
                },
                {
                  text: "Type in **Search reference, client or service**, or click **Due** to sort soonest or latest first.",
                },
                {
                  text: "Click a row. The case opens on the tab its **Next action** needs.",
                },
              ],
            },
            {
              id: "brief",
              title: "Read the brief and start",
              steps: [
                {
                  text: "The tabs are **Brief**, **Documents**, **Conversation**, **Deliverables**, **Timeline**, **Time** and **Earnings** (keys 1–7).",
                  shot: "agent-case-brief",
                  marks: [
                    "Tabs",
                    "Change status",
                    "Propose new date",
                    "External outcome",
                  ],
                },
                {
                  text: "On **Brief**, read **Manager instructions** and tick the **Service checklist** as you go. Your manager sees the progress.",
                },
                {
                  text: "**Client information** shows only fields shared with you. Click **Reveal** to see a masked value; the reveal is logged.",
                },
                {
                  text: "When you start, click **Change status**, choose **In progress** and click **Change status** again.",
                },
              ],
            },
            {
              id: "docs",
              title: "Check the client's documents",
              steps: [
                {
                  text: "Open **Documents**. Each file shows legibility, expiry and name-match checks.",
                  shot: "agent-case-docs",
                  marks: ["Tabs"],
                },
                {
                  text: "Click **View** to open the file, then **Accept** if it is right.",
                },
                {
                  text: "If not, click **Needs re-upload**, pick a **Reason for request** and write a **Note to client**. Click **Preview request**, then **Send request**.",
                },
                {
                  text: "Optional: tick **Also move case to Awaiting client documents** and **I understand the case will wait on the client**. The SLA clock pauses while you wait.",
                },
              ],
              tips: [
                "The client is reminded after 2, 5 and 7 days if they do not answer.",
              ],
            },
            {
              id: "more",
              title: "Other actions",
              steps: [
                {
                  text: "**Propose new date**: pick a **New due date** and click **Propose**. Your manager approves; the client is told if approved.",
                },
                {
                  text: "**More actions** → **Request field visit**: fill **Location**, **Purpose**, **Preferred date** and click **Request**.",
                },
                {
                  text: "**More actions** → **Flag to manager** when you are blocked, the client is unresponsive, or you suspect fraud.",
                },
                {
                  text: "**More actions** → **Log time** opens **Time**: pick the **Activity**, set the **Duration** and click **Log time**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Traiter un dossier de bout en bout",
          summary:
            "Trouver un dossier, lire le brief, vérifier les documents du client et faire avancer jusqu'à la livraison.",
          keywords:
            "dossier espace de travail brief liste documents nouvel envoi commencer",
          sections: [
            {
              id: "find",
              title: "Trouver le dossier",
              steps: [
                {
                  text: "Ouvrez **Dossiers**. Utilisez les vues **Tous**, **En retard**, **À rendre aujourd'hui**, **En attente du client**, **En attente de l'institution**, **En revue**, **Terminés**.",
                  shot: "agent-cases",
                  marks: ["Vues", "Recherche"],
                },
                {
                  text: "Tapez dans **Rechercher référence, client ou service**, ou cliquez sur **Échéance** pour trier.",
                },
                {
                  text: "Cliquez sur une ligne. Le dossier s'ouvre sur l'onglet de l'**Action suivante**.",
                },
              ],
            },
            {
              id: "brief",
              title: "Lire le brief et commencer",
              steps: [
                {
                  text: "Les onglets sont **Résumé**, **Documents**, **Conversation**, **Livrables**, **Historique**, **Temps** et **Revenus** (touches 1–7).",
                  shot: "agent-case-brief",
                  marks: [
                    "Onglets",
                    "Changer le statut",
                    "Proposer une date",
                    "Résultat externe",
                  ],
                },
                {
                  text: "Dans **Résumé**, lisez les **Instructions du manager** et cochez la **Liste de contrôle**. Votre manager voit l'avancement.",
                },
                {
                  text: "**Informations client** n'affiche que les champs partagés. **Afficher** révèle une valeur masquée ; c'est journalisé.",
                },
                {
                  text: "Pour commencer, cliquez sur **Changer le statut**, choisissez **En cours** et confirmez avec **Changer le statut**.",
                },
              ],
            },
            {
              id: "docs",
              title: "Vérifier les documents du client",
              steps: [
                {
                  text: "Ouvrez **Documents**. Chaque fichier indique lisibilité, expiration et concordance du nom.",
                  shot: "agent-case-docs",
                  marks: ["Onglets"],
                },
                {
                  text: "Cliquez sur **Voir** pour l'ouvrir, puis sur **Accepter** s'il est correct.",
                },
                {
                  text: "Sinon, cliquez sur **À renvoyer**, choisissez un **Motif de la demande**, écrivez une **Note au client**, puis **Aperçu de la demande** et **Envoyer la demande**.",
                },
                {
                  text: "Option : cochez **Passer aussi le dossier en Attente des documents du client** et **Je comprends que le dossier attendra le client**. Le délai SLA est suspendu.",
                },
              ],
              tips: [
                "Le client reçoit des rappels après 2, 5 et 7 jours sans réponse.",
              ],
            },
            {
              id: "more",
              title: "Autres actions",
              steps: [
                {
                  text: "**Proposer une date** : choisissez une **Nouvelle échéance** et cliquez sur **Proposer**. Votre manager valide.",
                },
                {
                  text: "**Plus d'actions** → **Demander une visite terrain** : remplissez **Lieu**, **Objet**, **Date souhaitée** puis **Demander**.",
                },
                {
                  text: "**Plus d'actions** → **Signaler au manager** si vous êtes bloqué, si le client ne répond pas ou en cas de fraude.",
                },
                {
                  text: "**Plus d'actions** → **Saisir du temps** ouvre **Temps** : choisissez l'**Activité**, la **Durée** puis **Saisir**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Gukora dosiye kuva itangiye kugeza irangiye",
          summary:
            "Shaka dosiye, usome incamake, ugenzure inyandiko z'umukiriya kandi ukomeze kugeza itanzwe.",
          keywords:
            "dosiye incamake urutonde inyandiko kongera kohereza tangira",
          sections: [
            {
              id: "find",
              title: "Shaka dosiye",
              steps: [
                {
                  text: "Fungura **Dosiye**. Koresha **Yose**, **Yarengeje igihe**, **Agomba kurangira uyu munsi**, **Ategereje umukiriya**, **Ategereje ikigo**, **Arimo gusuzumwa**, **Yarangiye**.",
                  shot: "agent-cases",
                  marks: ["Ibyiciro", "Gushakisha"],
                },
                {
                  text: "Andika muri **Shakisha nimero, umukiriya cyangwa serivisi**, cyangwa ukande **Itariki ntarengwa** utondeke.",
                },
                {
                  text: "Kanda umurongo. Dosiye ifunguka ku gice **Igikurikira** gikeneye.",
                },
              ],
            },
            {
              id: "brief",
              title: "Soma incamake utangire",
              steps: [
                {
                  text: "Ibice ni **Incamake**, **Inyandiko**, **Ibiganiro**, **Ibyo gutanga**, **Amateka**, **Igihe** na **Amafaranga** (utubuto 1–7).",
                  shot: "agent-case-brief",
                  marks: [
                    "Ibice",
                    "Hindura imiterere",
                    "Saba itariki nshya",
                    "Igisubizo cy'ikigo",
                  ],
                },
                {
                  text: "Kuri **Incamake**, soma **Amabwiriza y'umuyobozi** kandi uhitemo **Intambwe za serivisi** uko ukora. Umuyobozi abona aho ugeze.",
                },
                {
                  text: "**Amakuru y'umukiriya** yerekana gusa ibyagusangijwe. **Erekana** ihishura agaciro kahishwe; biranditswe.",
                },
                {
                  text: "Utangiye, kanda **Hindura imiterere**, uhitemo **Irimo gukorwa** wongere ukande **Hindura imiterere**.",
                },
              ],
            },
            {
              id: "docs",
              title: "Genzura inyandiko z'umukiriya",
              steps: [
                {
                  text: "Fungura **Inyandiko**. Buri nyandiko yerekana niba isomeka, igihe irangirira n'ihuza ry'izina.",
                  shot: "agent-case-docs",
                  marks: ["Ibice"],
                },
                {
                  text: "Kanda **Reba** uyifungure, hanyuma **Emeza** niba ari nziza.",
                },
                {
                  text: "Niba atari byo, kanda **Yongere yoherezwe**, hitamo **Impamvu**, wandike **Ubutumwa ku mukiriya**, ukande **Reba ubusabe** hanyuma **Ohereza ubusabe**.",
                },
                {
                  text: "Bishoboka: hitamo **Shyira na dosiye muri Itegereje inyandiko z'umukiriya** na **Ndumva ko dosiye izategereza umukiriya**. Isaha ya SLA irahagarara.",
                },
              ],
              tips: ["Umukiriya yibutswa nyuma y'iminsi 2, 5 na 7 adasubije."],
            },
            {
              id: "more",
              title: "Ibindi bikorwa",
              steps: [
                {
                  text: "**Saba itariki nshya**: hitamo **Itariki nshya** ukande **Saba**. Umuyobozi arabyemeza.",
                },
                {
                  text: "**Ibindi** → **Saba gusura aho bikorerwa**: uzuza **Aho ari**, **Impamvu**, **Itariki wifuza** ukande **Saba**.",
                },
                {
                  text: "**Ibindi** → **Menyesha umuyobozi** iyo wahagaze, umukiriya adasubiza cyangwa ukeka uburiganya.",
                },
                {
                  text: "**Ibindi** → **Andika igihe** ifungura **Igihe**: hitamo **Igikorwa**, **Igihe** ukande **Andika igihe**.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-deliverables",
      cat: "work",
      minutes: 4,
      updated: U,
      pages: ["/agent/cases"],
      t: {
        en: {
          title: "Upload deliverables and submit for review",
          summary:
            "Upload the files the brief asks for, submit them to your manager, and handle a returned version.",
          facts: { need: ["PDF, JPG, PNG or DOCX files up to 10 MB"] },
          keywords:
            "deliverables upload submit review deliver to client returned resubmit version",
          sections: [
            {
              id: "upload",
              title: "Upload the files",
              steps: [
                {
                  text: "Open the case and click **Deliverables**. Each required file shows **Not uploaded** or **Uploaded**.",
                  shot: "agent-case-deliverables",
                  marks: ["Upload", "Submit"],
                },
                {
                  text: "Click **Upload** on a row and choose the file. Use **Replace** to swap it before submitting.",
                },
                {
                  text: "Write the **Client note** the client will read with the files.",
                },
              ],
            },
            {
              id: "submit",
              title: "Submit",
              steps: [
                {
                  text: "Click **Submit for review**. If something is missing, **Before you can submit** lists what to fix (required files, checklist, uploads in progress).",
                },
                {
                  text: "In the dialog, tick **I checked every file opens and is readable** and confirm. Files are **Locked while in review**.",
                },
                {
                  text: "Services without internal review show **Deliver to client** instead: files go straight to the client and the case completes.",
                },
              ],
              warn: "**Deliver to client** sends the files immediately and closes the case. Check every file first.",
            },
            {
              id: "returned",
              title: "When your manager returns it",
              steps: [
                {
                  text: "A banner shows **Returned by** your manager with the comments. Read the feedback next to the previous version.",
                },
                {
                  text: "Click **Upload new version**, then **Resubmit for review**. Earlier files stay in **Version history**.",
                },
                {
                  text: "When approved and released, the case completes and your share is allocated. Click **View earnings** to see it.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Téléverser les livrables et soumettre pour revue",
          summary:
            "Téléversez les fichiers demandés, soumettez-les à votre manager et traitez une version renvoyée.",
          facts: { need: ["Fichiers PDF, JPG, PNG ou DOCX de 10 Mo max."] },
          keywords:
            "livrables téléverser soumettre revue livrer renvoyé version",
          sections: [
            {
              id: "upload",
              title: "Téléverser les fichiers",
              steps: [
                {
                  text: "Ouvrez le dossier et cliquez sur **Livrables**. Chaque fichier requis est marqué non téléversé ou téléversé.",
                  shot: "agent-case-deliverables",
                  marks: ["Téléverser", "Soumettre"],
                },
                {
                  text: "Cliquez sur **Téléverser** sur une ligne et choisissez le fichier. **Remplacer** permet de l'échanger avant envoi.",
                },
                {
                  text: "Rédigez la **Note au client** qui accompagnera les fichiers.",
                },
              ],
            },
            {
              id: "submit",
              title: "Soumettre",
              steps: [
                {
                  text: "Cliquez sur **Soumettre pour revue**. S'il manque quelque chose, **Avant de soumettre** liste ce qu'il faut corriger.",
                },
                {
                  text: "Dans la fenêtre, cochez **J'ai vérifié que chaque fichier s'ouvre et se lit** et confirmez. Les fichiers sont **Verrouillé pendant la revue**.",
                },
                {
                  text: "Les services sans revue interne affichent **Livrer au client** : les fichiers partent directement et le dossier se termine.",
                },
              ],
              warn: "**Livrer au client** envoie tout de suite et clôt le dossier. Vérifiez chaque fichier avant.",
            },
            {
              id: "returned",
              title: "Si votre manager renvoie",
              steps: [
                {
                  text: "Un bandeau indique le renvoi avec les commentaires. Comparez avec la version précédente.",
                },
                {
                  text: "Cliquez sur **Téléverser une nouvelle version**, puis **Soumettre à nouveau**. Les anciennes versions restent dans **Historique des versions**.",
                },
                {
                  text: "Une fois approuvé et publié, le dossier se termine et votre part est allouée. **Voir les gains** l'affiche.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kohereza ibyakozwe no kubisuzumisha",
          summary:
            "Ohereza dosiye incamake isaba, uzoherereze umuyobozi, kandi ukore ku zagaruwe.",
          facts: {
            need: ["Dosiye za PDF, JPG, PNG cyangwa DOCX zitarenze MB 10"],
          },
          keywords:
            "ibyo gutanga kohereza isuzuma ha umukiriya byagaruwe verisiyo",
          sections: [
            {
              id: "upload",
              title: "Ohereza dosiye",
              steps: [
                {
                  text: "Fungura dosiye ukande **Ibyo gutanga**. Buri dosiye isabwa yerekana niba yoherejwe.",
                  shot: "agent-case-deliverables",
                  marks: ["Ohereza", "Ohereza ngo bisuzumwe"],
                },
                {
                  text: "Kanda **Ohereza** ku murongo uhitemo dosiye. **Simbuza** igufasha kuyihindura mbere yo kohereza.",
                },
                {
                  text: "Andika **Ubutumwa ku mukiriya** azasoma hamwe na dosiye.",
                },
              ],
            },
            {
              id: "submit",
              title: "Ohereza",
              steps: [
                {
                  text: "Kanda **Ohereza ngo bisuzumwe**. Niba hari ibibura, **Mbere yo kohereza** irabigaragaza.",
                },
                {
                  text: "Mu idirishya, hitamo **Nagenzuye ko buri dosiye ifunguka kandi isomeka** wemeze. Dosiye ziba **Bifunze mu isuzuma**.",
                },
                {
                  text: "Serivisi zidasuzumwa imbere zigaragaza **Ha umukiriya**: dosiye zijya ku mukiriya ako kanya kandi dosiye ikarangira.",
                },
              ],
              warn: "**Ha umukiriya** yohereza ako kanya kandi igafunga dosiye. Banza ugenzure buri dosiye.",
            },
            {
              id: "returned",
              title: "Iyo umuyobozi abigaruye",
              steps: [
                {
                  text: "Itangazo rigaragaza ko byagaruwe n'ibitekerezo by'umuyobozi. Gereranya na verisiyo yabanje.",
                },
                {
                  text: "Kanda **Ohereza verisiyo nshya**, hanyuma **Ongera wohereze ngo bisuzumwe**. Izabanje ziguma muri **Amateka ya verisiyo**.",
                },
                {
                  text: "Byemejwe kandi bigatangwa, dosiye irarangira n'umugabane wawe ukagenwa. Kanda **Reba ibyo winjije**.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-institution-outcome",
      cat: "work",
      minutes: 4,
      updated: U,
      pages: ["/agent/cases"],
      t: {
        en: {
          title: "Submit to an institution and record the outcome",
          summary:
            "Log a filing with RRA or another institution, then record what the institution decided.",
          keywords:
            "institution rra submission reference outcome approved rejected more info on hold status",
          sections: [
            {
              id: "submit",
              title: "Log the submission",
              steps: [
                {
                  text: "In the case, click **Change status**.",
                  shot: "agent-case-status",
                  marks: ["Status dialog"],
                },
                {
                  text: "Choose **Awaiting external institution**. The dialog becomes **Submitted to institution**.",
                },
                {
                  text: "Pick the **Institution** (or **Other** and type it), enter the **Submission ref**, **Submitted on** and optionally the **Expected decision** date.",
                },
                {
                  text: "Attach a proof in **Evidence (optional)** and click **Confirm submission**. The case moves to Waiting on institution.",
                },
              ],
              tips: [
                "Statuses that go through deliverables show **Goes through Submit deliverables** and cannot be picked here.",
              ],
            },
            {
              id: "outcome",
              title: "Record the outcome",
              steps: [
                {
                  text: "When the institution answers, click the **External outcome** chip under the case title.",
                  shot: "agent-case-brief",
                  marks: ["", "", "", "External outcome"],
                },
                {
                  text: "Choose **Approved**, **Rejected**, **More info requested** or **Pending**, write the **Note** and attach **Evidence (optional)**.",
                },
                {
                  text: "Click **Save outcome**. The chip shows the new state and the timeline records it.",
                },
              ],
              warn: "The outcome is visible to your manager and drives the next steps. Record only what the institution actually said.",
            },
            {
              id: "hold",
              title: "Put a case on hold",
              steps: [
                {
                  text: "In **Change status** choose **On hold**, fill **Reason** and confirm. The SLA clock pauses until your manager resumes the case.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Soumettre à une institution et noter le résultat",
          summary:
            "Enregistrez un dépôt auprès de la RRA ou d'une autre institution, puis notez sa décision.",
          keywords:
            "institution rra soumission référence résultat approuvé rejeté infos en pause statut",
          sections: [
            {
              id: "submit",
              title: "Enregistrer la soumission",
              steps: [
                {
                  text: "Dans le dossier, cliquez sur **Changer le statut**.",
                  shot: "agent-case-status",
                  marks: ["Fenêtre de statut"],
                },
                {
                  text: "Choisissez **En attente de l'institution**. La fenêtre devient **Soumis à l'institution**.",
                },
                {
                  text: "Choisissez l'**Institution** (ou **Autre**), saisissez la **Référence de soumission**, **Soumis le** et, si connue, la **Décision attendue**.",
                },
                {
                  text: "Joignez une **Preuve (facultatif)** et cliquez sur **Confirmer la soumission**.",
                },
              ],
              tips: [
                "Les statuts qui passent par les livrables ne sont pas disponibles ici.",
              ],
            },
            {
              id: "outcome",
              title: "Noter le résultat",
              steps: [
                {
                  text: "Quand l'institution répond, cliquez sur la pastille **Résultat externe** sous le titre.",
                  shot: "agent-case-brief",
                  marks: ["", "", "", "Résultat externe"],
                },
                {
                  text: "Choisissez **Approuvé**, **Rejeté**, **Infos demandées** ou **En attente**, écrivez la **Note** et joignez la preuve.",
                },
                {
                  text: "Cliquez sur **Enregistrer**. La pastille et l'historique sont mis à jour.",
                },
              ],
              warn: "Le résultat est visible par votre manager. Notez uniquement ce que l'institution a réellement dit.",
            },
            {
              id: "hold",
              title: "Mettre en pause",
              steps: [
                {
                  text: "Dans **Changer le statut**, choisissez **En pause**, remplissez le **Motif** et confirmez. Le SLA est suspendu jusqu'à reprise par votre manager.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kohereza ku kigo no kwandika igisubizo",
          summary:
            "Andika ko wohereje ku RRA cyangwa ikindi kigo, hanyuma wandike icyemezo cyacyo.",
          keywords:
            "ikigo rra nimero igisubizo cyemejwe cyanzwe hasabwe amakuru yahagaritswe",
          sections: [
            {
              id: "submit",
              title: "Andika ko byoherejwe",
              steps: [
                {
                  text: "Muri dosiye, kanda **Hindura imiterere**.",
                  shot: "agent-case-status",
                  marks: ["Imiterere"],
                },
                {
                  text: "Hitamo **Itegereje ikigo cyo hanze**. Idirishya rihinduka **Byoherejwe ku kigo**.",
                },
                {
                  text: "Hitamo **Ikigo** (cyangwa **Ibindi**), wandike **Nimero y'ubusabe**, **Byoherejwe ku wa** n'**Icyemezo gitegerejwe** niba ukizi.",
                },
                {
                  text: "Omeka **Igihamya (si ngombwa)** ukande **Emeza ko byoherejwe**.",
                },
              ],
              tips: ["Imiterere inyura mu byo gutanga ntiboneka hano."],
            },
            {
              id: "outcome",
              title: "Andika igisubizo",
              steps: [
                {
                  text: "Ikigo gisubije, kanda **Igisubizo cy'ikigo** munsi y'umutwe wa dosiye.",
                  shot: "agent-case-brief",
                  marks: ["", "", "", "Igisubizo cy'ikigo"],
                },
                {
                  text: "Hitamo **Cyemejwe**, **Cyanzwe**, **Hasabwe amakuru** cyangwa **Gitegerejwe**, wandike **Icyitonderwa** wongereho igihamya.",
                },
                {
                  text: "Kanda **Bika igisubizo**. Amateka ya dosiye arabyandika.",
                },
              ],
              warn: "Igisubizo kigaragara ku muyobozi. Andika gusa ibyo ikigo cyavuze koko.",
            },
            {
              id: "hold",
              title: "Guhagarika dosiye",
              steps: [
                {
                  text: "Muri **Hindura imiterere** hitamo **Yahagaritswe**, wandike **Impamvu** wemeze. SLA irahagarara kugeza umuyobozi ayisubijeho.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-duty-leave",
      cat: "work",
      minutes: 3,
      updated: U,
      pages: ["/agent", "/agent/profile/availability"],
      t: {
        en: {
          title: "Go on duty, away or on leave",
          summary:
            "Pause new offers for an hour or a day, or request leave so your manager covers your cases.",
          keywords: "duty away leave availability pause offers holiday",
          sections: [
            {
              id: "duty",
              title: "Switch duty",
              steps: [
                {
                  text: "Click the **Availability** pill in the top bar. A menu opens.",
                  shot: "agent-duty",
                  marks: ["Availability", "Menu"],
                },
                {
                  text: "Choose **On duty** to receive offers, or under **Away for…** pick **1 hour**, **Until end of day** or **Until I switch back**.",
                },
                {
                  text: "While away, a banner reminds you; click **Switch to on duty** to come back.",
                },
              ],
            },
            {
              id: "leave",
              title: "Request leave",
              steps: [
                {
                  text: "Click **Request leave** in the menu, or open **Profile** → **Availability & leave**.",
                  shot: "agent-availability",
                  marks: ["Sections"],
                },
                {
                  text: "Set **From**, **To** and **Reason**. The form tells you how many of your cases are due in that period.",
                },
                {
                  text: "Click **Request leave**. The request appears in **Leave history** as Pending until your manager decides.",
                },
              ],
              tips: [
                "**Weekly availability** (Morning / Afternoon per day) saves as you switch; offers are sent only for times you are available.",
              ],
              warn: "During approved leave the pill is locked and offers pause; your open cases are covered by your manager.",
            },
          ],
        },
        fr: {
          title: "Passer en service, absent ou en congé",
          summary:
            "Suspendez les offres une heure ou une journée, ou demandez un congé pour que votre manager couvre vos dossiers.",
          keywords: "service absent congé disponibilité pause offres",
          sections: [
            {
              id: "duty",
              title: "Changer de statut",
              steps: [
                {
                  text: "Cliquez sur la pastille **Disponibilité** dans la barre du haut. Un menu s'ouvre.",
                  shot: "agent-duty",
                  marks: ["Disponibilité", "Menu"],
                },
                {
                  text: "Choisissez **En service**, ou sous **Absent pour…** : **1 heure**, **Jusqu'à la fin de la journée** ou **Jusqu'à mon retour**.",
                },
                {
                  text: "Pendant l'absence, un bandeau s'affiche ; cliquez sur **Repasser en service** pour revenir.",
                },
              ],
            },
            {
              id: "leave",
              title: "Demander un congé",
              steps: [
                {
                  text: "Cliquez sur **Demander un congé** dans le menu, ou ouvrez **Profil** → **Disponibilité et congés**.",
                  shot: "agent-availability",
                  marks: ["Sections"],
                },
                {
                  text: "Renseignez **Du**, **Au** et **Motif**. Le formulaire indique combien de vos dossiers arrivent à échéance.",
                },
                {
                  text: "Cliquez sur **Demander le congé**. La demande apparaît dans **Historique des congés** jusqu'à la décision.",
                },
              ],
              tips: [
                "La **Disponibilité hebdomadaire** (Matin / Après-midi) s'enregistre à chaque bascule.",
              ],
              warn: "Pendant un congé approuvé, la pastille est verrouillée et les offres suspendues ; votre manager couvre vos dossiers.",
            },
          ],
        },
        rw: {
          title: "Kujya ku kazi, kuba udahari cyangwa mu kiruhuko",
          summary:
            "Hagarika ibyifuzo bishya isaha cyangwa umunsi, cyangwa usabe ikiruhuko umuyobozi akwitwarire dosiye.",
          keywords: "ku kazi ntahari ikiruhuko kuboneka",
          sections: [
            {
              id: "duty",
              title: "Hindura uko uboneka",
              steps: [
                {
                  text: "Kanda akabuto ka **Kuboneka** hejuru. Hafunguka urutonde.",
                  shot: "agent-duty",
                  marks: ["Kuboneka", "Urutonde"],
                },
                {
                  text: "Hitamo **Ku kazi**, cyangwa munsi ya **Ntahari mu gihe…** hitamo **Isaha 1**, **Kugeza umunsi urangiye** cyangwa **Kugeza ngarutse**.",
                },
                {
                  text: "Igihe udahari, itangazo rirakwibutsa; kanda **Subira ku kazi** ugaruke.",
                },
              ],
            },
            {
              id: "leave",
              title: "Saba ikiruhuko",
              steps: [
                {
                  text: "Kanda **Saba ikiruhuko** mu rutonde, cyangwa ufungure **Umwirondoro** → **Kuboneka n'ikiruhuko**.",
                  shot: "agent-availability",
                  marks: ["Ibice"],
                },
                {
                  text: "Shyiramo **Kuva**, **Kugeza** n'**Impamvu**. Ifishi ikwereka dosiye zawe zizarangira muri icyo gihe.",
                },
                {
                  text: "Kanda **Saba ikiruhuko**. Busa n'ubutegereje muri **Amateka y'ibiruhuko** kugeza umuyobozi afashe icyemezo.",
                },
              ],
              tips: [
                "**Kuboneka mu cyumweru** (Mu gitondo / Nyuma ya saa sita) bibikwa ako kanya.",
              ],
              warn: "Mu kiruhuko cyemejwe, akabuto karafunze n'ibyifuzo bigahagarara; umuyobozi akwitwarira dosiye.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ comms
    {
      slug: "agent-inbox",
      cat: "comms",
      minutes: 5,
      updated: U,
      pages: ["/agent/inbox", "/agent/cases"],
      t: {
        en: {
          title: "Message clients and the team",
          summary:
            "Reply to clients, leave internal notes, send cards and voice notes, and use templates.",
          keywords:
            "inbox message reply internal note template card voice note outbox mention",
          sections: [
            {
              id: "list",
              title: "Find the conversation",
              steps: [
                {
                  text: "Open **Inbox**. Filter with **All**, **Unread**, **Waiting for me** or **Mentions**, or use **Search messages…**.",
                  shot: "agent-inbox",
                  marks: ["Search", "Templates & outbox"],
                },
                {
                  text: "Click a conversation. The side shows the case context; click **Open in workbench** to jump to the case.",
                },
              ],
            },
            {
              id: "write",
              title: "Write a message",
              steps: [
                {
                  text: "Choose who sees it: **Reply to client** or **Internal note** (never visible to the client).",
                  shot: "agent-case-conversation",
                  marks: [
                    "Who sees this",
                    "Attach file",
                    "Templates",
                    "Insert card",
                    "Send",
                  ],
                },
                {
                  text: "Type and press Enter, or click **Send** (**Add note** for internal). Shift+Enter adds a new line.",
                },
                {
                  text: "Click **Attach file** for a file up to 10 MB, or **Record voice note**, then **Stop** and **Send voice note**.",
                },
                {
                  text: "Click **Insert card** to send a **Document request**, **Appointment** or **Status update**, fill the details and click **Send card**.",
                },
                {
                  text: "In an internal note, type @Diane to mention your manager.",
                },
              ],
              tips: [
                "Offline? Messages wait in the **Outbox** and send when you reconnect; use **Retry** on a failed one.",
              ],
            },
            {
              id: "tpl",
              title: "Templates",
              steps: [
                {
                  text: "Click **Templates & outbox**, then **New template**. Fill **Name** and **Message** in Kinyarwanda, English and French.",
                  shot: "agent-templates",
                  marks: ["Templates"],
                },
                {
                  text: "Click **Save template**. In a conversation, click **Templates**, preview the filled variables and click **Insert**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Écrire aux clients et à l'équipe",
          summary:
            "Répondez aux clients, laissez des notes internes, envoyez cartes et messages vocaux, utilisez des modèles.",
          keywords:
            "messagerie message répondre note interne modèle carte vocal boîte d'envoi mention",
          sections: [
            {
              id: "list",
              title: "Trouver la conversation",
              steps: [
                {
                  text: "Ouvrez **Messages**. Filtrez avec **Tous**, **Non lus**, **En attente de moi** ou **Mentions**, ou utilisez **Rechercher des messages…**.",
                  shot: "agent-inbox",
                  marks: ["Recherche", "Modèles et boîte d'envoi"],
                },
                {
                  text: "Cliquez sur une conversation. **Ouvrir dans l'espace de travail** mène au dossier.",
                },
              ],
            },
            {
              id: "write",
              title: "Écrire un message",
              steps: [
                {
                  text: "Choisissez qui le voit : **Répondre au client** ou **Note interne** (jamais visible par le client).",
                  shot: "agent-case-conversation",
                  marks: [
                    "Destinataire",
                    "Joindre",
                    "Modèles",
                    "Carte",
                    "Envoyer",
                  ],
                },
                {
                  text: "Tapez puis Entrée, ou cliquez sur **Envoyer** (**Ajouter la note** en interne). Maj+Entrée crée une ligne.",
                },
                {
                  text: "**Joindre un fichier** (10 Mo max.) ou **Enregistrer un message vocal**, puis **Arrêter** et **Envoyer le vocal**.",
                },
                {
                  text: "**Insérer une carte** : **Demande de documents**, **Rendez-vous** ou **Point d'avancement**, puis **Envoyer la carte**.",
                },
                {
                  text: "Dans une note interne, tapez @Diane pour mentionner votre manager.",
                },
              ],
              tips: [
                "Hors ligne, les messages attendent dans la **Boîte d'envoi** ; **Réessayer** relance un échec.",
              ],
            },
            {
              id: "tpl",
              title: "Modèles",
              steps: [
                {
                  text: "Cliquez sur **Modèles et boîte d'envoi**, puis **Nouveau modèle**. Remplissez **Nom** et **Message** dans les trois langues.",
                  shot: "agent-templates",
                  marks: ["Modèles"],
                },
                {
                  text: "Cliquez sur **Enregistrer le modèle**. Dans une conversation, **Modèles** puis **Insérer**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kwandikira abakiriya n'itsinda",
          summary:
            "Subiza abakiriya, andika inyandiko z'imbere, ohereza amakarita n'amajwi, ukoreshe inyandikorugero.",
          keywords:
            "ubutumwa subiza inyandiko y'imbere inyandikorugero ikarita ijwi",
          sections: [
            {
              id: "list",
              title: "Shaka ikiganiro",
              steps: [
                {
                  text: "Fungura **Ubutumwa**. Toranya **Byose**, **Bitarasomwa**, **Bintegereje** cyangwa **Banyise**, cyangwa ukoreshe **Shakisha ubutumwa…**.",
                  shot: "agent-inbox",
                  marks: ["Gushakisha", "Inyandikorugero"],
                },
                {
                  text: "Kanda ikiganiro. **Fungura dosiye** ikujyana kuri dosiye.",
                },
              ],
            },
            {
              id: "write",
              title: "Andika ubutumwa",
              steps: [
                {
                  text: "Hitamo ubibona: **Subiza umukiriya** cyangwa **Inyandiko y'imbere** (umukiriya ntayibona).",
                  shot: "agent-case-conversation",
                  marks: [
                    "Ubibona",
                    "Omeka",
                    "Inyandikorugero",
                    "Ikarita",
                    "Ohereza",
                  ],
                },
                {
                  text: "Andika ukande Enter, cyangwa **Ohereza** (**Ongeraho inyandiko** ku y'imbere). Shift+Enter ni umurongo mushya.",
                },
                {
                  text: "**Omeka dosiye** (MB 10) cyangwa **Fata ijwi**, hanyuma **Hagarika** na **Ohereza ijwi**.",
                },
                {
                  text: "**Shyiramo ikarita**: **Gusaba inyandiko**, **Gahunda** cyangwa **Amakuru mashya**, ukande **Ohereza ikarita**.",
                },
                {
                  text: "Mu nyandiko y'imbere, andika @Diane uvuge umuyobozi.",
                },
              ],
              tips: [
                "Nta murandasi, ubutumwa butegereza muri **Ibitegereje koherezwa**; **Ongera ugerageze** busubiramo.",
              ],
            },
            {
              id: "tpl",
              title: "Inyandikorugero",
              steps: [
                {
                  text: "Kanda **Inyandikorugero n'ibitegereje koherezwa**, hanyuma **Inyandikorugero nshya**. Uzuza **Izina** n'**Ubutumwa** mu ndimi eshatu.",
                  shot: "agent-templates",
                  marks: ["Inyandikorugero"],
                },
                {
                  text: "Kanda **Bika inyandikorugero**. Mu kiganiro, kanda **Inyandikorugero** hanyuma **Shyiramo**.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-calendar",
      cat: "comms",
      minutes: 3,
      updated: U,
      pages: ["/agent/calendar", "/agent/bookings"],
      t: {
        en: {
          title: "Use your calendar and bookings",
          summary:
            "See deadlines, appointments, field visits and client obligations, and sync them to Google or Outlook.",
          keywords:
            "calendar week month agenda appointment booking obligation sync ics google outlook",
          sections: [
            {
              id: "view",
              title: "Browse",
              steps: [
                {
                  text: "Open **Calendar**. Switch **Week**, **Month** or **Agenda**; use **Previous**, **Next** and **Today**.",
                  shot: "agent-calendar",
                  marks: ["Sync"],
                },
                {
                  text: "Click an event. **Event details** show when, where, client and case; click **Open case** or **Join meeting link**.",
                },
              ],
            },
            {
              id: "obligation",
              title: "Close a client obligation",
              steps: [
                {
                  text: "On a **Client obligation**, click **Mark done** (add a note), **Link to a case**, or **Skip**.",
                },
                { text: "**Skip** needs a reason. Click **Confirm**." },
              ],
            },
            {
              id: "sync",
              title: "Sync to Google / Outlook",
              steps: [
                {
                  text: "Click **Sync to Google / Outlook**. Click **Copy** to copy your private link.",
                  shot: "agent-calendar-sync",
                  marks: ["Sync dialog"],
                },
                {
                  text: "In Google Calendar or Outlook, add a calendar “From URL” and paste the link.",
                },
              ],
              warn: "Anyone with the link sees your schedule. **Regenerate link** stops the old link at once; you must re-add the new one.",
            },
          ],
        },
        fr: {
          title: "Utiliser l'agenda et les rendez-vous",
          summary:
            "Voyez échéances, rendez-vous, visites terrain et obligations client, et synchronisez avec Google ou Outlook.",
          keywords:
            "agenda semaine mois liste rendez-vous obligation synchronisation google outlook",
          sections: [
            {
              id: "view",
              title: "Naviguer",
              steps: [
                {
                  text: "Ouvrez **Calendrier**. Basculez **Semaine**, **Mois** ou **Liste** ; utilisez précédent, suivant et **Aujourd'hui**.",
                  shot: "agent-calendar",
                  marks: ["Synchroniser"],
                },
                {
                  text: "Cliquez sur un événement : **Ouvrir le dossier** ou **Rejoindre la réunion**.",
                },
              ],
            },
            {
              id: "obligation",
              title: "Clore une obligation client",
              steps: [
                {
                  text: "Sur une obligation client, cliquez sur **Marquer comme fait**, **Lier à un dossier** ou **Ignorer**.",
                },
                {
                  text: "**Ignorer** demande un motif. Cliquez sur **Confirmer**.",
                },
              ],
            },
            {
              id: "sync",
              title: "Synchroniser avec Google / Outlook",
              steps: [
                {
                  text: "Cliquez sur **Synchroniser avec Google / Outlook**, puis **Copier** pour copier votre lien privé.",
                  shot: "agent-calendar-sync",
                  marks: ["Synchronisation"],
                },
                {
                  text: "Dans Google Agenda ou Outlook, ajoutez un agenda « À partir de l'URL » et collez le lien.",
                },
              ],
              warn: "Toute personne ayant le lien voit votre emploi du temps. **Régénérer le lien** désactive l'ancien immédiatement.",
            },
          ],
        },
        rw: {
          title: "Gukoresha kalendari na gahunda",
          summary:
            "Reba amatariki ntarengwa, gahunda, ingendo n'inshingano z'abakiriya, ubihuze na Google cyangwa Outlook.",
          keywords:
            "kalendari icyumweru ukwezi urutonde gahunda huza google outlook",
          sections: [
            {
              id: "view",
              title: "Kureba",
              steps: [
                {
                  text: "Fungura **Kalendari**. Hitamo **Icyumweru**, **Ukwezi** cyangwa **Urutonde**; koresha **Uyu munsi**.",
                  shot: "agent-calendar",
                  marks: ["Huza"],
                },
                {
                  text: "Kanda igikorwa: **Fungura dosiye** cyangwa **Injira mu nama**.",
                },
              ],
            },
            {
              id: "obligation",
              title: "Gusoza inshingano z'umukiriya",
              steps: [
                {
                  text: "Ku nshingano z'umukiriya, kanda **Byakozwe**, **Huza na dosiye** cyangwa **Simbuka**.",
                },
                { text: "**Simbuka** isaba impamvu. Kanda **Emeza**." },
              ],
            },
            {
              id: "sync",
              title: "Huza na Google / Outlook",
              steps: [
                {
                  text: "Kanda **Huza na Google / Outlook**, hanyuma **Koporora** umuyoboro wawe bwite.",
                  shot: "agent-calendar-sync",
                  marks: ["Guhuza"],
                },
                {
                  text: "Muri Google Calendar cyangwa Outlook, ongeraho kalendari « From URL » ushyiremo umuyoboro.",
                },
              ],
              warn: "Ufite umuyoboro wese abona gahunda yawe. **Kora umuyoboro mushya** ihagarika uwa kera ako kanya.",
            },
          ],
        },
      },
    },
    {
      slug: "agent-clients",
      cat: "comms",
      minutes: 3,
      updated: U,
      pages: ["/agent/clients"],
      t: {
        en: {
          title: "Look up a client",
          summary:
            "See the clients on your cases, their obligations and documents, and contact them through HEBUZA.",
          keywords: "clients client profile call hebuza line note dedicated",
          sections: [
            {
              id: "list",
              title: "Find a client",
              steps: [
                {
                  text: "Open **Clients**. Filter **All**, **Dedicated**, **Active** or **Inactive**, or use **Search clients…**.",
                  shot: "agent-clients",
                  marks: ["Search"],
                },
                {
                  text: "Click a client. Tabs **Overview**, **Cases**, **Documents** and **Activity** show only what is shared on your cases.",
                },
              ],
            },
            {
              id: "contact",
              title: "Contact and notes",
              steps: [
                { text: "Click **Send message** to write on their open case." },
                {
                  text: "Click **Call (HEBUZA line)**: dial the number shown and quote the case ref. Use **Copy** for both. Your number and theirs stay private.",
                },
                {
                  text: "Click **Add note**, write the **Note** and click **Save note**. Only HEBUZA staff on this client's cases see it.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Consulter un client",
          summary:
            "Voyez les clients de vos dossiers, leurs obligations et documents, et contactez-les via HEBUZA.",
          keywords: "clients fiche client appel ligne hebuza note dédié",
          sections: [
            {
              id: "list",
              title: "Trouver un client",
              steps: [
                {
                  text: "Ouvrez **Clients**. Filtrez **Tous**, **Dédiés**, **Actifs** ou **Inactifs**, ou **Rechercher des clients…**.",
                  shot: "agent-clients",
                  marks: ["Recherche"],
                },
                {
                  text: "Cliquez sur un client. Les onglets **Aperçu**, **Dossiers**, **Documents** et **Activité** ne montrent que ce qui est partagé.",
                },
              ],
            },
            {
              id: "contact",
              title: "Contact et notes",
              steps: [
                {
                  text: "**Envoyer un message** écrit sur son dossier ouvert.",
                },
                {
                  text: "**Appeler (ligne HEBUZA)** : composez le numéro affiché et citez la référence. **Copier** pour les deux. Les numéros restent privés.",
                },
                {
                  text: "**Ajouter une note**, puis **Enregistrer la note**. Seul le personnel HEBUZA de ses dossiers la voit.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kureba umukiriya",
          summary:
            "Reba abakiriya bo kuri dosiye zawe, inshingano n'inyandiko zabo, ubavugishe ukoresheje HEBUZA.",
          keywords: "abakiriya umukiriya hamagara umurongo wa hebuza inyandiko",
          sections: [
            {
              id: "list",
              title: "Shaka umukiriya",
              steps: [
                {
                  text: "Fungura **Abakiriya**. Toranya **Bose**, **Banjye bwite**, **Bakora** cyangwa **Badakora**, cyangwa **Shakisha abakiriya…**.",
                  shot: "agent-clients",
                  marks: ["Gushakisha"],
                },
                {
                  text: "Kanda umukiriya. **Incamake**, **Dosiye**, **Inyandiko** na **Ibikorwa** byerekana ibyasangijwe gusa.",
                },
              ],
            },
            {
              id: "contact",
              title: "Kuvugana n'inyandiko",
              steps: [
                {
                  text: "**Ohereza ubutumwa** bwandika kuri dosiye ye ifunguye.",
                },
                {
                  text: "**Hamagara (umurongo wa HEBUZA)**: hamagara nimero igaragara uvuge nimero ya dosiye. **Koporora** byombi. Nimero ziguma ari ibanga.",
                },
                {
                  text: "**Ongeraho inyandiko**, hanyuma **Bika inyandiko**. Abakozi ba HEBUZA bo kuri dosiye ze ni bo bayibona.",
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ money
    {
      slug: "agent-earnings",
      cat: "money",
      minutes: 4,
      updated: U,
      pages: ["/agent/earnings"],
      t: {
        en: {
          title: "Track your earnings and get paid",
          summary:
            "Follow each allocation from Allocated to Paid, download statements and question a wrong amount.",
          keywords:
            "earnings payout statement allocation share paid scheduled question csv payout method",
          sections: [
            {
              id: "read",
              title: "Read the month",
              steps: [
                {
                  text: "Open **Earnings**. Pick a **Month**. Tiles show **Allocated**, **Approved**, **Scheduled**, **Paid** and **Deductions**.",
                  shot: "agent-earnings",
                  marks: ["Export CSV"],
                },
                {
                  text: "Click a bar in the chart or a tile to filter the allocations below. Click **Export CSV** to download them.",
                },
                {
                  text: "Click a row. **Case allocation** shows the eligible fee, licence fee, your share and the timeline to payment.",
                },
              ],
            },
            {
              id: "question",
              title: "Question an amount",
              steps: [
                {
                  text: "In the allocation, click **Question this allocation**.",
                },
                {
                  text: "Pick **Wrong share**, **Missing case**, **Wrong deduction** or **Other** (needs a note), attach a file if useful, click **Send question**.",
                },
                {
                  text: "A ticket number appears; the row shows **Question open** until finance answers.",
                },
              ],
            },
            {
              id: "paid",
              title: "Statements and payouts",
              steps: [
                {
                  text: "Open **Monthly statements** to download each month's statement, or **Payout history** for dates, method and reference.",
                },
                {
                  text: "Under **Payout method**, click **Update** to change account. Finance must verify it again before money moves.",
                },
              ],
              tips: [
                "Approved allocations are paid on the next monthly payout run.",
              ],
            },
          ],
        },
        fr: {
          title: "Suivre vos revenus et être payé",
          summary:
            "Suivez chaque allocation jusqu'au paiement, téléchargez vos relevés et contestez un montant.",
          keywords:
            "revenus paiement relevé allocation part payé planifié contestation csv",
          sections: [
            {
              id: "read",
              title: "Lire le mois",
              steps: [
                {
                  text: "Ouvrez **Revenus**. Choisissez le **Mois**. Les tuiles montrent **Alloué**, **Approuvé**, **Planifié**, **Payé** et **Déductions**.",
                  shot: "agent-earnings",
                  marks: ["Exporter CSV"],
                },
                {
                  text: "Cliquez sur une barre ou une tuile pour filtrer. **Exporter CSV** télécharge la liste.",
                },
                {
                  text: "Cliquez sur une ligne : **Allocation du dossier** détaille honoraires, redevance, votre part et le calendrier.",
                },
              ],
            },
            {
              id: "question",
              title: "Contester un montant",
              steps: [
                {
                  text: "Dans l'allocation, cliquez sur **Contester cette allocation**.",
                },
                {
                  text: "Choisissez **Part incorrecte**, **Dossier manquant**, **Déduction incorrecte** ou **Autre** (note requise), puis **Envoyer la question**.",
                },
                {
                  text: "Un numéro de ticket s'affiche ; la ligne reste marquée jusqu'à la réponse de la finance.",
                },
              ],
            },
            {
              id: "paid",
              title: "Relevés et paiements",
              steps: [
                {
                  text: "**Relevés mensuels** pour télécharger chaque relevé, **Historique des paiements** pour dates, moyen et référence.",
                },
                {
                  text: "Sous **Moyen de paiement**, **Modifier** change de compte. La finance doit le vérifier à nouveau.",
                },
              ],
              tips: [
                "Les allocations approuvées sont payées lors du prochain paiement mensuel.",
              ],
            },
          ],
        },
        rw: {
          title: "Gukurikirana ibyo winjije no kwishyurwa",
          summary:
            "Kurikirana buri mugabane kuva Byagenwe kugeza Byishyuwe, ukuremo inyandiko z'ukwezi kandi ubaze ku mafaranga atari yo.",
          keywords:
            "ibyo winjije kwishyurwa inyandiko umugabane byishyuwe ikibazo csv",
          sections: [
            {
              id: "read",
              title: "Soma ukwezi",
              steps: [
                {
                  text: "Fungura **Ibyo winjije**. Hitamo **Ukwezi**. Udusanduku twerekana **Byagenwe**, **Byemejwe**, **Biteganyijwe**, **Byishyuwe** na **Ibyakuweho**.",
                  shot: "agent-earnings",
                  marks: ["Kuramo CSV"],
                },
                {
                  text: "Kanda umurongo w'igishushanyo cyangwa agasanduku utoranye. **Kuramo CSV** ikuramo urutonde.",
                },
                {
                  text: "Kanda umurongo: **Ibyagenewe dosiye** byerekana amafaranga abarwa, uruhushya, umugabane wawe n'igihe uzishyurirwa.",
                },
              ],
            },
            {
              id: "question",
              title: "Kubaza ku mafaranga",
              steps: [
                { text: "Kanda **Baza kuri ibi byagenwe**." },
                {
                  text: "Hitamo **Umugabane utari wo**, **Dosiye ibura**, **Ikurwaho ritari ryo** cyangwa **Ibindi** (andika impamvu), ukande **Ohereza ikibazo**.",
                },
                {
                  text: "Ubona nimero y'itike; umurongo ugumana ikimenyetso kugeza imari isubije.",
                },
              ],
            },
            {
              id: "paid",
              title: "Inyandiko n'ubwishyu",
              steps: [
                {
                  text: "**Inyandiko za buri kwezi** zikurwamo; **Amateka y'ubwishyu** yerekana amatariki, uburyo na nimero.",
                },
                {
                  text: "Munsi ya **Uburyo bwo kwishyurwa**, **Hindura** ihindura konti. Imari igomba kongera kuyemeza.",
                },
              ],
              tips: [
                "Ibyemejwe byishyurwa ku bwishyu bwa buri kwezi bukurikira.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "agent-performance",
      cat: "money",
      minutes: 2,
      updated: U,
      pages: ["/agent/performance"],
      t: {
        en: {
          title: "Check your performance",
          summary:
            "Your completed cases, on-time rate, turnaround, rework and client rating against the team median.",
          keywords: "performance kpi on-time rating rework turnaround feedback",
          sections: [
            {
              id: "read",
              title: "Read the figures",
              steps: [
                {
                  text: "Open **Performance**. Choose a **Period**: **Last 30 days**, **Quarter** or **Year**.",
                  shot: "agent-performance",
                  marks: [],
                },
                {
                  text: "Cards show **Cases completed**, **On-time**, **Avg turnaround**, **Rework rate**, **Client rating** and **Complaints**, each against the team median.",
                },
                {
                  text: "**By service** breaks figures down per service; **Recent client feedback** lists what clients said.",
                },
              ],
              tips: [
                "Figures appear after your first 3 completed cases. Colleagues are never named.",
              ],
            },
          ],
        },
        fr: {
          title: "Consulter votre performance",
          summary:
            "Dossiers terminés, délais respectés, durée, reprises et note client comparés à la médiane de l'équipe.",
          keywords: "performance indicateurs délais note reprise avis",
          sections: [
            {
              id: "read",
              title: "Lire les chiffres",
              steps: [
                {
                  text: "Ouvrez **Performance**. Choisissez la **Période** : **30 derniers jours**, **Trimestre** ou **Année**.",
                  shot: "agent-performance",
                  marks: [],
                },
                {
                  text: "Les cartes montrent **Dossiers terminés**, **Dans les délais**, durée moyenne, **Taux de reprise**, **Note client** et réclamations, face à la médiane.",
                },
                {
                  text: "**Par service** détaille par service ; **Avis clients récents** liste les retours.",
                },
              ],
              tips: [
                "Les chiffres apparaissent après 3 dossiers terminés. Aucun collègue n'est nommé.",
              ],
            },
          ],
        },
        rw: {
          title: "Kureba imikorere yawe",
          summary:
            "Dosiye warangije, gukora ku gihe, igihe bitwara, ibyasubiwemo n'amanota y'abakiriya ugereranyije n'itsinda.",
          keywords: "imikorere ku gihe amanota ibyasubiwemo ibitekerezo",
          sections: [
            {
              id: "read",
              title: "Soma imibare",
              steps: [
                {
                  text: "Fungura **Imikorere**. Hitamo **Igihe**: **Iminsi 30 ishize**, **Igihembwe** cyangwa **Umwaka**.",
                  shot: "agent-performance",
                  marks: [],
                },
                {
                  text: "Amakarita yerekana **Dosiye zarangiye**, **Ku gihe**, **Ibyasubiwemo**, **Amanota y'abakiriya** n'ibindi, ugereranyije n'itsinda.",
                },
                {
                  text: "**Ku serivisi** bitandukanya buri serivisi; **Ibitekerezo by'abakiriya biheruka** byerekana ibyo bavuze.",
                },
              ],
              tips: [
                "Imibare igaragara nyuma ya dosiye 3 zarangiye. Nta mukozi mugenzi uvugwa izina.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ account
    {
      slug: "agent-profile",
      cat: "account",
      minutes: 4,
      updated: U,
      pages: ["/agent/profile"],
      t: {
        en: {
          title: "Keep your profile and skills up to date",
          summary:
            "Edit your profile and CV, request a skill change, read your contract and choose notifications.",
          keywords:
            "profile settings skills cv contract notifications security 2-step",
          sections: [
            {
              id: "sections",
              title: "Profile sections",
              steps: [
                {
                  text: "Open **Profile**. Sections: **Profile & CV**, **Skills**, **Availability & leave**, **Contract**, **Notifications**, **Security**.",
                  shot: "agent-profile",
                  marks: ["Sections"],
                },
                {
                  text: "**Profile & CV**: edit in place; changes save automatically.",
                },
                {
                  text: "**Contract** is read-only: type, revenue share, start and end. Reminders come 60, 30 and 7 days before the end.",
                },
                {
                  text: "**Notifications**: tick In-app, SMS or WhatsApp per event. Required ones cannot be turned off.",
                },
              ],
            },
            {
              id: "skills",
              title: "Request a skill change",
              steps: [
                {
                  text: "Open **Skills** and click **Request change**.",
                  shot: "agent-skills",
                  marks: ["Sections"],
                },
                {
                  text: "Set the new level, or add a service, and write why. Click **Send request**.",
                },
                {
                  text: "The change waits for your manager's approval. Use **Cancel request** to withdraw it; only one request at a time.",
                },
              ],
              tips: [
                "**Security**: 2-step verification is always on for staff. To change your device, contact IT.",
              ],
            },
          ],
        },
        fr: {
          title: "Tenir à jour votre profil et vos compétences",
          summary:
            "Modifiez profil et CV, demandez un changement de compétence, lisez votre contrat et réglez les notifications.",
          keywords:
            "profil paramètres compétences cv contrat notifications sécurité",
          sections: [
            {
              id: "sections",
              title: "Sections du profil",
              steps: [
                {
                  text: "Ouvrez **Profil**. Sections : **Profil et CV**, **Compétences**, **Disponibilité et congés**, **Contrat**, **Notifications**, **Sécurité**.",
                  shot: "agent-profile",
                  marks: ["Sections"],
                },
                {
                  text: "**Profil et CV** : modifiez directement ; tout s'enregistre.",
                },
                {
                  text: "**Contrat** est en lecture seule : type, part, début et fin. Rappels à 60, 30 et 7 jours.",
                },
                {
                  text: "**Notifications** : cochez In-app, SMS ou WhatsApp par événement. Les obligatoires restent actives.",
                },
              ],
            },
            {
              id: "skills",
              title: "Demander un changement de compétence",
              steps: [
                {
                  text: "Ouvrez **Compétences** et cliquez sur **Demander un changement**.",
                  shot: "agent-skills",
                  marks: ["Sections"],
                },
                {
                  text: "Choisissez le nouveau niveau ou ajoutez un service, expliquez pourquoi, puis **Envoyer la demande**.",
                },
                {
                  text: "Le changement attend l'accord de votre manager. **Annuler la demande** la retire ; une seule à la fois.",
                },
              ],
              tips: [
                "**Sécurité** : la vérification en 2 étapes est toujours active. Pour changer d'appareil, contactez l'informatique.",
              ],
            },
          ],
        },
        rw: {
          title: "Kuvugurura umwirondoro n'ubumenyi",
          summary:
            "Hindura umwirondoro na CV, usabe guhindura ubumenyi, usome amasezerano kandi uhitemo uko umenyeshwa.",
          keywords:
            "umwirondoro igenamiterere ubumenyi cv amasezerano imenyesha umutekano",
          sections: [
            {
              id: "sections",
              title: "Ibice by'umwirondoro",
              steps: [
                {
                  text: "Fungura **Umwirondoro**. Ibice: **Umwirondoro na CV**, **Ubumenyi**, **Kuboneka n'ikiruhuko**, **Amasezerano**, **Imenyesha**, **Umutekano**.",
                  shot: "agent-profile",
                  marks: ["Ibice"],
                },
                {
                  text: "**Umwirondoro na CV**: hindura aho; bibikwa ako kanya.",
                },
                {
                  text: "**Amasezerano** ni ayo gusoma gusa: ubwoko, umugabane, itangira n'irangira. Wibutswa mbere y'iminsi 60, 30 na 7.",
                },
                {
                  text: "**Imenyesha**: hitamo In-app, SMS cyangwa WhatsApp. Asabwa ntashobora kuzimwa.",
                },
              ],
            },
            {
              id: "skills",
              title: "Saba guhindura ubumenyi",
              steps: [
                {
                  text: "Fungura **Ubumenyi** ukande **Saba impinduka**.",
                  shot: "agent-skills",
                  marks: ["Ibice"],
                },
                {
                  text: "Hitamo urwego rushya cyangwa wongereho serivisi, usobanure impamvu, ukande **Ohereza icyifuzo**.",
                },
                {
                  text: "Bitegereza ko umuyobozi abyemeza. **Hagarika icyifuzo** kirakivanaho; kimwe gusa icyarimwe.",
                },
              ],
              tips: [
                "**Umutekano**: kwemeza mu ntambwe 2 buri gihe birakora. Guhindura igikoresho, vugana na IT.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ field
    {
      slug: "agent-field-day",
      cat: "field",
      minutes: 4,
      updated: U,
      pages: ["/agent/field"],
      t: {
        en: {
          title: "Plan your field day on a phone",
          summary:
            "Download today's tasks for offline use, answer task offers, sync the outbox and claim expenses.",
          facts: { who: "Agents with field work turned on" },
          keywords:
            "field visits phone offline download prepare outbox sync expenses moto",
          sections: [
            {
              id: "prepare",
              title: "Before you leave",
              steps: [
                {
                  text: "Open **Field visits**. The day plan lists today's visits (**List** or **Map**).",
                },
                {
                  text: "Tap **Download for offline**. On **Prepare offline**, tap **Download now** while you still have a connection.",
                },
                {
                  text: "Data is encrypted on the phone and wiped after 72 hours. Tap **Install the app** to keep it safer.",
                },
              ],
            },
            {
              id: "offers",
              title: "Task offers",
              steps: [
                {
                  text: "Under **New task offers**, tap **Accept**. It is confirmed once you are online.",
                },
                {
                  text: "Or tap **Decline** and pick a reason. Declining needs a connection.",
                },
              ],
            },
            {
              id: "outbox",
              title: "Outbox and expenses",
              steps: [
                {
                  text: "Open **Outbox**: items wait here in order and send when online. Tap **Sync now**.",
                },
                {
                  text: "If an item **Needs review**, tap **Review** and choose **Use office version** or keep yours.",
                },
                {
                  text: "Open **Expenses** → **New expense**: pick **Category**, **Amount (RWF)**, the **Task**, add a **Receipt photo** (or **No receipt given** with a reason), then **Save expense**.",
                },
              ],
              warn: "**Discard** deletes an outbox item from the phone for good. Signed receipts cannot be discarded.",
            },
          ],
        },
        fr: {
          title: "Préparer votre journée terrain sur téléphone",
          summary:
            "Téléchargez les tâches pour le hors-ligne, répondez aux offres, synchronisez les envois et déclarez vos dépenses.",
          facts: { who: "Agents avec le travail terrain activé" },
          keywords:
            "terrain visites téléphone hors ligne télécharger envois synchroniser dépenses moto",
          sections: [
            {
              id: "prepare",
              title: "Avant de partir",
              steps: [
                {
                  text: "Ouvrez **Visites terrain**. Le plan du jour liste les visites (**Liste** ou **Carte**).",
                },
                {
                  text: "Touchez **Télécharger pour le hors-ligne**. Sur **Préparer le hors-ligne**, touchez **Télécharger** tant que vous êtes connecté.",
                },
                {
                  text: "Les données sont chiffrées et effacées après 72 heures. **Installer l'application** les protège mieux.",
                },
              ],
            },
            {
              id: "offers",
              title: "Offres de tâches",
              steps: [
                {
                  text: "Sous **Nouvelles offres**, touchez **Accepter**. La confirmation arrive en ligne.",
                },
                {
                  text: "Ou **Refuser** avec une raison. Refuser nécessite une connexion.",
                },
              ],
            },
            {
              id: "outbox",
              title: "Envois et dépenses",
              steps: [
                {
                  text: "Ouvrez **Envois** : les éléments partent dans l'ordre une fois en ligne. Touchez **Synchroniser**.",
                },
                {
                  text: "Si un élément est à vérifier, touchez **Vérifier** puis **Garder la version du bureau** ou la vôtre.",
                },
                {
                  text: "**Dépenses** → **Nouvelle dépense** : **Catégorie**, **Montant (RWF)**, **Tâche**, **Photo du reçu** (ou **Pas de reçu** avec motif), puis **Enregistrer la dépense**.",
                },
              ],
              warn: "**Supprimer** efface définitivement un élément du téléphone. Les reçus signés ne peuvent pas être supprimés.",
            },
          ],
        },
        rw: {
          title: "Gutegura umunsi w'ingendo kuri telefoni",
          summary:
            "Kurura imirimo y'uyu munsi ukore nta interineti, usubize imirimo wahawe, wohereze ibitegereje kandi usabe amafaranga wakoresheje.",
          facts: { who: "Abakozi bemerewe ingendo z'akazi" },
          keywords:
            "ingendo telefoni nta interineti kurura ibyoherezwa amafaranga moto",
          sections: [
            {
              id: "prepare",
              title: "Mbere yo kugenda",
              steps: [
                {
                  text: "Fungura **Ingendo z'akazi**. Gahunda y'umunsi yerekana ingendo (**Urutonde** cyangwa **Ikarita**).",
                },
                {
                  text: "Kanda **Kurura ngo ukore nta interineti**. Kuri **Itegure gukora nta interineti**, kanda **Kurura ubu** ukiri kuri interineti.",
                },
                {
                  text: "Amakuru abikwa mu ibanga kuri telefoni agasibwa nyuma y'amasaha 72. **Shyiraho porogaramu** ibirinda kurushaho.",
                },
              ],
            },
            {
              id: "offers",
              title: "Imirimo wahawe",
              steps: [
                {
                  text: "Munsi ya **Imirimo mishya wahawe**, kanda **Emera**. Byemezwa ugeze kuri interineti.",
                },
                {
                  text: "Cyangwa **Anga** uhitemo impamvu. Kwanga bisaba interineti.",
                },
              ],
            },
            {
              id: "outbox",
              title: "Ibyoherezwa n'amafaranga",
              steps: [
                {
                  text: "Fungura **Ibyoherezwa**: bigenda uko bikurikirana iyo uri kuri interineti. Kanda **Ohereza ubu**.",
                },
                {
                  text: "Niba hari igikeneye isuzuma, kanda **Suzuma** uhitemo **Koresha iy'ibiro** cyangwa iyawe.",
                },
                {
                  text: "**Amafaranga yakoreshejwe** → **Ongeraho**: **Ubwoko**, **Amafaranga (RWF)**, **Igikorwa**, **Ifoto y'inyemezabwishyu** (cyangwa **Nta nyemezabwishyu yatanzwe** n'impamvu), ukande **Bika**.",
                },
              ],
              warn: "**Siba** ikuraho burundu ikintu kuri telefoni. Inyemezabwishyu zasinywe ntizisibwa.",
            },
          ],
        },
      },
    },
    {
      slug: "agent-field-visit",
      cat: "field",
      minutes: 6,
      updated: U,
      pages: ["/agent/field/visits", "/agent/field"],
      t: {
        en: {
          title: "Do a field visit: check in, scan, sign, check out",
          summary:
            "The four steps of a visit on your phone, including photo capture and the client's signature on a receipt.",
          keywords:
            "visit check-in gps photo scan document receipt signature otp custody check-out outcome",
          sections: [
            {
              id: "checkin",
              title: "1. Check-in",
              steps: [
                {
                  text: "On the day plan, tap a visit, then **Start visit**. Steps: **Check-in**, **Work**, **Receipt**, **Check-out**.",
                },
                {
                  text: "At the client site, tap **I've arrived**. The first time, read why location is used and tap **Got it, check me in**.",
                },
                {
                  text: "If you are far from the pin or GPS is weak, tap **Take photo** for a timestamped photo, or **Continue without photo**. With no GPS, **Select reason**.",
                },
              ],
            },
            {
              id: "work",
              title: "2. Work",
              steps: [
                {
                  text: "Tick the **Visit checklist**. Write notes and tap **Add note**.",
                },
                {
                  text: "Tap **Scan document**, fill **Document name**, then **Take photo of page 1**. Use **Add page** for more and **Use this crop** to frame.",
                },
                {
                  text: "Tap **Next: receipt** (or **Next: check out** if no documents change hands).",
                },
              ],
            },
            {
              id: "receipt",
              title: "3. Receipt and signature",
              steps: [
                {
                  text: "Choose **Collected from client** or **Returned to client**. Tap **Add item** for each document; mark **Original** or **Copy**.",
                },
                {
                  text: "Tap **Ask client to sign**. The client signs with a finger (**Draw**), or use **Type name instead**, or **SMS code** with **Send code to client** and **Verify code**.",
                },
                {
                  text: "Fill **Client name**, tick the consent and tap **Save signature**. The client copy is sent by SMS/WhatsApp when online.",
                },
              ],
              warn: "Signed receipts cannot be edited. To fix a mistake, use **Correct with a new receipt**.",
            },
            {
              id: "checkout",
              title: "4. Check-out",
              steps: [
                {
                  text: "Choose the **Visit outcome**: **Completed**, **Partially done**, **Client absent** or **Rescheduled**.",
                },
                {
                  text: "**Client absent** needs proof: tap **Record my location** or take a proof photo. **Rescheduled** needs a new date and time.",
                },
                { text: "Tap **Check out**, then **Back to today's tasks**." },
              ],
              tips: [
                "Everything is saved on the phone first; the **Outbox** sends it when you are online.",
                "If documents are damaged or lost, tap **Report a problem** and **Save report**.",
              ],
            },
          ],
        },
        fr: {
          title: "Faire une visite : arrivée, scan, signature, départ",
          summary:
            "Les quatre étapes d'une visite sur téléphone, avec photo et signature du client sur le reçu.",
          keywords:
            "visite arrivée gps photo scan reçu signature otp départ résultat",
          sections: [
            {
              id: "checkin",
              title: "1. Arrivée",
              steps: [
                {
                  text: "Dans le plan du jour, touchez une visite puis **Commencer la visite**. Étapes : **Arrivée**, **Travail**, **Reçu**, **Départ**.",
                },
                {
                  text: "Sur place, touchez **Je suis arrivé**. La première fois, lisez l'explication et touchez **Compris, pointer**.",
                },
                {
                  text: "Loin du repère ou GPS faible : **Prendre une photo** horodatée, ou **Continuer sans photo**. Sans GPS, **Choisissez une raison**.",
                },
              ],
            },
            {
              id: "work",
              title: "2. Travail",
              steps: [
                {
                  text: "Cochez la **Liste de la visite**. Écrivez vos notes et touchez **Ajouter la note**.",
                },
                {
                  text: "**Scanner un document** : **Nom du document**, puis **Photographier la page 1**. **Ajouter une page** et **Utiliser ce cadrage**.",
                },
                {
                  text: "Touchez **Suivant : reçu** (ou **Suivant : départ**).",
                },
              ],
            },
            {
              id: "receipt",
              title: "3. Reçu et signature",
              steps: [
                {
                  text: "Choisissez **Reçu du client** ou **Rendu au client**. **Ajouter un élément** par document, **Original** ou **Copie**.",
                },
                {
                  text: "**Faire signer le client** : au doigt (**Dessiner**), **Saisir le nom**, ou **Code SMS** avec **Envoyer le code au client** et **Vérifier le code**.",
                },
                {
                  text: "Remplissez **Nom du client**, cochez le consentement et touchez **Enregistrer la signature**.",
                },
              ],
              warn: "Un reçu signé n'est plus modifiable. Pour corriger : **Corriger avec un nouveau reçu**.",
            },
            {
              id: "checkout",
              title: "4. Départ",
              steps: [
                {
                  text: "Choisissez le **Résultat de la visite** : **Terminée**, **Partiellement faite**, **Client absent** ou **Reportée**.",
                },
                {
                  text: "**Client absent** demande une preuve : **Enregistrer ma position** ou une photo. **Reportée** demande une nouvelle date.",
                },
                {
                  text: "Touchez **Pointer le départ**, puis **Retour aux tâches du jour**.",
                },
              ],
              tips: [
                "Tout est d'abord enregistré sur le téléphone ; les **Envois** partent en ligne.",
                "Documents abîmés ou perdus : **Signaler un problème** puis **Enregistrer le rapport**.",
              ],
            },
          ],
        },
        rw: {
          title: "Gukora urugendo: kugera, scan, umukono, gusoza",
          summary:
            "Intambwe enye z'urugendo kuri telefoni, harimo gufata amafoto n'umukono w'umukiriya ku nyemezabwishyu.",
          keywords:
            "urugendo kugera gps ifoto scan inyemezabwishyu umukono gusoza",
          sections: [
            {
              id: "checkin",
              title: "1. Kugera",
              steps: [
                {
                  text: "Kuri gahunda y'umunsi, kanda urugendo, hanyuma **Tangira uruzinduko**. Intambwe: **Kugera**, **Akazi**, **Inyemezabwishyu**, **Gusoza**.",
                },
                {
                  text: "Ugeze ku mukiriya, kanda **Nageze**. Ubwa mbere, soma impamvu y'aho uri ukande **Ndabyumva, emeza**.",
                },
                {
                  text: "Niba uri kure y'ikimenyetso cyangwa GPS idakora neza, kanda **Fata ifoto**, cyangwa **Komeza nta foto**. Nta GPS, **Hitamo impamvu**.",
                },
              ],
            },
            {
              id: "work",
              title: "2. Akazi",
              steps: [
                {
                  text: "Hitamo ibiri ku **Urutonde rw'urugendo**. Andika ukande **Ongeraho igisobanuro**.",
                },
                {
                  text: "**Scan inyandiko**: **Izina ry'inyandiko**, hanyuma **Fotora urupapuro rwa 1**. **Ongeraho urupapuro** na **Koresha iki gice**.",
                },
                {
                  text: "Kanda **Ibikurikira: inyemezabwishyu** (cyangwa **Ibikurikira: gusoza**).",
                },
              ],
            },
            {
              id: "receipt",
              title: "3. Inyemezabwishyu n'umukono",
              steps: [
                {
                  text: "Hitamo **Byakiriwe ku mukiriya** cyangwa **Byasubijwe umukiriya**. **Ongeraho ikintu** kuri buri nyandiko, **Umwimerere** cyangwa **Kopi**.",
                },
                {
                  text: "Kanda **Saba umukiriya gusinya**: asinya n'urutoki (**Shushanya**), **Andika izina**, cyangwa **Kode ya SMS** na **Ohereza kode ku mukiriya** na **Emeza kode**.",
                },
                {
                  text: "Uzuza **Izina ry'umukiriya**, wemeze ukande **Bika umukono**.",
                },
              ],
              warn: "Inyemezabwishyu yasinywe ntihinduka. Gukosora, koresha **Kosora ukoresheje inyemezabwishyu nshya**.",
            },
            {
              id: "checkout",
              title: "4. Gusoza",
              steps: [
                {
                  text: "Hitamo **Uko urugendo rwagenze**: **Byarangiye**, **Byakozwe igice**, **Umukiriya ntiyari ahari** cyangwa **Byimuriwe**.",
                },
                {
                  text: "**Umukiriya ntiyari ahari** isaba igihamya: **Andika aho ndi** cyangwa ifoto. **Byimuriwe** isaba itariki nshya.",
                },
                {
                  text: "Kanda **Soza**, hanyuma **Subira ku mirimo y'uyu munsi**.",
                },
              ],
              tips: [
                "Byose bibanza kubikwa kuri telefoni; **Ibyoherezwa** bigenda uri kuri interineti.",
                "Inyandiko zangiritse cyangwa zabuze: **Tanga ikibazo** hanyuma **Bika raporo**.",
              ],
            },
          ],
        },
      },
    },
  ],
};

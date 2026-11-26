import type { WsGuideSet } from "./index";

// Client dashboard guides (signed-in client). Each step's `shot` is captured by scripts/guides/ws-client.spec.ts;
// `marks` label that shot's markers in the spec's selector order ("" hides one). rw/fr are drafts for native review.
const UPDATED = "2026-11-26";

export const CLIENT_WS: WsGuideSet = {
  workspace: "client",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Pour commencer", rw: "Gutangira" },
    },
    {
      key: "requests",
      t: { en: "Your requests", fr: "Vos demandes", rw: "Ubusabe bwawe" },
    },
    {
      key: "docs",
      t: {
        en: "Documents and results",
        fr: "Documents et résultats",
        rw: "Inyandiko n'ibisubizo",
      },
    },
    {
      key: "money",
      t: {
        en: "Payments and refunds",
        fr: "Paiements et remboursements",
        rw: "Kwishyura no gusubizwa",
      },
    },
    {
      key: "account",
      t: {
        en: "Account and companies",
        fr: "Compte et entreprises",
        rw: "Konti n'ibigo",
      },
    },
    {
      key: "help",
      t: {
        en: "Help and consultations",
        fr: "Aide et consultations",
        rw: "Ubufasha n'inama",
      },
    },
  ],
  guides: [
    // 1. Dashboard
    {
      slug: "dashboard-overview",
      cat: "start",
      minutes: 3,
      updated: UPDATED,
      start: true,
      pages: ["/dashboard", "/dashboard/reminders"],
      t: {
        en: {
          title: "Your dashboard and what needs you",
          summary:
            "The Overview page shows what is waiting on you first, then your numbers, active requests and payments due. Start every visit here.",
          keywords:
            "home overview needs you to do reminders tasks stats start page snooze",
          facts: {
            who: "Every signed-in client",
            time: "1 minute per visit",
            cost: "Free",
          },
          sections: [
            {
              id: "read",
              title: "Read the dashboard",
              steps: [
                {
                  text: "In the side menu, click **Overview**. The page greets you by name and shows today's date.",
                  shot: "client-dash",
                  marks: [
                    "Start a new request",
                    "What is waiting on you",
                    "Upload from here",
                    "Your numbers",
                    "Payments due",
                    "All reminders",
                  ],
                  caption: "The Overview page.",
                },
                {
                  text: "Look at **Needs you** first. Each line says what we need (a document, a payment or a quote to review), for which service and request code, and the due date if there is one.",
                },
                {
                  text: "Act on the line directly: **Upload** opens your file picker, **Pay** opens the payment page, **Review quote** opens the request. When nothing is waiting you see **Nothing needs you right now.**",
                },
                {
                  text: "The four tiles **Active requests**, **Completed**, **To pay** and **Unread messages** are links: click one to jump to My requests, Billing or Messages.",
                },
                {
                  text: "**Active requests** lists up to five requests with their status; click **View all requests** for the full list. **Payments due** lists each amount with its own **Pay** button; **You're all paid up.** means you owe nothing.",
                },
                {
                  text: "When there are any, extra cards appear on the right: **Quotes to review**, **New results** and **Coming up** (due dates). Click a line to open it.",
                },
              ],
              tips: [
                "A file uploaded from **Needs you** goes straight into the right request; you do not need to open the request first.",
                "**Recommended services** at the bottom right opens the application for a popular service in one click.",
              ],
            },
            {
              id: "first",
              title: "Your first visit (no requests yet)",
              intro:
                "Before your first request the page shows **Getting started**: a checklist (create your account, start your first request, add your ID to My documents), a **Start your first request** button, a few services with their price, **Browse services**, and **Book a consultation** if you are not sure what you need.",
            },
            {
              id: "reminders",
              title: "Manage your reminders",
              steps: [
                {
                  text: "On the Overview page, click **All reminders**. The **Reminders** page lists everything waiting on you: documents requested, payments due, quotes to review and documents expiring.",
                  shot: "client-reminders",
                  marks: [
                    "Open, Snoozed, Done",
                    "Snooze 3 days",
                    "Mark as done",
                  ],
                },
                {
                  text: "Click the title of a reminder to open the request, payment or document it is about.",
                },
                {
                  text: "Click **Snooze 3 days** to hide it for three days, or **Done** once you have dealt with it. It moves to the **Snoozed** or **Done** tab.",
                },
                {
                  text: "To bring one back, open the **Snoozed** or **Done** tab and click **Reopen**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Votre tableau de bord et ce qui vous attend",
          summary:
            "La page Vue d'ensemble montre d'abord ce qui vous attend, puis vos chiffres, vos demandes actives et les paiements dus. Commencez chaque visite ici.",
          keywords:
            "accueil vue d'ensemble à faire rappels tâches chiffres page d'accueil reporter",
          facts: {
            who: "Tout client connecté",
            time: "1 minute par visite",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "read",
              title: "Lire le tableau de bord",
              steps: [
                {
                  text: "Dans le menu latéral, cliquez sur **Vue d'ensemble**. La page vous salue par votre prénom et affiche la date du jour.",
                  shot: "client-dash",
                  marks: [
                    "Nouvelle demande",
                    "Ce qui vous attend",
                    "Téléverser d'ici",
                    "Vos chiffres",
                    "Paiements dus",
                    "Tous les rappels",
                  ],
                  caption: "La page Vue d'ensemble.",
                },
                {
                  text: "Regardez d'abord **À faire**. Chaque ligne indique ce qu'il nous faut (un document, un paiement ou un devis à examiner), pour quel service et quel code de demande, et l'échéance s'il y en a une.",
                },
                {
                  text: "Agissez directement sur la ligne : **Téléverser** ouvre le sélecteur de fichier, **Payer** ouvre la page de paiement, **Voir le devis** ouvre la demande. S'il n'y a rien, vous voyez **Rien ne vous attend pour le moment.**",
                },
                {
                  text: "Les quatre cases **Demandes actives**, **Terminées**, **À payer** et **Messages non lus** sont des liens : cliquez pour aller à Mes demandes, Facturation ou Messages.",
                },
                {
                  text: "**Demandes actives** affiche jusqu'à cinq demandes avec leur statut ; **Toutes les demandes** ouvre la liste complète. **Paiements dus** liste chaque montant avec son bouton **Payer** ; **Vous êtes à jour.** signifie que vous ne devez rien.",
                },
                {
                  text: "Quand il y en a, d'autres cartes apparaissent à droite : **Devis à examiner**, **Nouveaux résultats** et **À venir** (échéances). Cliquez sur une ligne pour l'ouvrir.",
                },
              ],
              tips: [
                "Un fichier téléversé depuis **À faire** va directement dans la bonne demande ; inutile de l'ouvrir d'abord.",
                "**Services recommandés**, en bas à droite, ouvre la demande d'un service populaire en un clic.",
              ],
            },
            {
              id: "first",
              title: "Votre première visite (aucune demande)",
              intro:
                "Avant votre première demande, la page affiche **Pour commencer** : une liste (créer votre compte, lancer votre première demande, ajouter votre pièce d'identité), un bouton **Lancer votre première demande**, quelques services avec leur prix, **Voir les services**, et **Réserver une consultation** si vous hésitez.",
            },
            {
              id: "reminders",
              title: "Gérer vos rappels",
              steps: [
                {
                  text: "Sur la Vue d'ensemble, cliquez sur **Tous les rappels**. La page **Rappels** liste tout ce qui vous attend : documents demandés, paiements dus, devis à examiner et documents bientôt expirés.",
                  shot: "client-reminders",
                  marks: [
                    "Ouverts, Reportés, Faits",
                    "Reporter de 3 jours",
                    "Marquer comme fait",
                  ],
                },
                {
                  text: "Cliquez sur le titre d'un rappel pour ouvrir la demande, le paiement ou le document concerné.",
                },
                {
                  text: "Cliquez sur **Reporter de 3 jours** pour le masquer trois jours, ou sur **Fait** une fois traité. Il passe dans l'onglet **Reportés** ou **Faits**.",
                },
                {
                  text: "Pour le faire revenir, ouvrez l'onglet **Reportés** ou **Faits** et cliquez sur **Rouvrir**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Ahabanza hawe n'ibigutegereje",
          summary:
            "Paji y'Incamake ikwereka mbere na mbere ibigutegereje, hanyuma imibare yawe, ubusabe buri gukorwa n'ibyo kwishyura. Buri gihe tangirira hano.",
          keywords:
            "ahabanza incamake ibigutegereje ibyibutsa imirimo imibare subika",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Umunota 1 buri gihe",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "read",
              title: "Soma ahabanza",
              steps: [
                {
                  text: "Mu rutonde rw'ibumoso, kanda **Incamake**. Paji iragusuhuza mu izina ikakwereka itariki y'uyu munsi.",
                  shot: "client-dash",
                  marks: [
                    "Tangira ubusabe bushya",
                    "Ibigutegereje",
                    "Ohereza uhereye hano",
                    "Imibare yawe",
                    "Ibyo kwishyura",
                    "Ibyibutsa byose",
                  ],
                  caption: "Paji y'Incamake.",
                },
                {
                  text: "Banza urebe **Ibigutegereje**. Buri murongo uvuga icyo dukeneye (inyandiko, kwishyura cyangwa igiciro cyo gusuzuma), serivisi na kode y'ubusabe, n'itariki ntarengwa niba ihari.",
                },
                {
                  text: "Kora ku murongo ubwawo: **Ohereza** ifungura aho uhitamo dosiye, **Ishyura** ifungura paji yo kwishyura, **Reba igiciro** ifungura ubusabe. Niba nta kigutegereje, ubona **Nta kigutegereje ubu.**",
                },
                {
                  text: "Udusanduku tune **Ibisabwa biri gukorwa**, **Byarangiye**, **Ibyo kwishyura** n'**Ubutumwa butasomwe** ni amahuza: kanda kimwe ujye ku Busabe bwanjye, Kwishyura cyangwa Ubutumwa.",
                },
                {
                  text: "**Ibisabwa biri gukorwa** yerekana ubusabe bugera kuri butanu n'aho bugeze; **Reba ibisabwa byose** ifungura urutonde rwose. **Ibyo kwishyura** yerekana buri mafaranga na buto yayo ya **Ishyura**; **Nta deni ufite.** bisobanura ko nta cyo ugomba.",
                },
                {
                  text: "Iyo bihari, andi makarita agaragara iburyo: **Ibiciro byo gusuzuma**, **Ibisubizo bishya** na **Ibiri imbere** (amatariki ntarengwa). Kanda umurongo uwufungure.",
                },
              ],
              tips: [
                "Dosiye wohereje uhereye ku **Ibigutegereje** ijya mu busabe bukwiye; ntukeneye kubanza kubufungura.",
                "**Serivisi tugusabira**, hasi iburyo, ifungura gusaba serivisi ikunzwe ukanze rimwe.",
              ],
            },
            {
              id: "first",
              title: "Ubwa mbere winjiye (nta busabe uragira)",
              intro:
                "Mbere y'ubusabe bwa mbere, paji yerekana **Gutangira**: urutonde (fungura konti, tangira ubusabe bwa mbere, shyira indangamuntu mu nyandiko zawe), buto **Tangira ubusabe bwa mbere**, serivisi nke n'ibiciro byazo, **Reba serivisi**, na **Saba inama** niba utazi neza icyo ukeneye.",
            },
            {
              id: "reminders",
              title: "Cunga ibyibutsa byawe",
              steps: [
                {
                  text: "Ku Incamake, kanda **Ibyibutsa byose**. Paji y'**Ibyibutsa** yerekana ibigutegereje byose: inyandiko zisabwa, ibyo kwishyura, ibiciro byo gusuzuma n'inyandiko zirenda kurangira.",
                  shot: "client-reminders",
                  marks: [
                    "Bifunguye, Byasubitswe, Byarangiye",
                    "Subika iminsi 3",
                    "Byarangiye",
                  ],
                },
                {
                  text: "Kanda umutwe w'icyibutsa ufungure ubusabe, ubwishyu cyangwa inyandiko bijyanye.",
                },
                {
                  text: "Kanda **Subika iminsi 3** kugira ngo kibure iminsi itatu, cyangwa **Byarangiye** umaze kugikora. Kijya mu gice cya **Byasubitswe** cyangwa **Byarangiye**.",
                },
                {
                  text: "Kugira ngo kigaruke, fungura **Byasubitswe** cyangwa **Byarangiye** ukande **Ongera ufungure**.",
                },
              ],
            },
          ],
        },
      },
    },
    // 2. Start a request
    {
      slug: "start-a-request",
      cat: "requests",
      minutes: 3,
      updated: UPDATED,
      start: true,
      pages: ["/dashboard", "/requests", "/history"],
      t: {
        en: {
          title: "Start a new request from your dashboard",
          summary:
            "Every request starts from Start a request. Pick the service, follow the steps, and the new request appears in My requests with its own code.",
          keywords:
            "new request apply service order begin start again repeat request again",
          facts: {
            who: "Every signed-in client",
            time: "5 to 15 minutes, depending on the service",
            cost: "The service fee shown on the service page",
            need: [
              "The documents the service lists",
              "A way to pay (Mobile Money or card)",
            ],
          },
          sections: [
            {
              id: "start",
              title: "Start the request",
              steps: [
                {
                  text: "Click **Start a request** at the top right of the Overview page (the same button is on **My requests**).",
                  shot: "client-dash",
                  marks: ["Start a request", "", "", "", "", ""],
                },
                {
                  text: "The services list opens. Search or browse, open the service you need, and start the application.",
                },
                {
                  text: "Fill in each step on screen. Details you saved before (your profile, your address, documents in **My documents**) are offered so you do not type them again.",
                },
                {
                  text: "Submit and pay if the service asks for payment up front. You get a request code like **HBZ-ZSXRA6**.",
                },
                {
                  text: "Click **My requests** in the side menu: the new request is at the top of the list with its status.",
                  shot: "client-requests-list",
                  marks: ["Start a request", "", "", "", "Your new request"],
                },
              ],
              tips: [
                "Not sure which service you need? Click **Book a consultation** on the first-visit page, or **Consultations** in the side menu.",
                "Custom work gets a quotation first: it appears under **Quotes to review** on the Overview page and in **Billing → Quotations**.",
              ],
            },
            {
              id: "again",
              title: "Repeat a service you used before",
              steps: [
                {
                  text: "Click **History** in the side menu, find the request, and click **Request again** next to it. The same service opens so you can start a new request.",
                  shot: "client-history",
                  marks: ["", "", "Request again"],
                },
              ],
            },
          ],
        },
        fr: {
          title: "Lancer une nouvelle demande depuis votre espace",
          summary:
            "Chaque demande commence par Nouvelle demande. Choisissez le service, suivez les étapes, et la demande apparaît dans Mes demandes avec son propre code.",
          keywords:
            "nouvelle demande service commander commencer redemander refaire",
          facts: {
            who: "Tout client connecté",
            time: "5 à 15 minutes selon le service",
            cost: "Le tarif affiché sur la page du service",
            need: [
              "Les documents demandés par le service",
              "Un moyen de paiement (Mobile Money ou carte)",
            ],
          },
          sections: [
            {
              id: "start",
              title: "Lancer la demande",
              steps: [
                {
                  text: "Cliquez sur **Nouvelle demande** en haut à droite de la Vue d'ensemble (le même bouton est sur **Mes demandes**).",
                  shot: "client-dash",
                  marks: ["Nouvelle demande", "", "", "", "", ""],
                },
                {
                  text: "La liste des services s'ouvre. Cherchez ou parcourez, ouvrez le service voulu et commencez la demande.",
                },
                {
                  text: "Remplissez chaque étape. Les informations déjà enregistrées (profil, adresse, documents de **Mes documents**) vous sont proposées pour ne pas les retaper.",
                },
                {
                  text: "Envoyez et payez si le service demande un paiement d'avance. Vous recevez un code de demande comme **HBZ-ZSXRA6**.",
                },
                {
                  text: "Cliquez sur **Mes demandes** dans le menu latéral : la nouvelle demande est en haut de la liste avec son statut.",
                  shot: "client-requests-list",
                  marks: [
                    "Nouvelle demande",
                    "",
                    "",
                    "",
                    "Votre nouvelle demande",
                  ],
                },
              ],
              tips: [
                "Vous hésitez sur le service ? Cliquez sur **Réserver une consultation** ou sur **Consultations** dans le menu latéral.",
                "Un travail sur mesure reçoit d'abord un devis : il apparaît dans **Devis à examiner** sur la Vue d'ensemble et dans **Facturation → Devis**.",
              ],
            },
            {
              id: "again",
              title: "Refaire un service déjà utilisé",
              steps: [
                {
                  text: "Cliquez sur **Historique** dans le menu latéral, trouvez la demande et cliquez sur **Redemander** à côté. Le même service s'ouvre pour une nouvelle demande.",
                  shot: "client-history",
                  marks: ["", "", "Redemander"],
                },
              ],
            },
          ],
        },
        rw: {
          title: "Tangira ubusabe bushya uhereye ahabanza",
          summary:
            "Ubusabe bwose butangirira kuri Tangira gusaba. Hitamo serivisi, ukurikize intambwe, ubusabe bushya bugaragare mu Busabe bwanjye bufite kode yabwo.",
          keywords: "ubusabe bushya gusaba serivisi gutangira saba indi nshuro",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 5 kugeza kuri 15 bitewe na serivisi",
            cost: "Igiciro kiri kuri paji ya serivisi",
            need: [
              "Inyandiko serivisi isaba",
              "Uburyo bwo kwishyura (Mobile Money cyangwa ikarita)",
            ],
          },
          sections: [
            {
              id: "start",
              title: "Tangira ubusabe",
              steps: [
                {
                  text: "Kanda **Tangira gusaba** hejuru iburyo ku Incamake (iyo buto iri no ku **Ibyo nasabye**).",
                  shot: "client-dash",
                  marks: ["Tangira gusaba", "", "", "", "", ""],
                },
                {
                  text: "Urutonde rwa serivisi rurafunguka. Shakisha cyangwa urebe, fungura serivisi ukeneye utangire gusaba.",
                },
                {
                  text: "Uzuza buri ntambwe. Amakuru wabitse mbere (umwirondoro, aderesi, inyandiko ziri mu **Nyandiko zanjye**) aragusabirwa kugira ngo utongera kuyandika.",
                },
                {
                  text: "Ohereza kandi wishyure niba serivisi isaba kwishyura mbere. Uhabwa kode y'ubusabe nka **HBZ-ZSXRA6**.",
                },
                {
                  text: "Kanda **Ubusabe bwanjye** mu rutonde rw'ibumoso: ubusabe bushya buri hejuru ku rutonde n'aho bugeze.",
                  shot: "client-requests-list",
                  marks: ["Tangira gusaba", "", "", "", "Ubusabe bwawe bushya"],
                },
              ],
              tips: [
                "Ntuzi serivisi ukeneye? Kanda **Saba inama** cyangwa **Inama** mu rutonde rw'ibumoso.",
                "Akazi kihariye kabanza guhabwa igiciro: kigaragara mu **Ibiciro byo gusuzuma** ku Incamake no muri **Inyemezabwishyu → Ibiciro byatanzwe**.",
              ],
            },
            {
              id: "again",
              title: "Ongera usabe serivisi wigeze gukoresha",
              steps: [
                {
                  text: "Kanda **Amateka** mu rutonde rw'ibumoso, shaka ubusabe, ukande **Saba indi nshuro** iruhande rwabwo. Serivisi imwe irafunguka utangire ubusabe bushya.",
                  shot: "client-history",
                  marks: ["", "", "Saba indi nshuro"],
                },
              ],
            },
          ],
        },
      },
    },
    // 3. Follow a request
    {
      slug: "follow-a-request",
      cat: "requests",
      minutes: 5,
      updated: UPDATED,
      start: true,
      pages: ["/requests"],
      t: {
        en: {
          title: "Find and follow a request",
          summary:
            "My requests lists every request with its status and payment. Open one to see what we need from you, its progress, payments, results and messages.",
          keywords:
            "track status progress my requests timeline code HBZ where is my request deliverables payments tabs",
          facts: {
            who: "Every signed-in client",
            time: "1 minute",
            cost: "Free",
          },
          sections: [
            {
              id: "list",
              title: "Find your request",
              steps: [
                {
                  text: "Click **My requests** in the side menu. Each row shows the **Code**, **Service**, **Status**, **Payment** (**Paid**, **Pending** or **Unpaid**) and **Submitted** date.",
                  shot: "client-requests-list",
                  marks: [
                    "New request",
                    "Filter by status",
                    "Search code or service",
                    "Filter by service",
                    "Your requests",
                  ],
                },
                {
                  text: "Use the buttons **All**, **Needs you**, **In progress**, **Completed** and **Closed** to filter by status; the number shows how many are in each.",
                },
                {
                  text: "Type a code (for example **HBZ-2RT8LM**) or a service name in **Search by code or service**, or pick a service in **All services**.",
                },
                {
                  text: "Click a column title to sort. If nothing matches, click **Clear filters**.",
                },
                { text: "Click a row to open the request." },
              ],
            },
            {
              id: "overview",
              title: "Read the request page",
              steps: [
                {
                  text: "The top shows the code, the service, the status, the date it was submitted and **Handled by** with your adviser's name once assigned. The **Overview** tab opens first.",
                  shot: "client-request-overview",
                  marks: [
                    "Code, service and status",
                    "The five tabs",
                    "Needed from you",
                    "Cancel or ask to cancel",
                  ],
                },
                {
                  text: "**Needed from you** lists anything we are waiting for, with an **Upload** or **Pay** button. **Nothing is needed from you.** means the next move is ours.",
                },
                {
                  text: "On the right, **HEBUZA status** is our progress; **Institution decision** (when shown) is the official answer from the government office, with its reference and date. They are kept apart on purpose.",
                },
                {
                  text: "Click **Timeline** to see every step with its date and time. The current step is highlighted; future steps are greyed.",
                  shot: "client-request-timeline",
                  marks: ["Every step, with dates"],
                },
                {
                  text: "Click **Payments** to see each payment: paid ones show **Paid** and the date with a **Receipt** link; unpaid ones show the due date and **Pay now**.",
                  shot: "client-request-payments",
                  marks: ["A payment line", "Pay now"],
                },
                {
                  text: "Click **Deliverables** to download your results. A locked file says **Released after final payment** until the balance is paid.",
                  shot: "client-request-deliverables",
                  marks: ["Your result", "Download"],
                },
                {
                  text: "Click **Messages** to write to your adviser about this request (see the guide on messages).",
                },
              ],
            },
            {
              id: "status",
              title: "What each status means",
              tips: [
                "**Request received** / **Under review**: we have it and are checking it.",
                "**Awaiting quotation**: we are pricing custom work; you get a quote to accept in Billing.",
                "**Awaiting payment** / **Awaiting your documents**: it waits on you; the item is in **Needs you**.",
                "**Approved and assigned** / **In progress** / **Awaiting internal review**: we are working on it.",
                "**Awaiting external institution**: the file is with the government office; times depend on them.",
                "**Completed and delivered**: results are in **Deliverables** and in **Documents → From HEBUZA**.",
                "**On hold**, **Cancelled**, **Rejected**, **Refund requested**, **Refunded**: the request is paused or closed; open **Messages** to ask why.",
              ],
              faq: [
                {
                  q: "I can't find my request.",
                  a: "Click **All** and clear the search. If you came from a link and see **We couldn't find this request.**, check the code, or open it from your list.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Retrouver et suivre une demande",
          summary:
            "Mes demandes liste chaque demande avec son statut et son paiement. Ouvrez-en une pour voir ce qu'il nous faut, l'avancement, les paiements, les résultats et les messages.",
          keywords:
            "suivre statut avancement mes demandes chronologie code HBZ où en est livrables paiements onglets",
          facts: {
            who: "Tout client connecté",
            time: "1 minute",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "list",
              title: "Retrouver votre demande",
              steps: [
                {
                  text: "Cliquez sur **Mes demandes** dans le menu latéral. Chaque ligne montre le **Code**, le **Service**, le **Statut**, le **Paiement** (**Payé**, **En attente** ou **Non payé**) et la date **Soumise**.",
                  shot: "client-requests-list",
                  marks: [
                    "Nouvelle demande",
                    "Filtrer par statut",
                    "Chercher code ou service",
                    "Filtrer par service",
                    "Vos demandes",
                  ],
                },
                {
                  text: "Utilisez **Toutes**, **À faire**, **En cours**, **Terminées** et **Clôturées** pour filtrer ; le chiffre indique combien il y en a.",
                },
                {
                  text: "Tapez un code (par exemple **HBZ-2RT8LM**) ou un nom de service dans **Rechercher par code ou service**, ou choisissez un service dans **Tous les services**.",
                },
                {
                  text: "Cliquez sur un titre de colonne pour trier. Si rien ne correspond, cliquez sur **Effacer les filtres**.",
                },
                { text: "Cliquez sur une ligne pour ouvrir la demande." },
              ],
            },
            {
              id: "overview",
              title: "Lire la page de la demande",
              steps: [
                {
                  text: "En haut : le code, le service, le statut, la date d'envoi et **Traitée par** avec le nom de votre conseiller une fois attribuée. L'onglet **Aperçu** s'ouvre en premier.",
                  shot: "client-request-overview",
                  marks: [
                    "Code, service et statut",
                    "Les cinq onglets",
                    "Nous avons besoin de vous",
                    "Annuler ou demander l'annulation",
                  ],
                },
                {
                  text: "**Nous avons besoin de vous** liste ce que nous attendons, avec un bouton **Téléverser** ou **Payer**. **Rien n'est requis de votre part.** veut dire que c'est à nous d'agir.",
                },
                {
                  text: "À droite, **Statut HEBUZA** est notre avancement ; **Décision de l'institution** (si affichée) est la réponse officielle de l'administration, avec sa référence et sa date. Les deux restent séparés exprès.",
                },
                {
                  text: "Cliquez sur **Chronologie** pour voir chaque étape avec sa date et son heure. L'étape en cours est mise en avant ; les suivantes sont grisées.",
                  shot: "client-request-timeline",
                  marks: ["Chaque étape, datée"],
                },
                {
                  text: "Cliquez sur **Paiements** : les paiements réglés indiquent **Payé le** avec un lien **Reçu** ; les autres montrent l'échéance et **Payer**.",
                  shot: "client-request-payments",
                  marks: ["Une ligne de paiement", "Payer"],
                },
                {
                  text: "Cliquez sur **Livrables** pour télécharger vos résultats. Un fichier verrouillé indique **Disponible après le paiement final** tant que le solde n'est pas réglé.",
                  shot: "client-request-deliverables",
                  marks: ["Votre résultat", "Télécharger"],
                },
                {
                  text: "Cliquez sur **Messages** pour écrire à votre conseiller sur cette demande (voir le guide des messages).",
                },
              ],
            },
            {
              id: "status",
              title: "Ce que veut dire chaque statut",
              tips: [
                "**Demande reçue** / **En cours d'examen** : nous l'avons et la vérifions.",
                "**En attente de devis** : nous chiffrons un travail sur mesure ; vous recevrez un devis à accepter dans Facturation.",
                "**En attente de paiement** / **En attente de vos documents** : elle attend votre action ; l'élément est dans **À faire**.",
                "**Approuvée et attribuée** / **En cours** / **En attente de revue interne** : nous y travaillons.",
                "**En attente de l'institution** : le dossier est à l'administration ; les délais dépendent d'elle.",
                "**Terminée et livrée** : les résultats sont dans **Livrables** et dans **Documents → De HEBUZA**.",
                "**En pause**, **Annulée**, **Refusée**, **Remboursement demandé**, **Remboursée** : la demande est suspendue ou close ; ouvrez **Messages** pour savoir pourquoi.",
              ],
              faq: [
                {
                  q: "Je ne trouve pas ma demande.",
                  a: "Cliquez sur **Toutes** et videz la recherche. Si un lien affiche **Demande introuvable.**, vérifiez le code ou ouvrez-la depuis votre liste.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Shaka kandi ukurikirane ubusabe",
          summary:
            "Ibyo nasabye yerekana ubusabe bwawe bwose n'aho bugeze no kwishyura. Fungura bumwe urebe ibyo tugukeneyeho, aho bigeze, kwishyura, ibisubizo n'ubutumwa.",
          keywords:
            "gukurikirana aho bigeze ubusabe bwanjye urugendo kode HBZ ibisubizo kwishyura",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Umunota 1",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "list",
              title: "Shaka ubusabe bwawe",
              steps: [
                {
                  text: "Kanda **Ubusabe bwanjye** mu rutonde rw'ibumoso. Buri murongo werekana **Kode**, **Serivisi**, **Aho bigeze**, **Kwishyura** (**Byishyuwe**, **Birategereje** cyangwa **Ntibyishyuwe**) n'itariki **Byoherejwe**.",
                  shot: "client-requests-list",
                  marks: [
                    "Ubusabe bushya",
                    "Yungurura aho bigeze",
                    "Shakisha kode cyangwa serivisi",
                    "Yungurura serivisi",
                    "Ubusabe bwawe",
                  ],
                },
                {
                  text: "Koresha **Byose**, **Bigutegereje**, **Biri gukorwa**, **Byarangiye** na **Byafunzwe** kuyungurura; umubare werekana ingano ya buri gice.",
                },
                {
                  text: "Andika kode (urugero **HBZ-2RT8LM**) cyangwa izina rya serivisi muri **Shakisha ukoresheje kode cyangwa serivisi**, cyangwa uhitemo serivisi muri **Serivisi zose**.",
                },
                {
                  text: "Kanda umutwe w'inkingi kugira ngo utondeke. Niba nta gihuye, kanda **Siba ibyungurujwe**.",
                },
                { text: "Kanda umurongo ufungure ubusabe." },
              ],
            },
            {
              id: "overview",
              title: "Soma paji y'ubusabe",
              steps: [
                {
                  text: "Hejuru: kode, serivisi, aho bigeze, itariki byoherejweho na **Bikurikiranwa na** n'izina ry'umujyanama wawe iyo yamaze kubihabwa. Igice cy'**Incamake** gifunguka mbere.",
                  shot: "client-request-overview",
                  marks: [
                    "Kode, serivisi n'aho bigeze",
                    "Ibice bitanu",
                    "Ibyo dukeneye kuri wowe",
                    "Hagarika cyangwa saba guhagarika",
                  ],
                },
                {
                  text: "**Ibyo dukeneye kuri wowe** yerekana ibyo dutegereje, na buto ya **Ohereza** cyangwa **Ishyura**. **Nta kintu dukeneye kuri wowe.** bisobanura ko ari twe tugomba gukora.",
                },
                {
                  text: "Iburyo, **Aho HEBUZA igeze** ni aho twe tugeze; **Icyemezo cy'urwego** (iyo kigaragara) ni igisubizo cy'urwego rwa Leta, gifite nimero n'itariki. Ibi byombi bitandukanywa nkana.",
                },
                {
                  text: "Kanda **Urugendo** urebe buri ntambwe n'itariki n'isaha yayo. Intambwe iriho igaragazwa; izikurikira ziba zijimye.",
                  shot: "client-request-timeline",
                  marks: ["Buri ntambwe n'itariki"],
                },
                {
                  text: "Kanda **Kwishyura**: ibyishyuwe byerekana **Byishyuwe** n'itariki n'ihuza rya **Inyemezabwishyu**; ibitarishyurwa byerekana itariki ntarengwa na **Ishyura nonaha**.",
                  shot: "client-request-payments",
                  marks: ["Umurongo w'ubwishyu", "Ishyura nonaha"],
                },
                {
                  text: "Kanda **Ibisubizo** ukuremo ibisubizo byawe. Dosiye ifunze yerekana **Bizaboneka nyuma yo kwishyura byose** kugeza usigaje wishyuwe.",
                  shot: "client-request-deliverables",
                  marks: ["Igisubizo cyawe", "Kuramo"],
                },
                {
                  text: "Kanda **Ubutumwa** wandikire umujyanama wawe kuri ubu busabe (reba amabwiriza y'ubutumwa).",
                },
              ],
            },
            {
              id: "status",
              title: "Icyo buri mimerere isobanura",
              tips: [
                "**Ubusabe bwakiriwe** / **Burimo gusuzumwa**: twarabwakiriye turimo kubusuzuma.",
                "**Bitegereje igiciro**: turimo kubara igiciro cy'akazi kihariye; uzahabwa igiciro wemeza muri Inyemezabwishyu.",
                "**Bitegereje kwishyurwa** / **Bitegereje inyandiko zawe**: biragutegereje; icyo gikorwa kiri mu **Ibigutegereje**.",
                "**Byemejwe kandi byahawe umukozi** / **Birimo gukorwa** / **Bitegereje isuzuma ry'imbere**: turimo kubikora.",
                "**Bitegereje urwego rwo hanze**: dosiye iri mu rwego rwa Leta; igihe giterwa na rwo.",
                "**Byarangiye kandi byatanzwe**: ibisubizo biri mu **Ibisubizo** no muri **Inyandiko → Biva kuri HEBUZA**.",
                "**Byahagaritswe by'agateganyo**, **Byasheshwe**, **Byanzwe**, **Gusubizwa amafaranga byasabwe**, **Amafaranga yasubijwe**: ubusabe bwahagaze cyangwa bwafunzwe; fungura **Ubutumwa** ubaze impamvu.",
              ],
              faq: [
                {
                  q: "Sinabona ubusabe bwanjye.",
                  a: "Kanda **Byose** usibe ibyo washakishije. Niba ihuza ryerekana **Ntitwabonye ubu busabe.**, reba kode cyangwa ubufungure uvuye ku rutonde.",
                },
              ],
            },
          ],
        },
      },
    },
    // 4. Upload a requested document
    {
      slug: "upload-requested-document",
      cat: "docs",
      minutes: 2,
      updated: UPDATED,
      start: true,
      pages: ["/dashboard", "/requests"],
      t: {
        en: {
          title: "Send a document we asked for",
          summary:
            "When a request needs a document from you, it shows in Needs you with an Upload button. One click, pick the file, done.",
          keywords:
            "upload missing document requested file send rejected document new copy awaiting your documents",
          facts: {
            who: "Clients with a request waiting on a document",
            time: "1 minute",
            cost: "Free",
            need: ["The file as a PDF or a photo (max 25 MB)"],
          },
          sections: [
            {
              id: "upload",
              title: "Upload it",
              steps: [
                {
                  text: "Open **Overview** in the side menu. The document is listed in **Needs you** with the service and request code.",
                  shot: "client-dash",
                  marks: ["", "Needs you", "Upload", "", "", ""],
                },
                {
                  text: "Click **Upload** on that line. Your file picker opens (on a phone you can take a photo).",
                },
                {
                  text: "Choose the file: a PDF or an image, up to 25 MB. The button shows **Uploading…**.",
                },
                {
                  text: "When it is done the line shows **Uploaded** with a tick and a confirmation appears. The request moves on; you do not need to tell us.",
                },
              ],
            },
            {
              id: "from-request",
              title: "Or from the request itself",
              steps: [
                {
                  text: "Open **My requests**, click the request, and stay on **Overview**. The same item is under **Needed from you** with its **Upload** button.",
                  shot: "client-request-overview",
                  marks: ["", "", "Needed from you", ""],
                },
                {
                  text: "Click **Upload** and pick the file, exactly as on the dashboard.",
                },
              ],
            },
            {
              id: "fix",
              title: "If a document is not accepted",
              intro:
                "If a file was unreadable, expired or the wrong document, your adviser tells you in the request's **Messages** tab and asks for a new copy; the item appears again under **Needs you**. Upload the corrected file the same way.",
              warn: "If you see **Upload failed. Try again.**, check the file is under 25 MB and is a PDF or an image, then try again.",
              faq: [
                {
                  q: "Can I reuse a document I already have in My documents?",
                  a: "Yes: open it in **Documents**, go to its **Share** tab, type the request reference (for example HBZ-WMVX19) and click **Attach**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Envoyer un document demandé",
          summary:
            "Quand une demande attend un document, il apparaît dans À faire avec un bouton Téléverser. Un clic, choisissez le fichier, c'est fait.",
          keywords:
            "téléverser document manquant envoyer fichier refusé nouvelle copie en attente de vos documents",
          facts: {
            who: "Clients dont une demande attend un document",
            time: "1 minute",
            cost: "Gratuit",
            need: ["Le fichier en PDF ou en photo (25 Mo max)"],
          },
          sections: [
            {
              id: "upload",
              title: "Le téléverser",
              steps: [
                {
                  text: "Ouvrez **Vue d'ensemble** dans le menu latéral. Le document figure dans **À faire** avec le service et le code de la demande.",
                  shot: "client-dash",
                  marks: ["", "À faire", "Téléverser", "", "", ""],
                },
                {
                  text: "Cliquez sur **Téléverser** sur cette ligne. Le sélecteur de fichier s'ouvre (sur téléphone, vous pouvez prendre une photo).",
                },
                {
                  text: "Choisissez le fichier : un PDF ou une image, 25 Mo maximum. Le bouton affiche **Téléversement…**.",
                },
                {
                  text: "Une fois fini, la ligne affiche **Téléversé** avec une coche et une confirmation apparaît. La demande avance ; inutile de nous prévenir.",
                },
              ],
            },
            {
              id: "from-request",
              title: "Ou depuis la demande",
              steps: [
                {
                  text: "Ouvrez **Mes demandes**, cliquez sur la demande et restez sur **Aperçu**. Le même élément est sous **Nous avons besoin de vous** avec son bouton **Téléverser**.",
                  shot: "client-request-overview",
                  marks: ["", "", "Nous avons besoin de vous", ""],
                },
                {
                  text: "Cliquez sur **Téléverser** et choisissez le fichier, comme sur le tableau de bord.",
                },
              ],
            },
            {
              id: "fix",
              title: "Si un document n'est pas accepté",
              intro:
                "Si un fichier est illisible, expiré ou n'est pas le bon, votre conseiller vous le dit dans l'onglet **Messages** de la demande et demande une nouvelle copie ; l'élément réapparaît dans **À faire**. Téléversez le fichier corrigé de la même façon.",
              warn: "Si vous voyez **Échec du téléversement. Réessayez.**, vérifiez que le fichier fait moins de 25 Mo et qu'il s'agit d'un PDF ou d'une image, puis recommencez.",
              faq: [
                {
                  q: "Puis-je réutiliser un document déjà dans Mes documents ?",
                  a: "Oui : ouvrez-le dans **Documents**, onglet **Partager**, saisissez la référence de la demande (par ex. HBZ-WMVX19) et cliquez sur **Joindre**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Ohereza inyandiko twagusabye",
          summary:
            "Iyo ubusabe bukeneye inyandiko yawe, igaragara mu Bigutegereje ifite buto ya Ohereza. Kanda rimwe, uhitemo dosiye, birarangiye.",
          keywords:
            "ohereza inyandiko ibura dosiye yanzwe kopi nshya bitegereje inyandiko zawe",
          facts: {
            who: "Abakiriya bafite ubusabe butegereje inyandiko",
            time: "Umunota 1",
            cost: "Ni ubuntu",
            need: ["Dosiye ya PDF cyangwa ifoto (itarenze MB 25)"],
          },
          sections: [
            {
              id: "upload",
              title: "Yohereze",
              steps: [
                {
                  text: "Fungura **Incamake** mu rutonde rw'ibumoso. Inyandiko iri mu **Ibigutegereje** hamwe na serivisi na kode y'ubusabe.",
                  shot: "client-dash",
                  marks: ["", "Ibigutegereje", "Ohereza", "", "", ""],
                },
                {
                  text: "Kanda **Ohereza** kuri uwo murongo. Aho uhitamo dosiye harafunguka (kuri telefoni ushobora gufotora).",
                },
                {
                  text: "Hitamo dosiye: PDF cyangwa ifoto, itarenze MB 25. Buto yerekana **Birimo koherezwa…**.",
                },
                {
                  text: "Birangiye, umurongo werekana **Byoherejwe** n'akamenyetso, n'ubutumwa bwemeza bukagaragara. Ubusabe burakomeza; ntukeneye kutubwira.",
                },
              ],
            },
            {
              id: "from-request",
              title: "Cyangwa uhereye ku busabe ubwabwo",
              steps: [
                {
                  text: "Fungura **Ubusabe bwanjye**, ukande ubusabe, ugume ku **Incamake**. Icyo gikorwa kiri munsi ya **Ibyo dukeneye kuri wowe** gifite buto ya **Ohereza**.",
                  shot: "client-request-overview",
                  marks: ["", "", "Ibyo dukeneye kuri wowe", ""],
                },
                {
                  text: "Kanda **Ohereza** uhitemo dosiye, nk'uko bigenda ahabanza.",
                },
              ],
            },
            {
              id: "fix",
              title: "Iyo inyandiko itemewe",
              intro:
                "Niba dosiye idasomeka, yarataye agaciro cyangwa atari yo, umujyanama wawe abikubwira mu gice cy'**Ubutumwa** cy'ubusabe agusaba indi kopi; icyo gikorwa kigaruka mu **Ibigutegereje**. Ohereza dosiye ikosoye muri ubwo buryo.",
              warn: "Niba ubonye **Kohereza byanze. Ongera ugerageze.**, reba ko dosiye itarenze MB 25 kandi ari PDF cyangwa ifoto, hanyuma wongere ugerageze.",
              faq: [
                {
                  q: "Nshobora gukoresha inyandiko isanzwe iri mu Nyandiko zanjye?",
                  a: "Yego: yifungure muri **Inyandiko**, ujye kuri **Sangiza**, wandike nimero y'ubusabe (urugero HBZ-WMVX19) ukande **Yomeke**.",
                },
              ],
            },
          ],
        },
      },
    },
    // 5. Cancel a request
    {
      slug: "cancel-a-request",
      cat: "requests",
      minutes: 2,
      updated: UPDATED,
      pages: ["/requests"],
      t: {
        en: {
          title: "Cancel a request",
          summary:
            "Before work starts you can cancel a request yourself. Once work has started you can ask to cancel, and a manager decides, possibly with a refund.",
          keywords:
            "cancel stop withdraw request ask to cancel refund change my mind",
          facts: {
            who: "The client who filed the request",
            time: "1 minute",
            cost: "Free before work starts",
          },
          sections: [
            {
              id: "cancel",
              title: "Cancel or ask to cancel",
              steps: [
                {
                  text: "Open **My requests** and click the request. Stay on the **Overview** tab.",
                },
                {
                  text: "On the right, under the status, click **Cancel this request** (work has not started) or **Ask to cancel** (work has started). If neither button is there, the request can no longer be cancelled online.",
                  shot: "client-request-overview",
                  marks: ["", "", "", "Cancel button"],
                },
                {
                  text: "A window opens. It explains what happens: **Work has not started, so this cancels the request now.** or **Work has started. A manager reviews your request and may arrange a refund.**",
                  shot: "client-request-cancel",
                  marks: ["What will happen", "Your reason"],
                },
                {
                  text: "Write a short **Reason** (at least 3 characters). The **Confirm** button becomes active.",
                },
                {
                  text: "Click **Confirm**. You see **Request cancelled** or **Cancellation request sent**. To change your mind before confirming, click **Keep request**.",
                },
              ],
              warn: "A cancelled request cannot be reopened. To get money back for a paid request, see the refunds guide.",
            },
          ],
        },
        fr: {
          title: "Annuler une demande",
          summary:
            "Avant le début du travail, vous annulez vous-même. Une fois le travail commencé, vous demandez l'annulation et un responsable décide, éventuellement avec un remboursement.",
          keywords:
            "annuler arrêter retirer demande demander l'annulation remboursement changer d'avis",
          facts: {
            who: "Le client qui a fait la demande",
            time: "1 minute",
            cost: "Gratuit avant le début du travail",
          },
          sections: [
            {
              id: "cancel",
              title: "Annuler ou demander l'annulation",
              steps: [
                {
                  text: "Ouvrez **Mes demandes** et cliquez sur la demande. Restez sur l'onglet **Aperçu**.",
                },
                {
                  text: "À droite, sous le statut, cliquez sur **Annuler cette demande** (travail pas commencé) ou **Demander l'annulation** (travail commencé). Sans aucun de ces boutons, la demande ne peut plus être annulée en ligne.",
                  shot: "client-request-overview",
                  marks: ["", "", "", "Bouton d'annulation"],
                },
                {
                  text: "Une fenêtre s'ouvre et explique la suite : **Le travail n'a pas commencé : la demande est annulée tout de suite.** ou **Le travail a commencé. Un responsable examine votre demande et peut prévoir un remboursement.**",
                  shot: "client-request-cancel",
                  marks: ["Ce qui va se passer", "Votre motif"],
                },
                {
                  text: "Écrivez un court **Motif** (3 caractères minimum). Le bouton **Confirmer** devient actif.",
                },
                {
                  text: "Cliquez sur **Confirmer**. Vous voyez **Demande annulée** ou **Demande d'annulation envoyée**. Pour renoncer, cliquez sur **Garder la demande**.",
                },
              ],
              warn: "Une demande annulée ne peut pas être rouverte. Pour récupérer l'argent d'une demande payée, voyez le guide des remboursements.",
            },
          ],
        },
        rw: {
          title: "Hagarika ubusabe",
          summary:
            "Mbere y'uko akazi gatangira, wihagarikira ubusabe. Akazi kamaze gutangira, usaba guhagarika maze umuyobozi agafata icyemezo, ashobora no kugusubiza amafaranga.",
          keywords:
            "hagarika ubusabe saba guhagarika gusubizwa amafaranga nisubiyeho",
          facts: {
            who: "Umukiriya watanze ubusabe",
            time: "Umunota 1",
            cost: "Ni ubuntu mbere y'uko akazi gatangira",
          },
          sections: [
            {
              id: "cancel",
              title: "Hagarika cyangwa saba guhagarika",
              steps: [
                {
                  text: "Fungura **Ubusabe bwanjye** ukande ubusabe. Guma ku gice cy'**Incamake**.",
                },
                {
                  text: "Iburyo, munsi y'aho bigeze, kanda **Hagarika ubu busabe** (akazi ntikaratangira) cyangwa **Saba guhagarika** (akazi karatangiye). Niba nta buto n'imwe ihari, ubusabe ntibukibasha guhagarikwa kuri murandasi.",
                  shot: "client-request-overview",
                  marks: ["", "", "", "Buto yo guhagarika"],
                },
                {
                  text: "Idirishya rirafunguka rikasobanura ibikurikira: **Akazi ntikaratangira, ubusabe burahagarikwa ako kanya.** cyangwa **Akazi karatangiye. Umuyobozi asuzuma icyifuzo cyawe kandi ashobora gutegura gusubizwa amafaranga.**",
                  shot: "client-request-cancel",
                  marks: ["Ibizaba", "Impamvu yawe"],
                },
                {
                  text: "Andika **Impamvu** ngufi (nibura inyuguti 3). Buto **Emeza** irakora.",
                },
                {
                  text: "Kanda **Emeza**. Ubona **Ubusabe bwahagaritswe** cyangwa **Icyifuzo cyo guhagarika cyoherejwe**. Niba wisubiyeho mbere yo kwemeza, kanda **Gumana ubusabe**.",
                },
              ],
              warn: "Ubusabe bwahagaritswe ntibushobora kongera gufungurwa. Kugira ngo usubizwe amafaranga y'ubusabe wishyuye, reba amabwiriza yo gusubizwa.",
            },
          ],
        },
      },
    },
    // 6. Messages
    {
      slug: "messages",
      cat: "requests",
      minutes: 3,
      updated: UPDATED,
      pages: ["/messages", "/requests"],
      t: {
        en: {
          title: "Message your adviser",
          summary:
            "Each request has one conversation with your advisers. Messages lists them all; you write, attach files and search inside the request's Messages tab.",
          keywords:
            "chat inbox conversation adviser reply attach file mute unread edit delete message",
          facts: {
            who: "Every client with a request",
            time: "Replies usually within one working day",
            cost: "Free",
          },
          sections: [
            {
              id: "inbox",
              title: "Open a conversation",
              steps: [
                {
                  text: "Click **Messages** in the side menu. Each conversation shows the request, the last message and **n unread** in bold when there are new replies.",
                  shot: "client-messages",
                  marks: ["Your conversations", "Open one"],
                },
                {
                  text: "Click a conversation. It opens on the request page, in the **Messages** tab. If you have no request yet you see **No conversations yet**.",
                },
              ],
            },
            {
              id: "write",
              title: "Write, attach and search",
              steps: [
                {
                  text: "Type in **Write a message…** and press Enter (Shift+Enter for a new line) or click the arrow button to send.",
                  shot: "client-request-messages",
                  marks: [
                    "Search this conversation",
                    "Mute",
                    "Quick replies",
                    "Attach file",
                    "Write a message",
                    "Send",
                  ],
                },
                {
                  text: "For a quick answer, click one of the ready replies such as **Thank you** or **When will it be ready?** (shown while the box is empty).",
                },
                {
                  text: "To send a file, click the upload icon (**Attach file**), pick a PDF or image, then send. Click the × on a file to remove it before sending.",
                },
                {
                  text: "Each of your messages shows **Sent**, **Delivered** or **Read**. Offline, it waits as **Waiting to send** and goes when you reconnect; if one shows **Not sent.**, tap to retry or **Delete** it.",
                },
                {
                  text: "Use **Search this conversation** to find an older message; click **Mute** to stop notifications for this request (**Unmute** turns them back on).",
                },
                {
                  text: "You can **Edit** your own message for 15 minutes after sending (others see **edited** and **Earlier versions**), **Delete** it, or react with an emoji.",
                },
              ],
              warn: "Messages are kept with your request. Never share passwords, PINs or one-time codes.",
            },
          ],
        },
        fr: {
          title: "Écrire à votre conseiller",
          summary:
            "Chaque demande a une conversation avec vos conseillers. Messages les liste toutes ; vous écrivez, joignez des fichiers et cherchez dans l'onglet Messages de la demande.",
          keywords:
            "chat boîte de réception conversation conseiller répondre joindre fichier couper non lus modifier supprimer",
          facts: {
            who: "Tout client ayant une demande",
            time: "Réponse en général sous un jour ouvré",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "inbox",
              title: "Ouvrir une conversation",
              steps: [
                {
                  text: "Cliquez sur **Messages** dans le menu latéral. Chaque conversation montre la demande, le dernier message et **n non lus** en gras s'il y a de nouvelles réponses.",
                  shot: "client-messages",
                  marks: ["Vos conversations", "En ouvrir une"],
                },
                {
                  text: "Cliquez sur une conversation. Elle s'ouvre sur la page de la demande, onglet **Messages**. Sans demande, vous voyez **Aucune conversation**.",
                },
              ],
            },
            {
              id: "write",
              title: "Écrire, joindre, chercher",
              steps: [
                {
                  text: "Tapez dans **Écrire un message…** puis Entrée (Maj+Entrée pour aller à la ligne) ou cliquez sur la flèche pour envoyer.",
                  shot: "client-request-messages",
                  marks: [
                    "Rechercher dans la conversation",
                    "Couper",
                    "Réponses rapides",
                    "Joindre un fichier",
                    "Écrire un message",
                    "Envoyer",
                  ],
                },
                {
                  text: "Pour répondre vite, cliquez sur une réponse prête comme **Merci** ou **Quand sera-ce prêt ?** (visibles quand la zone est vide).",
                },
                {
                  text: "Pour envoyer un fichier, cliquez sur l'icône d'envoi (**Joindre un fichier**), choisissez un PDF ou une image, puis envoyez. Le × retire un fichier avant l'envoi.",
                },
                {
                  text: "Chaque message indique **Envoyé**, **Distribué** ou **Lu**. Hors ligne, il reste **En attente d'envoi** et part à la reconnexion ; s'il affiche **Non envoyé.**, touchez **Réessayer** ou **Supprimer**.",
                },
                {
                  text: "**Rechercher dans la conversation** retrouve un ancien message ; **Couper** arrête les notifications de cette demande (**Réactiver** les remet).",
                },
                {
                  text: "Vous pouvez **Modifier** votre message pendant 15 minutes (les autres voient **modifié** et **Versions précédentes**), le **Supprimer** ou réagir avec un emoji.",
                },
              ],
              warn: "Les messages sont conservés avec votre demande. Ne partagez jamais mots de passe, codes PIN ou codes à usage unique.",
            },
          ],
        },
        rw: {
          title: "Andikira umujyanama wawe",
          summary:
            "Buri busabe bufite ikiganiro kimwe n'abajyanama bawe. Ubutumwa bubyerekana byose; wandika, wohereza dosiye kandi ugashakisha mu gice cy'Ubutumwa cy'ubusabe.",
          keywords:
            "ikiganiro ubutumwa umujyanama gusubiza dosiye ceceka bitasomwe hindura siba",
          facts: {
            who: "Buri mukiriya ufite ubusabe",
            time: "Bisubizwa akenshi mu munsi umwe w'akazi",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "inbox",
              title: "Fungura ikiganiro",
              steps: [
                {
                  text: "Kanda **Ubutumwa** mu rutonde rw'ibumoso. Buri kiganiro cyerekana ubusabe, ubutumwa buheruka na **n bitasomwe** mu nyuguti zibyibushye iyo hari ibisubizo bishya.",
                  shot: "client-messages",
                  marks: ["Ibiganiro byawe", "Fungura kimwe"],
                },
                {
                  text: "Kanda ikiganiro. Gifunguka kuri paji y'ubusabe, mu gice cy'**Ubutumwa**. Niba nta busabe ufite, ubona **Nta biganiro**.",
                },
              ],
            },
            {
              id: "write",
              title: "Andika, ohereza dosiye, shakisha",
              steps: [
                {
                  text: "Andika muri **Andika ubutumwa…** ukande Enter (Shift+Enter ku murongo mushya) cyangwa ukande akambi ko kohereza.",
                  shot: "client-request-messages",
                  marks: [
                    "Shakisha muri iki kiganiro",
                    "Ceceka",
                    "Ibisubizo byihuse",
                    "Ongeraho dosiye",
                    "Andika ubutumwa",
                    "Ohereza",
                  ],
                },
                {
                  text: "Ku gisubizo cyihuse, kanda kimwe mu byateguwe nka **Murakoze** cyangwa **Bizarangira ryari?** (bigaragara iyo agasanduku karimo ubusa).",
                },
                {
                  text: "Kohereza dosiye, kanda akamenyetso ko kohereza (**Ongeraho dosiye**), uhitemo PDF cyangwa ifoto, hanyuma wohereze. Akamenyetso × gakuraho dosiye mbere yo kohereza.",
                },
                {
                  text: "Buri butumwa bwawe bwerekana **Byoherejwe**, **Byageze** cyangwa **Byasomwe**. Nta murandasi, buguma **Bitegereje koherezwa** bukagenda nugaruka; niba bwerekana **Ntibyoherejwe.**, kanda **Ongera ugerageze** cyangwa **Siba**.",
                },
                {
                  text: "**Shakisha muri iki kiganiro** igufasha kubona ubutumwa bwa kera; **Ceceka** ihagarika imenyesha ry'ubu busabe (**Ongera wumve** irarigarura).",
                },
                {
                  text: "Ushobora **Guhindura** ubutumwa bwawe mu minota 15 nyuma yo kubwohereza (abandi babona **byahinduwe** na **Uko byari bimeze mbere**), **Gusiba** cyangwa gusubiza na emoji.",
                },
              ],
              warn: "Ubutumwa bubikwa hamwe n'ubusabe bwawe. Ntugasangize ijambobanga, PIN cyangwa kode imwe ikoreshwa rimwe.",
            },
          ],
        },
      },
    },
    // 7. Document library
    {
      slug: "document-library",
      cat: "docs",
      minutes: 4,
      updated: UPDATED,
      pages: ["/documents"],
      t: {
        en: {
          title: "Keep your documents in My documents",
          summary:
            "Upload your ID, company papers and certificates once and reuse them in every request. Set expiry dates and we remind you before they run out.",
          keywords:
            "library vault my documents upload ID passport certificate expiry expiring versions attach share delete category",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes per document",
            cost: "Free",
            need: ["PDF, JPG, PNG, HEIC, DOCX or XLSX, max 10 MB"],
          },
          sections: [
            {
              id: "find",
              title: "Find a document",
              steps: [
                {
                  text: "Click **Documents** in the side menu. The **Library** tab opens with your files.",
                  shot: "client-docs-library",
                  marks: [
                    "Categories",
                    "Expiring soon",
                    "Grid or list",
                    "Search documents",
                    "Upload",
                    "A document",
                  ],
                },
                {
                  text: "Pick a category on the left (**All**, **Identity**, **Company**, **Tax**, **Certificates**, **Other**); the number shows how many files each has.",
                },
                {
                  text: "If any document expires within 30 days, a yellow **Expiring soon** button appears: click it to see only those. Cards show **Expires in n days** or **Expired**.",
                },
                {
                  text: "Switch between **Grid** and **List**, or type in **Search documents…** to filter by name.",
                },
              ],
            },
            {
              id: "upload",
              title: "Upload a new document",
              steps: [
                {
                  text: "Click **Upload**. The **Upload to your library** window opens.",
                  shot: "client-docs-upload",
                  marks: ["Name (optional)", "Category", "Allowed files"],
                },
                {
                  text: "Optionally type a **Name** and choose a **Category**, then drop the file in the box or pick it (on a phone you can take a photo). Allowed: PDF, JPG, PNG, DOCX, XLSX, max 10 MB.",
                },
                {
                  text: "If a similar file already exists you see **Possible duplicate**: click **Keep new file** to upload anyway, or **Cancel**.",
                },
                {
                  text: "When you see **Upload complete!**, click **View document** to open it, or **Upload another file**.",
                },
              ],
            },
            {
              id: "manage",
              title: "Versions, expiry, attach and delete",
              steps: [
                {
                  text: "Click a document card. A panel opens with three tabs: **Versions**, **Where used** and **Share**.",
                  shot: "client-docs-drawer",
                  marks: [
                    "Versions, Where used, Share",
                    "Expiry date",
                    "Delete document",
                  ],
                },
                {
                  text: "In **Versions**, use **Preview** or **Download** on any version; **Make current** restores an older one. The newest is marked **Latest version**.",
                },
                {
                  text: "**Where used** lists the requests that used the file. **Share** attaches it to a request: type the reference (for example HBZ-WMVX19) in **Request reference** and click **Attach**.",
                },
                {
                  text: "Set an **Expiry date** and click **Save date**: we remind you before it expires.",
                },
                {
                  text: "To remove it, click **Delete document**, then **Delete** in the confirmation. Requests that already used it keep their copy.",
                },
              ],
              warn: "A document attached to an open request cannot be deleted (**Delete document** is greyed). Upload a new version instead.",
            },
          ],
        },
        fr: {
          title: "Garder vos documents dans Mes documents",
          summary:
            "Envoyez une fois votre pièce d'identité, vos papiers d'entreprise et vos certificats, puis réutilisez-les dans chaque demande. Indiquez une date d'expiration et nous vous prévenons.",
          keywords:
            "bibliothèque coffre mes documents envoyer pièce d'identité passeport certificat expiration versions joindre partager supprimer catégorie",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes par document",
            cost: "Gratuit",
            need: ["PDF, JPG, PNG, HEIC, DOCX ou XLSX, 10 Mo max"],
          },
          sections: [
            {
              id: "find",
              title: "Trouver un document",
              steps: [
                {
                  text: "Cliquez sur **Documents** dans le menu latéral. L'onglet **Bibliothèque** s'ouvre avec vos fichiers.",
                  shot: "client-docs-library",
                  marks: [
                    "Catégories",
                    "Expirent bientôt",
                    "Grille ou liste",
                    "Rechercher un document",
                    "Envoyer",
                    "Un document",
                  ],
                },
                {
                  text: "Choisissez une catégorie à gauche (**Tous**, **Identité**, **Entreprise**, **Fiscalité**, **Certificats**, **Autres**) ; le chiffre indique combien de fichiers elle contient.",
                },
                {
                  text: "Si un document expire dans les 30 jours, un bouton jaune **Expirent bientôt** apparaît : cliquez pour ne voir que ceux-là. Les cartes indiquent **Expire dans n jours** ou **Expiré**.",
                },
                {
                  text: "Passez de **Grille** à **Liste**, ou tapez dans **Rechercher un document…** pour filtrer par nom.",
                },
              ],
            },
            {
              id: "upload",
              title: "Envoyer un nouveau document",
              steps: [
                {
                  text: "Cliquez sur **Envoyer**. La fenêtre **Ajouter à votre bibliothèque** s'ouvre.",
                  shot: "client-docs-upload",
                  marks: ["Nom (facultatif)", "Catégorie", "Fichiers acceptés"],
                },
                {
                  text: "Saisissez si vous voulez un **Nom** et une **Catégorie**, puis déposez le fichier dans la zone ou choisissez-le (sur téléphone, prenez une photo). Acceptés : PDF, JPG, PNG, DOCX, XLSX, 10 Mo max.",
                },
                {
                  text: "Si un fichier semblable existe, vous voyez **Doublon possible** : cliquez sur **Garder le nouveau** pour l'envoyer quand même, ou **Annuler**.",
                },
                {
                  text: "Quand **Envoi terminé !** s'affiche, cliquez sur **Voir le document** pour l'ouvrir, ou **Envoyer un autre fichier**.",
                },
              ],
            },
            {
              id: "manage",
              title: "Versions, expiration, joindre, supprimer",
              steps: [
                {
                  text: "Cliquez sur la carte d'un document. Un panneau s'ouvre avec trois onglets : **Versions**, **Utilisé dans** et **Partager**.",
                  shot: "client-docs-drawer",
                  marks: [
                    "Versions, Utilisé dans, Partager",
                    "Date d'expiration",
                    "Supprimer le document",
                  ],
                },
                {
                  text: "Dans **Versions**, utilisez **Aperçu** ou **Télécharger** sur chaque version ; **Rendre actuelle** restaure une ancienne. La plus récente porte **Dernière version**.",
                },
                {
                  text: "**Utilisé dans** liste les demandes qui ont utilisé le fichier. **Partager** le joint à une demande : saisissez la référence (par ex. HBZ-WMVX19) dans **Référence de la demande** et cliquez sur **Joindre**.",
                },
                {
                  text: "Indiquez une **Date d'expiration** et cliquez sur **Enregistrer la date** : nous vous prévenons avant l'échéance.",
                },
                {
                  text: "Pour le retirer, cliquez sur **Supprimer le document**, puis sur **Supprimer**. Les demandes qui l'ont utilisé gardent leur copie.",
                },
              ],
              warn: "Un document joint à une demande en cours ne peut pas être supprimé (**Supprimer le document** est grisé). Envoyez plutôt une nouvelle version.",
            },
          ],
        },
        rw: {
          title: "Bika inyandiko zawe mu Nyandiko zanjye",
          summary:
            "Ohereza rimwe indangamuntu, impapuro z'ikigo n'ibyemezo, uzikoreshe muri buri busabe. Shyiraho itariki zirangiriraho tukwibutse mbere y'uko zirangira.",
          keywords:
            "ububiko inyandiko zanjye ohereza indangamuntu pasiporo icyemezo irangira verisiyo yomeka sangiza siba icyiciro",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2 kuri buri nyandiko",
            cost: "Ni ubuntu",
            need: ["PDF, JPG, PNG, HEIC, DOCX cyangwa XLSX, itarenze MB 10"],
          },
          sections: [
            {
              id: "find",
              title: "Shaka inyandiko",
              steps: [
                {
                  text: "Kanda **Inyandiko** mu rutonde rw'ibumoso. Igice cy'**Ububiko** kirafunguka kirimo dosiye zawe.",
                  shot: "client-docs-library",
                  marks: [
                    "Ibyiciro",
                    "Zigiye kurangira",
                    "Imbonerahamwe cyangwa urutonde",
                    "Shakisha inyandiko",
                    "Ohereza",
                    "Inyandiko",
                  ],
                },
                {
                  text: "Hitamo icyiciro ibumoso (**Byose**, **Indangamuntu**, **Ikigo**, **Imisoro**, **Ibyemezo**, **Ibindi**); umubare werekana dosiye ziri muri buri cyiciro.",
                },
                {
                  text: "Niba hari inyandiko irangira mu minsi 30, buto y'umuhondo **Zigiye kurangira** iragaragara: yikande urebe izo gusa. Amakarita yerekana **Irangira mu minsi n** cyangwa **Yararangiye**.",
                },
                {
                  text: "Hindura hagati ya **Imbonerahamwe** na **Urutonde**, cyangwa wandike muri **Shakisha inyandiko…** kuyungurura ukoresheje izina.",
                },
              ],
            },
            {
              id: "upload",
              title: "Ohereza inyandiko nshya",
              steps: [
                {
                  text: "Kanda **Ohereza**. Idirishya **Ohereza mu bubiko** rirafunguka.",
                  shot: "client-docs-upload",
                  marks: ["Izina (si ngombwa)", "Icyiciro", "Dosiye zemewe"],
                },
                {
                  text: "Niba ubishaka andika **Izina** uhitemo **Icyiciro**, hanyuma ushyire dosiye mu gasanduku cyangwa uyihitemo (kuri telefoni ushobora gufotora). Zemewe: PDF, JPG, PNG, DOCX, XLSX, itarenze MB 10.",
                },
                {
                  text: "Niba hari dosiye isa nayo, ubona **Ishobora kuba isanzwe ihari**: kanda **Gumana inshya** kugira ngo uyohereze uko byagenda kose, cyangwa **Hagarika**.",
                },
                {
                  text: "Ubonye **Byoherejwe!**, kanda **Reba inyandiko** uyifungure, cyangwa **Ohereza indi**.",
                },
              ],
            },
            {
              id: "manage",
              title: "Verisiyo, itariki irangiriraho, kwomeka no gusiba",
              steps: [
                {
                  text: "Kanda ikarita y'inyandiko. Igice gifunguka gifite ibice bitatu: **Verisiyo**, **Aho yakoreshejwe** na **Sangiza**.",
                  shot: "client-docs-drawer",
                  marks: [
                    "Verisiyo, Aho yakoreshejwe, Sangiza",
                    "Itariki irangiriraho",
                    "Siba inyandiko",
                  ],
                },
                {
                  text: "Muri **Verisiyo**, koresha **Reba** cyangwa **Kuramo** kuri buri verisiyo; **Yigire iya none** igarura iya kera. Inshya iranga **Iheruka**.",
                },
                {
                  text: "**Aho yakoreshejwe** yerekana ubusabe bwakoresheje iyo dosiye. **Sangiza** iyomeka ku busabe: andika nimero (urugero HBZ-WMVX19) muri **Nimero y'isabwa** ukande **Yomeke**.",
                },
                {
                  text: "Shyiraho **Itariki irangiriraho** ukande **Bika itariki**: tuzakwibutsa mbere y'uko irangira.",
                },
                {
                  text: "Kuyikuraho, kanda **Siba inyandiko**, hanyuma **Siba** mu kwemeza. Ubusabe bwayikoresheje buguma bufite kopi yabwo.",
                },
              ],
              warn: "Inyandiko yometse ku busabe bugikorwa ntishobora gusibwa (**Siba inyandiko** iba yijimye). Ohereza verisiyo nshya aho kuyisiba.",
            },
          ],
        },
      },
    },
    // 8. Results from HEBUZA
    {
      slug: "results-from-hebuza",
      cat: "docs",
      minutes: 3,
      updated: UPDATED,
      pages: ["/documents", "/requests"],
      t: {
        en: {
          title: "Download, sign and accept your results",
          summary:
            "Finished documents land in Documents, tab From HEBUZA. Preview, download, sign if asked, save them to your library and tell us if all is good.",
          keywords:
            "results deliverables certificate download zip sign signature accept request changes rate locked pay balance from HEBUZA",
          facts: {
            who: "Clients with a completed request",
            time: "2 minutes",
            cost: "Free once fully paid",
          },
          sections: [
            {
              id: "open",
              title: "Get your files",
              steps: [
                {
                  text: "Click **Documents** in the side menu, then the **From HEBUZA** tab. You can also click a line under **New results** on the Overview page.",
                },
                {
                  text: "Each request has its own card. **Your documents are ready** means you can download. While we work you see **In progress** with **Working · step n of n** and the expected date.",
                  shot: "client-docs-hebuza",
                  marks: [
                    "Preview, Download, Save, Sign",
                    "Got everything?",
                    "Pay the balance",
                  ],
                },
                {
                  text: "On each file, click **Preview** to look at it or **Download** to save it. With more than one file, **Download all (.zip)** gets them in one go.",
                },
                {
                  text: "Click **Save to my documents** to copy a result into your Library for later requests.",
                },
                {
                  text: "If a file needs your signature, click **Sign**, choose **Type my name** or **Draw**, tick **I have read this document and sign it electronically.** and click **Sign document**.",
                },
              ],
            },
            {
              id: "locked",
              title: "If the files are locked",
              intro:
                "A card that says **Pay the balance of … to download** is **Locked until paid**. You can still **Preview** with a PREVIEW watermark. Click **Pay now** on the card; downloads unlock once the payment is confirmed.",
            },
            {
              id: "review",
              title: "Accept or ask for changes",
              steps: [
                {
                  text: "Under the files, answer **Got everything you needed?**: click **Yes, all good**, or **Request changes**.",
                },
                {
                  text: "For changes, pick what is wrong (**A document is missing**, **A document has an error**, **Something else**), write in **Tell us more** and click **Send**. Your service manager replies within one working day.",
                },
                {
                  text: "Then rate us under **How did we do?**: pick the stars, tick what stood out, add a comment and click **Send rating**.",
                },
              ],
              tips: [
                "The same files are also in the request's **Deliverables** tab.",
              ],
            },
          ],
        },
        fr: {
          title: "Télécharger, signer et accepter vos résultats",
          summary:
            "Les documents finalisés arrivent dans Documents, onglet De HEBUZA. Aperçu, téléchargement, signature si demandée, enregistrement dans votre bibliothèque et validation.",
          keywords:
            "résultats livrables certificat télécharger zip signer signature accepter demander des modifications noter verrouillé solde De HEBUZA",
          facts: {
            who: "Clients ayant une demande terminée",
            time: "2 minutes",
            cost: "Gratuit une fois tout payé",
          },
          sections: [
            {
              id: "open",
              title: "Récupérer vos fichiers",
              steps: [
                {
                  text: "Cliquez sur **Documents** dans le menu latéral, puis sur l'onglet **De HEBUZA**. Vous pouvez aussi cliquer sur une ligne de **Nouveaux résultats** dans la Vue d'ensemble.",
                },
                {
                  text: "Chaque demande a sa carte. **Vos documents sont prêts** veut dire que vous pouvez télécharger. Pendant le travail, vous voyez **En cours** avec **En cours · étape n sur n** et la date prévue.",
                  shot: "client-docs-hebuza",
                  marks: [
                    "Aperçu, Télécharger, Enregistrer, Signer",
                    "Vous avez tout ?",
                    "Payer le solde",
                  ],
                },
                {
                  text: "Sur chaque fichier, cliquez sur **Aperçu** pour le voir ou **Télécharger** pour l'enregistrer. S'il y a plusieurs fichiers, **Tout télécharger (.zip)** les récupère d'un coup.",
                },
                {
                  text: "Cliquez sur **Enregistrer dans mes documents** pour copier un résultat dans votre Bibliothèque.",
                },
                {
                  text: "Si un fichier doit être signé, cliquez sur **Signer**, choisissez **Taper mon nom** ou **Dessiner**, cochez **J'ai lu ce document et je le signe électroniquement.** puis cliquez sur **Signer le document**.",
                },
              ],
            },
            {
              id: "locked",
              title: "Si les fichiers sont verrouillés",
              intro:
                "Une carte qui affiche **Payez le solde de … pour télécharger** est **Verrouillé jusqu'au paiement**. Vous pouvez encore utiliser **Aperçu** avec un filigrane. Cliquez sur **Payer** sur la carte ; les téléchargements s'ouvrent une fois le paiement confirmé.",
            },
            {
              id: "review",
              title: "Accepter ou demander des modifications",
              steps: [
                {
                  text: "Sous les fichiers, répondez à **Vous avez tout ce qu'il vous faut ?** : cliquez sur **Oui, tout est bon** ou **Demander des modifications**.",
                },
                {
                  text: "Pour une modification, choisissez le problème (**Un document manque**, **Un document contient une erreur**, **Autre chose**), écrivez dans **Dites-nous en plus** et cliquez sur **Envoyer**. Votre responsable de service répond sous un jour ouvré.",
                },
                {
                  text: "Notez-nous ensuite sous **Comment s'est passé le service ?** : choisissez les étoiles, cochez ce qui vous a plu, ajoutez un commentaire et cliquez sur **Envoyer la note**.",
                },
              ],
              tips: [
                "Les mêmes fichiers sont aussi dans l'onglet **Livrables** de la demande.",
              ],
            },
          ],
        },
        rw: {
          title: "Kuramo, sinya kandi wemeze ibisubizo byawe",
          summary:
            "Inyandiko zarangiye zigera mu Nyandiko, igice Biva kuri HEBUZA. Zirebe, uzikuremo, usinye niba bisabwa, uzibike mu bubiko kandi utubwire niba byose ari byiza.",
          keywords:
            "ibisubizo icyemezo kuramo zip sinya umukono emeza saba impinduka amanota bifunze kwishyura usigaje biva kuri HEBUZA",
          facts: {
            who: "Abakiriya bafite ubusabe bwarangiye",
            time: "Iminota 2",
            cost: "Ni ubuntu umaze kwishyura byose",
          },
          sections: [
            {
              id: "open",
              title: "Bona dosiye zawe",
              steps: [
                {
                  text: "Kanda **Inyandiko** mu rutonde rw'ibumoso, hanyuma igice **Biva kuri HEBUZA**. Ushobora no gukanda umurongo uri munsi ya **Ibisubizo bishya** ku Incamake.",
                },
                {
                  text: "Buri busabe bufite ikarita yabwo. **Inyandiko zawe ziteguye** bisobanura ko ushobora kuzikuramo. Mu gihe tugikora ubona **Biracyakorwa** na **Turakora · intambwe n kuri n** n'itariki biteganyijwe.",
                  shot: "client-docs-hebuza",
                  marks: [
                    "Reba, Kuramo, Bika, Sinya",
                    "Wabonye byose?",
                    "Ishyura usigaje",
                  ],
                },
                {
                  text: "Kuri buri dosiye, kanda **Reba** uyirebe cyangwa **Kuramo** uyibike. Niba ari nyinshi, **Kuramo byose (.zip)** izizana icyarimwe.",
                },
                {
                  text: "Kanda **Bika mu nyandiko zanjye** ushyire igisubizo mu Bubiko bwawe kugira ngo uzagikoreshe.",
                },
                {
                  text: "Niba dosiye isaba umukono wawe, kanda **Sinya**, uhitemo **Andika izina ryanjye** cyangwa **Shushanya**, ukande ku **Nasomye iyi nyandiko kandi nyisinye mu buryo bw'ikoranabuhanga.** hanyuma **Sinya inyandiko**.",
                },
              ],
            },
            {
              id: "locked",
              title: "Iyo dosiye zifunze",
              intro:
                "Ikarita yanditseho **Ishyura … usigaje kugira ngo ukuremo** iba **Bifunze kugeza wishyuye**. Uracyashobora kuzireba ufite ikimenyetso cya IGERAGEZA. Kanda **Ishyura ubu** ku ikarita; gukuramo birafunguka ubwishyu bumaze kwemezwa.",
            },
            {
              id: "review",
              title: "Emeza cyangwa usabe impinduka",
              steps: [
                {
                  text: "Munsi ya dosiye, subiza **Wabonye ibyo wari ukeneye byose?**: kanda **Yego, ni byiza**, cyangwa **Saba impinduka**.",
                },
                {
                  text: "Ku mpinduka, hitamo ikibazo (**Hari inyandiko ibura**, **Hari inyandiko ifite ikosa**, **Ikindi**), wandike muri **Tubwire byinshi** ukande **Ohereza**. Ushinzwe serivisi agusubiza mu munsi umwe w'akazi.",
                },
                {
                  text: "Hanyuma uduhe amanota munsi ya **Twakoze dute?**: hitamo inyenyeri, ukande ibyakunyuze, wongereho igitekerezo ukande **Ohereza amanota**.",
                },
              ],
              tips: [
                "Dosiye zimwe ziri no mu gice cy'**Ibisubizo** cy'ubusabe.",
              ],
            },
          ],
        },
      },
    },
    // 9. Billing
    {
      slug: "billing-and-paying",
      cat: "money",
      minutes: 5,
      updated: UPDATED,
      pages: ["/billing"],
      t: {
        en: {
          title: "Pay what you owe, find invoices and receipts",
          summary:
            "Billing shows what you owe, what you paid this year and your credit. Tabs hold your invoices, quotations, receipts, statements, plan and saved payment methods.",
          keywords:
            "billing invoice receipt pay now owe balance quotation quote accept decline statement CSV plan subscription payment method MoMo card credit",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes",
            cost: "Only what you owe",
            need: ["Mobile Money or a card"],
          },
          sections: [
            {
              id: "pay",
              title: "Pay what you owe",
              steps: [
                {
                  text: "Click **Billing** in the side menu. The tiles show **To pay**, **Paid this year**, **Credit balance** and your **Plan**.",
                  shot: "client-billing",
                  marks: [
                    "Your totals",
                    "Pay the oldest",
                    "Tabs",
                    "Open the invoice",
                    "Pay this one",
                    "Need help?",
                  ],
                },
                {
                  text: "Click **Pay now** on the **To pay** tile to pay the oldest amount, or go to the **To pay** tab: each line shows the invoice number, service, due date and amount, with a **Pay** button.",
                },
                {
                  text: "Click **Pay**. The payment page opens: choose Mobile Money or card and approve. A receipt arrives by SMS and in the **Receipts** tab.",
                },
                {
                  text: "Lines marked **Overdue** are past their due date; pay them first to avoid delays on your request. **Nothing to pay. You're all clear.** means you owe nothing.",
                },
              ],
              tips: [
                "**Credit balance**: overpayments become credit you can use on later payments.",
              ],
            },
            {
              id: "invoices",
              title: "Find an invoice",
              steps: [
                {
                  text: "Click the **Invoices** tab. Type in **Search invoices…** to find one by number or service; **Export CSV** downloads the list.",
                  shot: "client-billing-invoices",
                  marks: ["Search invoices", "Invoice number"],
                },
                {
                  text: "Click an invoice number. The **Invoice details** panel shows the service, issue date, due date and amount. Click **Download PDF**, or **Pay now** if it is unpaid.",
                  shot: "client-billing-invoice",
                  marks: ["Invoice details", "Download PDF"],
                },
              ],
            },
            {
              id: "quotes",
              title: "Accept or decline a quotation",
              steps: [
                {
                  text: "Click the **Quotations** tab. Each quotation shows the amount, a note and **Valid until** a date.",
                  shot: "client-billing-quotes",
                  marks: ["Your quotations"],
                },
                {
                  text: "Click **Accept**: you see **Quotation accepted. An invoice will follow.** The invoice then appears under **To pay**.",
                },
                {
                  text: "Or click **Decline**, write **Why are you declining?** so we can adjust, and confirm.",
                },
              ],
            },
            {
              id: "receipts",
              title: "Receipts and statements",
              steps: [
                {
                  text: "Click the **Receipts** tab and **Download** the receipt PDF next to any payment.",
                  shot: "client-billing-receipts",
                  marks: ["Your receipts", "Download"],
                },
                {
                  text: "Click the **Statements** tab, choose a **Period** (**This month**, **Last month**, **Last 3 months**, **This year**) and click **Download CSV** for every invoice and payment in that period.",
                  shot: "client-billing-statements",
                  marks: ["Period", "Download CSV"],
                },
              ],
            },
            {
              id: "plan",
              title: "Plan and payment methods",
              steps: [
                {
                  text: "Click the **Plan** tab. Without a plan you pay per request; click **See plans** to compare. With a plan you see **Active** and **Renews** with the date.",
                  shot: "client-billing-plan",
                  marks: ["Your plan"],
                },
                {
                  text: "To switch, click **Change plan**, pick the **New plan** and click **Continue**. An upgrade asks for your **MTN MoMo number**: click **Pay with MoMo** and approve on your phone.",
                },
                {
                  text: "To stop, click **Cancel plan**, choose **At period end** or **Now**, say why, and click **Confirm cancellation**. **Keep my plan** undoes a scheduled cancellation.",
                },
                {
                  text: "The **Payment methods** tab lists saved methods (the **Default** one first). Click **Remove** and confirm to delete one.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Payer ce que vous devez, retrouver factures et reçus",
          summary:
            "Facturation montre ce que vous devez, ce que vous avez payé cette année et votre crédit. Les onglets contiennent factures, devis, reçus, relevés, forfait et moyens de paiement.",
          keywords:
            "facturation facture reçu payer solde devis accepter refuser relevé CSV forfait abonnement moyen de paiement MoMo carte crédit",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes",
            cost: "Seulement ce que vous devez",
            need: ["Mobile Money ou une carte"],
          },
          sections: [
            {
              id: "pay",
              title: "Payer ce que vous devez",
              steps: [
                {
                  text: "Cliquez sur **Facturation** dans le menu latéral. Les cases montrent **À payer**, **Payé cette année**, **Solde créditeur** et votre **Forfait**.",
                  shot: "client-billing",
                  marks: [
                    "Vos totaux",
                    "Payer le plus ancien",
                    "Onglets",
                    "Ouvrir la facture",
                    "Payer celle-ci",
                    "Besoin d'aide ?",
                  ],
                },
                {
                  text: "Cliquez sur **Payer** dans la case **À payer** pour régler le plus ancien montant, ou ouvrez l'onglet **À payer** : chaque ligne indique le numéro, le service, l'échéance et le montant, avec un bouton **Payer**.",
                },
                {
                  text: "Cliquez sur **Payer**. La page de paiement s'ouvre : choisissez Mobile Money ou carte et validez. Un reçu arrive par SMS et dans l'onglet **Reçus**.",
                },
                {
                  text: "Les lignes **En retard** ont dépassé l'échéance ; payez-les d'abord pour ne pas retarder votre demande. Si rien n'est dû, l'onglet le dit.",
                },
              ],
              tips: [
                "**Solde créditeur** : les trop-perçus deviennent un crédit utilisable sur vos prochains paiements.",
              ],
            },
            {
              id: "invoices",
              title: "Retrouver une facture",
              steps: [
                {
                  text: "Cliquez sur l'onglet **Factures**. Tapez dans **Rechercher une facture…** pour la trouver par numéro ou service ; **Exporter CSV** télécharge la liste.",
                  shot: "client-billing-invoices",
                  marks: ["Rechercher une facture", "Numéro de facture"],
                },
                {
                  text: "Cliquez sur un numéro. Le panneau **Détails de la facture** montre le service, les dates et le montant. Cliquez sur **Télécharger le PDF**, ou **Payer** si elle est impayée.",
                  shot: "client-billing-invoice",
                  marks: ["Détails de la facture", "Télécharger le PDF"],
                },
              ],
            },
            {
              id: "quotes",
              title: "Accepter ou refuser un devis",
              steps: [
                {
                  text: "Cliquez sur l'onglet **Devis**. Chaque devis montre le montant, une note et sa date de validité.",
                  shot: "client-billing-quotes",
                  marks: ["Vos devis"],
                },
                {
                  text: "Cliquez sur **Accepter** : vous voyez **Devis accepté. Une facture suivra.** La facture apparaît ensuite dans **À payer**.",
                },
                {
                  text: "Ou cliquez sur **Refuser**, répondez à **Pourquoi refusez-vous ?** pour que nous puissions ajuster, et confirmez.",
                },
              ],
            },
            {
              id: "receipts",
              title: "Reçus et relevés",
              steps: [
                {
                  text: "Cliquez sur l'onglet **Reçus** et sur **Télécharger** à côté d'un paiement pour obtenir le reçu PDF.",
                  shot: "client-billing-receipts",
                  marks: ["Vos reçus", "Télécharger"],
                },
                {
                  text: "Cliquez sur l'onglet **Relevés**, choisissez une **Période** (**Ce mois-ci**, **Le mois dernier**, **Les 3 derniers mois**, **Cette année**) et cliquez sur **Télécharger le CSV**.",
                  shot: "client-billing-statements",
                  marks: ["Période", "Télécharger le CSV"],
                },
              ],
            },
            {
              id: "plan",
              title: "Forfait et moyens de paiement",
              steps: [
                {
                  text: "Cliquez sur l'onglet **Forfait**. Sans forfait, vous payez par demande ; cliquez sur **Voir les forfaits** pour comparer. Avec un forfait, vous voyez s'il est actif et sa date de renouvellement.",
                  shot: "client-billing-plan",
                  marks: ["Votre forfait"],
                },
                {
                  text: "Pour changer, cliquez sur **Changer de forfait**, choisissez le nouveau et cliquez sur **Continuer**. Une montée de gamme demande votre numéro MTN MoMo : cliquez sur **Payer avec MoMo** et validez sur votre téléphone.",
                },
                {
                  text: "Pour arrêter, cliquez sur **Résilier le forfait**, choisissez la date d'effet, indiquez pourquoi et cliquez sur **Confirmer la résiliation**. **Garder mon forfait** annule une résiliation prévue.",
                },
                {
                  text: "L'onglet **Moyens de paiement** liste les moyens enregistrés (celui **Par défaut** en premier). Cliquez sur **Retirer** et confirmez pour en supprimer un.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Ishyura ibyo ugomba, shaka inyemezabuguzi n'inyemezabwishyu",
          summary:
            "Kwishyura yerekana ibyo ugomba, ibyo wishyuye uyu mwaka n'amafaranga asigaye. Ibice birimo inyemezabuguzi, ibiciro, inyemezabwishyu, raporo, gahunda n'uburyo bwo kwishyura.",
          keywords:
            "kwishyura inyemezabuguzi inyemezabwishyu ishyura ubu umwenda igiciro emera anga raporo CSV gahunda uburyo bwo kwishyura MoMo ikarita",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2",
            cost: "Ibyo ugomba gusa",
            need: ["Mobile Money cyangwa ikarita"],
          },
          sections: [
            {
              id: "pay",
              title: "Ishyura ibyo ugomba",
              steps: [
                {
                  text: "Kanda **Inyemezabwishyu** mu rutonde rw'ibumoso. Udusanduku twerekana **Ibyo kwishyura**, **Byishyuwe uyu mwaka**, **Amafaranga asigaye** na **Gahunda** yawe.",
                  shot: "client-billing",
                  marks: [
                    "Imibare yawe",
                    "Ishyura ibya kera",
                    "Ibice",
                    "Fungura inyemezabuguzi",
                    "Ishyura iyi",
                    "Ukeneye ubufasha?",
                  ],
                },
                {
                  text: "Kanda **Ishyura ubu** ku gasanduku ka **Ibyo kwishyura** wishyure ibya kera kurusha ibindi, cyangwa ujye mu gice cya **Ibyo kwishyura**: buri murongo werekana nimero, serivisi, itariki ntarengwa n'amafaranga, na buto ya **Ishyura**.",
                },
                {
                  text: "Kanda **Ishyura**. Paji yo kwishyura irafunguka: hitamo Mobile Money cyangwa ikarita wemeze. Inyemezabwishyu iza kuri SMS no mu gice cya **Inyemezabwishyu**.",
                },
                {
                  text: "Imirongo yanditseho **Byarengeje igihe** yarenze itariki; ibanze kwishyurwa kugira ngo ubusabe bwawe budatinda. **Nta cyo ugomba kwishyura.** bisobanura ko nta deni ufite.",
                },
              ],
              tips: [
                "**Amafaranga asigaye**: ayo warengeje ahinduka inguzanyo ushobora gukoresha nyuma.",
              ],
            },
            {
              id: "invoices",
              title: "Shaka inyemezabuguzi",
              steps: [
                {
                  text: "Kanda igice cya **Inyemezabuguzi**. Andika muri **Shakisha inyemezabuguzi…** uyishake ukoresheje nimero cyangwa serivisi; **Sohora CSV** ikuramo urutonde.",
                  shot: "client-billing-invoices",
                  marks: ["Shakisha inyemezabuguzi", "Nimero y'inyemezabuguzi"],
                },
                {
                  text: "Kanda nimero. Igice cy'**Ibisobanuro by'inyemezabuguzi** cyerekana serivisi, amatariki n'amafaranga. Kanda **Kuramo PDF**, cyangwa **Ishyura ubu** niba itarishyurwa.",
                  shot: "client-billing-invoice",
                  marks: ["Ibisobanuro by'inyemezabuguzi", "Kuramo PDF"],
                },
              ],
            },
            {
              id: "quotes",
              title: "Emera cyangwa wange igiciro",
              steps: [
                {
                  text: "Kanda igice cy'**Ibiciro byatanzwe**. Buri giciro cyerekana amafaranga, icyitonderwa na **Bifite agaciro kugeza** ku itariki.",
                  shot: "client-billing-quotes",
                  marks: ["Ibiciro byawe"],
                },
                {
                  text: "Kanda **Emera**: ubona **Igiciro cyemewe. Fagitire irakurikira.** Inyemezabuguzi igaragara muri **Ibyo kwishyura**.",
                },
                {
                  text: "Cyangwa ukande **Anga**, wandike **Kubera iki ubyanze?** kugira ngo tubihindure, hanyuma wemeze.",
                },
              ],
            },
            {
              id: "receipts",
              title: "Inyemezabwishyu na raporo",
              steps: [
                {
                  text: "Kanda igice cya **Inyemezabwishyu** ukande **Kuramo** iruhande rwa buri bwishyu ubone PDF.",
                  shot: "client-billing-receipts",
                  marks: ["Inyemezabwishyu zawe", "Kuramo"],
                },
                {
                  text: "Kanda igice cya **Raporo z'imari**, uhitemo **Igihe** (**Uku kwezi**, **Ukwezi gushize**, **Amezi 3 ashize**, **Uyu mwaka**) ukande **Kuramo CSV**.",
                  shot: "client-billing-statements",
                  marks: ["Igihe", "Kuramo CSV"],
                },
              ],
            },
            {
              id: "plan",
              title: "Gahunda n'uburyo bwo kwishyura",
              steps: [
                {
                  text: "Kanda igice cya **Gahunda**. Nta gahunda, wishyura kuri buri busabe; kanda **Reba gahunda** ugereranye. Ufite gahunda, ubona ko ikora n'itariki izongera gutangira.",
                  shot: "client-billing-plan",
                  marks: ["Gahunda yawe"],
                },
                {
                  text: "Kuyihindura, kanda **Hindura gahunda**, uhitemo inshya ukande **Komeza**. Kuzamuka bisaba nimero ya MTN MoMo: kanda **Ishyura na MoMo** wemeze kuri telefoni.",
                },
                {
                  text: "Kuyihagarika, kanda **Hagarika gahunda**, uhitemo igihe, uvuge impamvu ukande **Emeza guhagarika**. **Gumana gahunda yanjye** ikuraho guhagarika kwateganyijwe.",
                },
                {
                  text: "Igice cy'**Uburyo bwo kwishyura** cyerekana uburyo wabitse (**Ibanze** buza mbere). Kanda **Kuraho** wemeze kugira ngo ubusibe.",
                },
              ],
            },
          ],
        },
      },
    },
    // 10. Refunds
    {
      slug: "ask-for-a-refund",
      cat: "money",
      minutes: 3,
      updated: UPDATED,
      pages: ["/help/refunds"],
      t: {
        en: {
          title: "Ask for a refund",
          summary:
            "From Help → Refunds you pick a paid request, give the reason and where to send the money, then follow the refund step by step.",
          keywords:
            "refund money back reimburse duplicate payment cancelled not delivered momo card",
          facts: {
            who: "Clients with a paid request",
            time: "2 minutes to ask, usually 3–5 business days to be paid back",
            cost: "Free",
          },
          sections: [
            {
              id: "ask",
              title: "Send the refund request",
              steps: [
                {
                  text: "Click **Help** in the side menu, then **Refunds** at the top right (or **Request a refund** in the Refunds box).",
                },
                {
                  text: "Read the policy at the top: full refund before work starts, partial after; government fees already paid can't be refunded.",
                  shot: "client-refunds",
                  marks: ["Refund policy", "My refund requests"],
                },
                {
                  text: "Under **Which payment?** each paid request shows **Eligible** or **Not eligible** (with the reason). Click **Request a refund** on an eligible one.",
                },
                {
                  text: "In the window, choose the **Reason for refund**, add **Details** (required when you choose **Other**) and pick **Refund to**: **Mobile Money (same number)** or **Card used to pay**.",
                },
                {
                  text: "Click **Submit refund request**. You see **Refund … requested** with its reference.",
                },
              ],
            },
            {
              id: "follow",
              title: "Follow it",
              steps: [
                {
                  text: "Under **My refund requests**, each card shows the reference, request, date and amount with a four-step bar: **Requested**, **Reviewed**, **Approved**, **Paid back**.",
                },
                {
                  text: "If it shows **Declined**, the reason is written on the card; click **Talk to us** to discuss it.",
                },
              ],
              tips: [
                "A consultation booking is refunded from its own page; see the consultations guide.",
              ],
            },
          ],
        },
        fr: {
          title: "Demander un remboursement",
          summary:
            "Depuis Aide → Remboursements, choisissez une demande payée, indiquez le motif et où recevoir l'argent, puis suivez le remboursement étape par étape.",
          keywords:
            "remboursement rembourser paiement en double annulé non rendu momo carte",
          facts: {
            who: "Clients ayant une demande payée",
            time: "2 minutes pour demander, en général 3 à 5 jours ouvrés pour être remboursé",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "ask",
              title: "Envoyer la demande",
              steps: [
                {
                  text: "Cliquez sur **Aide** dans le menu latéral, puis sur **Remboursements** en haut à droite (ou **Demander un remboursement** dans l'encadré Remboursements).",
                },
                {
                  text: "Lisez la règle en haut : remboursement total avant le début du travail, partiel ensuite ; les frais publics déjà payés ne sont pas remboursables.",
                  shot: "client-refunds",
                  marks: [
                    "Règle de remboursement",
                    "Mes demandes de remboursement",
                  ],
                },
                {
                  text: "Sous **Quel paiement ?**, chaque demande payée indique **Éligible** ou **Non éligible** (avec la raison). Cliquez sur **Demander un remboursement** sur une demande éligible.",
                },
                {
                  text: "Dans la fenêtre, choisissez le **Motif**, ajoutez des **Détails** (obligatoires si vous choisissez **Autre**) et choisissez **Rembourser sur** : **Mobile Money (même numéro)** ou **Carte utilisée**.",
                },
                {
                  text: "Cliquez sur **Envoyer la demande**. Vous voyez **Remboursement … demandé** avec sa référence.",
                },
              ],
            },
            {
              id: "follow",
              title: "Le suivre",
              steps: [
                {
                  text: "Sous **Mes demandes de remboursement**, chaque carte montre la référence, la demande, la date et le montant avec quatre étapes : **Demandé**, **Examiné**, **Approuvé**, **Remboursé**.",
                },
                {
                  text: "S'il est **Refusé**, le motif est écrit sur la carte ; cliquez sur **Nous parler** pour en discuter.",
                },
              ],
              tips: [
                "Une consultation réservée se rembourse depuis sa propre page ; voir le guide des consultations.",
              ],
            },
          ],
        },
        rw: {
          title: "Saba gusubizwa amafaranga",
          summary:
            "Muri Ubufasha → Gusubizwa amafaranga, hitamo ubusabe wishyuye, uvuge impamvu n'aho amafaranga azajya, hanyuma ukurikirane intambwe ku yindi.",
          keywords:
            "gusubizwa amafaranga nishyuye kabiri byahagaritswe ntiyatanzwe momo ikarita",
          facts: {
            who: "Abakiriya bafite ubusabe bwishyuwe",
            time: "Iminota 2 yo gusaba, akenshi iminsi 3–5 y'akazi yo gusubizwa",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "ask",
              title: "Ohereza ubusabe bwo gusubizwa",
              steps: [
                {
                  text: "Kanda **Ubufasha** mu rutonde rw'ibumoso, hanyuma **Gusubizwa amafaranga** hejuru iburyo (cyangwa **Saba gusubizwa** mu gasanduku ko gusubizwa).",
                },
                {
                  text: "Soma amabwiriza hejuru: usubizwa yose mbere y'uko akazi gatangira, igice nyuma; amafaranga ya Leta yamaze kwishyurwa ntasubizwa.",
                  shot: "client-refunds",
                  marks: [
                    "Amabwiriza yo gusubizwa",
                    "Ubusabe bwanjye bwo gusubizwa",
                  ],
                },
                {
                  text: "Munsi ya **Ni ubuhe bwishyu?** buri busabe bwishyuwe bwerekana **Biremewe** cyangwa **Ntibyemewe** (n'impamvu). Kanda **Saba gusubizwa** ku bwemewe.",
                },
                {
                  text: "Mu idirishya, hitamo **Impamvu**, wongereho **Ibisobanuro** (ni ngombwa iyo uhisemo **Ikindi**) uhitemo **Asubizwe kuri**: **Mobile Money (nimero imwe)** cyangwa **Ikarita wishyuriyeho**.",
                },
                {
                  text: "Kanda **Ohereza ubusabe**. Ubona **Ubusabe … bwoherejwe** n'inomero yabwo.",
                },
              ],
            },
            {
              id: "follow",
              title: "Bukurikirane",
              steps: [
                {
                  text: "Munsi ya **Ubusabe bwanjye bwo gusubizwa**, buri karita yerekana inomero, ubusabe, itariki n'amafaranga n'intambwe enye: **Byasabwe**, **Byasuzumwe**, **Byemejwe**, **Byasubijwe**.",
                },
                {
                  text: "Niba yerekana **Byanzwe**, impamvu yanditse ku ikarita; kanda **Vugana natwe** mubiganireho.",
                },
              ],
              tips: [
                "Inama wafashe isubizwa uhereye kuri paji yayo; reba amabwiriza y'inama.",
              ],
            },
          ],
        },
      },
    },
    // 11. History
    {
      slug: "service-history",
      cat: "account",
      minutes: 2,
      updated: UPDATED,
      pages: ["/history"],
      t: {
        en: {
          title: "See everything that happened on your account",
          summary:
            "History lists every request, payment, document and account event by date. Filter it, export it, or start a past service again.",
          keywords:
            "history activity log past requests payments export CSV year request again",
          facts: {
            who: "Every signed-in client",
            time: "1 minute",
            cost: "Free",
          },
          sections: [
            {
              id: "use",
              title: "Search and filter",
              steps: [
                {
                  text: "Click **History** in the side menu. A line at the top says how many events there were this year.",
                  shot: "client-history",
                  marks: [
                    "Search, type and year",
                    "Your events",
                    "Request again",
                  ],
                },
                {
                  text: "Type in **Search history**, choose a **Type** (**Requests**, **Payments**, **Documents**, **Account**) or a **Year**. **Clear filters** resets them.",
                },
                {
                  text: "Each row shows the **Date**, **What happened**, the **Reference** and the **Amount**. Click a column title to sort.",
                },
                {
                  text: "Click **Export CSV** to download the year's list as a spreadsheet.",
                },
                {
                  text: "On a past request, click **Request again** to start the same service once more.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Voir tout ce qui s'est passé sur votre compte",
          summary:
            "L'historique liste chaque demande, paiement, document et événement du compte par date. Filtrez-le, exportez-le ou relancez un ancien service.",
          keywords:
            "historique activité journal anciennes demandes paiements exporter CSV année redemander",
          facts: {
            who: "Tout client connecté",
            time: "1 minute",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "use",
              title: "Chercher et filtrer",
              steps: [
                {
                  text: "Cliquez sur **Historique** dans le menu latéral. Une ligne en haut indique le nombre d'événements de l'année.",
                  shot: "client-history",
                  marks: [
                    "Recherche, type et année",
                    "Vos événements",
                    "Redemander",
                  ],
                },
                {
                  text: "Tapez dans **Rechercher dans l'historique**, choisissez un **Type** (**Demandes**, **Paiements**, **Documents**, **Compte**) ou une **Année**. **Effacer les filtres** les remet à zéro.",
                },
                {
                  text: "Chaque ligne montre la **Date**, l'**Événement**, la **Référence** et le **Montant**. Cliquez sur un titre de colonne pour trier.",
                },
                {
                  text: "Cliquez sur **Exporter CSV** pour télécharger la liste de l'année.",
                },
                {
                  text: "Sur une ancienne demande, cliquez sur **Redemander** pour relancer le même service.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Reba ibyabaye byose kuri konti yawe",
          summary:
            "Amateka yerekana buri busabe, ubwishyu, inyandiko n'ibyabaye kuri konti hakurikijwe itariki. Byungurure, ubisohore, cyangwa wongere usabe serivisi wakoresheje.",
          keywords:
            "amateka ibyakozwe ubusabe bwa kera kwishyura sohora CSV umwaka saba indi nshuro",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Umunota 1",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "use",
              title: "Shakisha kandi uyungurure",
              steps: [
                {
                  text: "Kanda **Amateka** mu rutonde rw'ibumoso. Umurongo uri hejuru uvuga umubare w'ibikorwa by'uyu mwaka.",
                  shot: "client-history",
                  marks: [
                    "Shakisha, ubwoko n'umwaka",
                    "Ibyabaye",
                    "Saba indi nshuro",
                  ],
                },
                {
                  text: "Andika muri **Shakisha mu mateka**, uhitemo **Ubwoko** (**Ubusabe**, **Kwishyura**, **Inyandiko**, **Konti**) cyangwa **Umwaka**. **Siba ibyo wahisemo** irabisubiza uko byari.",
                },
                {
                  text: "Buri murongo werekana **Itariki**, **Icyabaye**, **Nimero** n'**Amafaranga**. Kanda umutwe w'inkingi kugira ngo utondeke.",
                },
                { text: "Kanda **Sohora CSV** ukuremo urutonde rw'umwaka." },
                {
                  text: "Ku busabe bwa kera, kanda **Saba indi nshuro** wongere utangire iyo serivisi.",
                },
              ],
            },
          ],
        },
      },
    },
    // 12. Consultations
    {
      slug: "consultations",
      cat: "help",
      minutes: 3,
      updated: UPDATED,
      pages: ["/bookings"],
      t: {
        en: {
          title: "Book, move or cancel a consultation",
          summary:
            "Consultations lists your calls and meetings with an adviser. Book a new one, open it to join, reschedule or cancel, and read your adviser's notes afterwards.",
          keywords:
            "consultation booking appointment meeting call video adviser reschedule cancel join notes",
          facts: {
            who: "Every signed-in client",
            time: "3 minutes to book",
            cost: "Shown on each consultation type (some are free)",
          },
          sections: [
            {
              id: "list",
              title: "See and book consultations",
              steps: [
                {
                  text: "Click **Consultations** in the side menu. The **Upcoming** tab opens; **Past** holds earlier ones.",
                  shot: "client-bookings",
                  marks: [
                    "Book a consultation",
                    "Upcoming and Past",
                    "View details",
                  ],
                },
                {
                  text: "Each card shows the date, the consultation type, the time, phone, video or office, your adviser and the reference, with its status.",
                },
                {
                  text: "To book, click **Book a consultation**, choose the kind of conversation, pick a time (shown in Kigali time) and confirm. With no booking yet you can also click **Ask the assistant**.",
                },
                {
                  text: "For a video call, a **Join** button appears on the card shortly before the start.",
                },
              ],
            },
            {
              id: "change",
              title: "Reschedule or cancel",
              steps: [
                {
                  text: "Click **View details** on the card. The **Manage your booking** page opens.",
                },
                {
                  text: "Click **Reschedule**, pick a new time in **Pick a new time**, then click **Move booking**. The window tells you how many changes you have left.",
                },
                {
                  text: "Or click **Cancel booking**. For a paid session, choose a refund to your payment method or HEBUZA credit, then click **Cancel booking** again to confirm (**Keep booking** to go back).",
                },
                {
                  text: "If a booking is still waiting for payment, click **Finish payment** on the same page.",
                },
              ],
              warn: "You can reschedule or cancel up to 12 hours before the start. After that the buttons are greyed: contact us on WhatsApp instead.",
            },
            {
              id: "after",
              title: "After the consultation",
              intro:
                "Open the booking in the **Past** tab: **Notes from your adviser** shows the summary, and **Recommended next steps** can start the suggested request in one click.",
            },
          ],
        },
        fr: {
          title: "Réserver, déplacer ou annuler une consultation",
          summary:
            "Consultations liste vos appels et rendez-vous avec un conseiller. Réservez-en un, ouvrez-le pour rejoindre, déplacer ou annuler, puis lisez les notes de votre conseiller.",
          keywords:
            "consultation réservation rendez-vous appel vidéo conseiller reporter annuler rejoindre notes",
          facts: {
            who: "Tout client connecté",
            time: "3 minutes pour réserver",
            cost: "Indiqué sur chaque type de consultation (certaines sont gratuites)",
          },
          sections: [
            {
              id: "list",
              title: "Voir et réserver",
              steps: [
                {
                  text: "Cliquez sur **Consultations** dans le menu latéral. L'onglet **À venir** s'ouvre ; **Passées** contient les anciennes.",
                  shot: "client-bookings",
                  marks: [
                    "Réserver une consultation",
                    "À venir et Passées",
                    "Voir le détail",
                  ],
                },
                {
                  text: "Chaque carte montre la date, le type de consultation, l'heure, le mode (téléphone, vidéo ou bureau), votre conseiller et la référence, avec le statut.",
                },
                {
                  text: "Pour réserver, cliquez sur **Réserver une consultation**, choisissez le type d'échange, un horaire (heure de Kigali) et confirmez. Sans réservation, vous pouvez aussi cliquer sur **Demander à l'assistant**.",
                },
                {
                  text: "Pour un appel vidéo, un bouton **Rejoindre** apparaît sur la carte peu avant le début.",
                },
              ],
            },
            {
              id: "change",
              title: "Déplacer ou annuler",
              steps: [
                {
                  text: "Cliquez sur **Voir le détail**. La page **Gérer votre réservation** s'ouvre.",
                },
                {
                  text: "Cliquez sur **Reporter**, choisissez un nouvel horaire dans **Pick a new time**, puis **Move booking**. La fenêtre indique combien de changements il vous reste.",
                },
                {
                  text: "Ou cliquez sur **Annuler la réservation**. Pour une séance payée, choisissez **Rembourser sur mon moyen de paiement** ou **Garder en avoir HEBUZA**, puis confirmez avec **Annuler la réservation** (**Garder la réservation** pour revenir).",
                },
                {
                  text: "Si une réservation attend encore le paiement, cliquez sur **Finaliser le paiement** sur la même page.",
                },
              ],
              warn: "Vous pouvez déplacer ou annuler jusqu'à 12 heures avant le début. Ensuite les boutons sont grisés : contactez-nous sur WhatsApp.",
            },
            {
              id: "after",
              title: "Après la consultation",
              intro:
                "Ouvrez la réservation dans l'onglet **Passées** : **Notes de votre conseiller** montre le résumé, et **Prochaines étapes recommandées** peut lancer la demande conseillée en un clic.",
            },
          ],
        },
        rw: {
          title: "Fata, imura cyangwa uhagarike inama",
          summary:
            "Inama yerekana ibiganiro n'inama ufitanye n'umujyanama. Fata inshya, uyifungure winjire, wimure igihe cyangwa uyihagarike, hanyuma usome ibyo umujyanama yanditse.",
          keywords:
            "inama gahunda guhura guhamagara videwo umujyanama imura igihe hagarika injira ibyanditswe",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 3 yo gufata",
            cost: "Cyerekanwa kuri buri bwoko bw'inama (zimwe ni ubuntu)",
          },
          sections: [
            {
              id: "list",
              title: "Reba kandi ufate inama",
              steps: [
                {
                  text: "Kanda **Inama** mu rutonde rw'ibumoso. Igice cy'**Iziri imbere** kirafunguka; **Izashize** kirimo iza kera.",
                  shot: "client-bookings",
                  marks: [
                    "Fata gahunda y'inama",
                    "Iziri imbere n'Izashize",
                    "Reba ibisobanuro",
                  ],
                },
                {
                  text: "Buri karita yerekana itariki, ubwoko bw'inama, isaha, uburyo (telefoni, videwo cyangwa ku biro), umujyanama wawe n'inomero, n'aho bigeze.",
                },
                {
                  text: "Gufata inama, kanda **Fata gahunda y'inama**, uhitemo ubwoko bw'ikiganiro, igihe (amasaha ya Kigali) wemeze. Niba nta nama ufite, ushobora no gukanda **Baza umufasha**.",
                },
                {
                  text: "Ku nama ya videwo, buto ya **Injira** igaragara ku ikarita mbere gato y'uko itangira.",
                },
              ],
            },
            {
              id: "change",
              title: "Imura igihe cyangwa uhagarike",
              steps: [
                {
                  text: "Kanda **Reba ibisobanuro** ku ikarita. Paji ya **Gucunga gahunda yawe** irafunguka.",
                },
                {
                  text: "Kanda **Imura igihe**, uhitemo igihe gishya muri **Pick a new time**, hanyuma ukande **Move booking**. Idirishya rikubwira impinduka usigaje.",
                },
                {
                  text: "Cyangwa ukande **Hagarika gahunda**. Ku nama yishyuwe, hitamo gusubizwa ku buryo wishyuyeho cyangwa kubikwa nk'inguzanyo ya HEBUZA, hanyuma wemeze na **Cancel booking** (**Keep booking** kugira ngo usubire inyuma).",
                },
                {
                  text: "Niba gahunda igitegereje kwishyurwa, kanda buto yo kurangiza kwishyura kuri iyo paji.",
                },
              ],
              warn: "Ushobora kwimura cyangwa guhagarika kugeza amasaha 12 mbere y'uko itangira. Nyuma y'aho buto ziba zijimye: twandikire kuri WhatsApp.",
            },
            {
              id: "after",
              title: "Nyuma y'inama",
              intro:
                "Fungura gahunda mu gice cy'**Izashize**: ubona ibyo umujyanama wawe yanditse n'intambwe zikurikira zagusabwe, harimo **Tangira ubusabe wagiriwe inama** ukanze rimwe.",
            },
          ],
        },
      },
    },
    // 13. Companies
    {
      slug: "companies",
      cat: "account",
      minutes: 5,
      updated: UPDATED,
      pages: ["/orgs"],
      t: {
        en: {
          title: "Work for a company: add it, invite people, switch",
          summary:
            "Register your company once, get it verified, invite colleagues with a role, and switch between your personal account and the company.",
          keywords:
            "company organisation organization business add register invite member team role owner admin viewer switch verify RDB TIN",
          facts: {
            who: "Business owners and their team",
            time: "5 minutes to register",
            cost: "Free",
            need: [
              "Company legal name",
              "TIN (9 digits) and RDB number, if you have them",
              "The RDB certificate in My documents (for verification)",
            ],
          },
          sections: [
            {
              id: "add",
              title: "Register a company",
              steps: [
                {
                  text: "Click **Companies** in the side menu, then **Add company**.",
                  shot: "client-orgs",
                  marks: ["Add company"],
                },
                {
                  text: "In **Register a company**, fill in the **Legal name** (required), and if you have them the trade name, **Company type**, **TIN (9 digits)**, **RDB registration number**, address and contacts.",
                  shot: "client-orgs-add",
                  marks: ["Legal name", "TIN", "Create company"],
                },
                {
                  text: "Click **Create company**. You see **Company created** and you are its **Owner**.",
                },
                {
                  text: "Add the RDB certificate to **Documents**, then click **Ask for verification** on the company. The badge moves from **Not verified** to **Verification pending**, then **Verified** (or **Needs correction** with a note).",
                },
              ],
            },
            {
              id: "switch",
              title: "Work as the company",
              steps: [
                {
                  text: "Click **Switch to this company** on its card. You see **Now working as …** and the card shows **Active**: new requests and documents are filed for the company.",
                },
                {
                  text: "To go back, click **Switch to this company** on the **Personal account** card.",
                },
              ],
            },
            {
              id: "invite",
              title: "Invite and manage people",
              steps: [
                {
                  text: "On the company card, click **Invite a member**. Type an **Email or phone**, choose a **Role** (**Viewer** or **Admin**) and click **Send invite**.",
                },
                {
                  text: "The person appears with **Invite pending** until they open the link and click **Accept invitation**.",
                },
                {
                  text: "Change a member's role in the drop-down next to their name, or click **Remove** and confirm to take away their access.",
                },
              ],
              tips: [
                "Only owners and admins can invite or remove members; viewers see the list only.",
              ],
            },
            {
              id: "detail",
              title: "Company page",
              steps: [
                {
                  text: "Click **Open** on the company card. The tabs show **Profile**, **Representatives**, **Documents**, **Requests**, **Invoices** and **Timeline**.",
                },
                {
                  text: "On **Profile**, click **Edit details**, change what you need and click **Save changes**. On **Documents**, click **Add document** to upload a company file.",
                },
                {
                  text: "**Company plan** at the top shows whether a plan covers requests filed for the company; click **See plans** to buy one.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Agir pour une entreprise : l'ajouter, inviter, basculer",
          summary:
            "Enregistrez votre entreprise une fois, faites-la vérifier, invitez des collègues avec un rôle, et passez de votre compte personnel à l'entreprise.",
          keywords:
            "entreprise organisation société ajouter enregistrer inviter membre équipe rôle propriétaire admin lecteur basculer vérifier RDB NIF",
          facts: {
            who: "Chefs d'entreprise et leur équipe",
            time: "5 minutes pour l'enregistrer",
            cost: "Gratuit",
            need: [
              "La raison sociale",
              "Le NIF (9 chiffres) et le numéro RDB, si vous les avez",
              "Le certificat RDB dans Mes documents (pour la vérification)",
            ],
          },
          sections: [
            {
              id: "add",
              title: "Enregistrer une entreprise",
              steps: [
                {
                  text: "Cliquez sur **Entreprises** dans le menu latéral, puis sur **Ajouter une entreprise**.",
                  shot: "client-orgs",
                  marks: ["Ajouter une entreprise"],
                },
                {
                  text: "Dans **Enregistrer une entreprise**, saisissez la **Raison sociale** (obligatoire) et, si vous les avez, le nom commercial, le **Type d'entreprise**, le **NIF (9 chiffres)**, le **Numéro RDB**, l'adresse et les contacts.",
                  shot: "client-orgs-add",
                  marks: ["Raison sociale", "NIF", "Créer l'entreprise"],
                },
                {
                  text: "Cliquez sur **Créer l'entreprise**. Vous voyez **Entreprise créée** et vous en êtes **Propriétaire**.",
                },
                {
                  text: "Ajoutez le certificat RDB dans **Documents**, puis cliquez sur **Demander la vérification**. Le badge passe de **Non vérifiée** à **Vérification en attente**, puis **Vérifiée** (ou **À corriger** avec une note).",
                },
              ],
            },
            {
              id: "switch",
              title: "Agir au nom de l'entreprise",
              steps: [
                {
                  text: "Cliquez sur **Passer à cette entreprise** sur sa carte. Vous voyez **Vous agissez pour …** et la carte indique **Active** : les nouvelles demandes et documents sont au nom de l'entreprise.",
                },
                {
                  text: "Pour revenir, cliquez sur **Passer à cette entreprise** sur la carte **Compte personnel**.",
                },
              ],
            },
            {
              id: "invite",
              title: "Inviter et gérer les membres",
              steps: [
                {
                  text: "Sur la carte de l'entreprise, cliquez sur **Inviter un membre**. Saisissez un **E-mail ou téléphone**, choisissez un **Rôle** (**Lecteur** ou **Admin**) et cliquez sur **Envoyer l'invitation**.",
                },
                {
                  text: "La personne apparaît avec **Invitation en attente** jusqu'à ce qu'elle ouvre le lien et accepte l'invitation.",
                },
                {
                  text: "Changez le rôle d'un membre dans la liste à côté de son nom, ou cliquez sur **Retirer** et confirmez pour lui retirer l'accès.",
                },
              ],
              tips: [
                "Seuls les propriétaires et admins peuvent inviter ou retirer des membres ; les lecteurs voient seulement la liste.",
              ],
            },
            {
              id: "detail",
              title: "Page de l'entreprise",
              steps: [
                {
                  text: "Cliquez sur **Ouvrir** sur la carte. Les onglets montrent **Profil**, **Représentants**, **Documents**, **Demandes**, **Factures** et **Historique**.",
                },
                {
                  text: "Dans **Profil**, cliquez sur **Modifier**, changez ce qu'il faut et cliquez sur **Enregistrer**. Dans **Documents**, cliquez sur **Ajouter un document** pour envoyer un fichier de l'entreprise.",
                },
                {
                  text: "**Forfait entreprise** en haut indique si un forfait couvre les demandes de l'entreprise ; cliquez sur **Voir les forfaits** pour en acheter un.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Korera ikigo: cyongereho, tumira abantu, hinduranya",
          summary:
            "Andikisha ikigo cyawe rimwe, gisuzumwe, utumire abo mukorana ufite uruhare, kandi uhinduranye hagati ya konti bwite n'ikigo.",
          keywords:
            "ikigo sosiyete ubucuruzi ongeraho andikisha tumira umunyamuryango ikipe uruhare nyiri ikigo umuyobozi ureba gusa hinduranya kwemeza RDB TIN",
          facts: {
            who: "Ba nyiri ibigo n'amakipe yabo",
            time: "Iminota 5 yo kwandikisha",
            cost: "Ni ubuntu",
            need: [
              "Izina ryemewe n'amategeko",
              "TIN (imibare 9) na nimero ya RDB, niba uzifite",
              "Icyemezo cya RDB mu Nyandiko zanjye (cyo gusuzuma)",
            ],
          },
          sections: [
            {
              id: "add",
              title: "Andikisha ikigo",
              steps: [
                {
                  text: "Kanda **Ibigo** mu rutonde rw'ibumoso, hanyuma **Ongeraho ikigo**.",
                  shot: "client-orgs",
                  marks: ["Ongeraho ikigo"],
                },
                {
                  text: "Muri **Andikisha ikigo**, uzuza **Izina ryemewe n'amategeko** (ni ngombwa) kandi niba ubifite izina ry'ubucuruzi, **Ubwoko bw'ikigo**, **TIN (imibare 9)**, **Nimero ya RDB**, aderesi n'aho kigerwaho.",
                  shot: "client-orgs-add",
                  marks: ["Izina ryemewe", "TIN", "Fungura ikigo"],
                },
                {
                  text: "Kanda **Fungura ikigo**. Ubona **Ikigo cyafunguwe** kandi uba **Nyiri ikigo**.",
                },
                {
                  text: "Shyira icyemezo cya RDB mu **Nyandiko**, hanyuma ukande **Saba kwemezwa** ku kigo. Ikirango kiva kuri **Ntikiremezwa** kijya kuri **Gitegereje kwemezwa**, hanyuma **Cyemejwe** (cyangwa **Gikeneye gukosorwa** n'icyitonderwa).",
                },
              ],
            },
            {
              id: "switch",
              title: "Kora mu izina ry'ikigo",
              steps: [
                {
                  text: "Kanda **Koresha iki kigo** ku ikarita yacyo. Ubona **Ubu ukora nka …** kandi ikarita yerekana **Gikoreshwa**: ubusabe n'inyandiko bishya biba iby'ikigo.",
                },
                {
                  text: "Gusubira inyuma, kanda **Koresha iki kigo** ku ikarita ya **Konti bwite**.",
                },
              ],
            },
            {
              id: "invite",
              title: "Tumira kandi ucunge abantu",
              steps: [
                {
                  text: "Ku ikarita y'ikigo, kanda **Tumira umunyamuryango**. Andika **Imeyili cyangwa telefoni**, uhitemo **Uruhare** (**Ureba gusa** cyangwa **Umuyobozi**) ukande **Ohereza ubutumire**.",
                },
                {
                  text: "Uwo muntu agaragara afite **Ubutumire butegereje** kugeza afunguye ihuza agakanda **Emera ubutumire**.",
                },
                {
                  text: "Hindura uruhare rw'umunyamuryango mu rutonde ruri iruhande rw'izina rye, cyangwa ukande **Kuramo** wemeze kugira ngo umwambure uburenganzira.",
                },
              ],
              tips: [
                "Ba nyiri ikigo n'abayobozi ni bo bonyine batumira cyangwa bakuramo abanyamuryango; abareba gusa babona urutonde gusa.",
              ],
            },
            {
              id: "detail",
              title: "Paji y'ikigo",
              steps: [
                {
                  text: "Kanda **Fungura** ku ikarita y'ikigo. Ibice ni **Umwirondoro**, **Abahagarariye**, **Inyandiko**, **Ubusabe**, **Fagitire** na **Amateka**.",
                },
                {
                  text: "Kuri **Umwirondoro**, kanda **Hindura amakuru**, uhindure ibikenewe ukande **Bika impinduka**. Kuri **Inyandiko**, kanda **Ongeraho inyandiko** wohereze dosiye y'ikigo.",
                },
                {
                  text: "**Ifatabuguzi ry'ikigo** hejuru ryerekana niba hari ifatabuguzi rikwira ubusabe bw'ikigo; kanda **Reba amafatabuguzi** urigure.",
                },
              ],
            },
          ],
        },
      },
    },
    // 14. Notifications
    {
      slug: "notifications",
      cat: "account",
      minutes: 3,
      updated: UPDATED,
      pages: ["/notifications", "/settings/notifications"],
      t: {
        en: {
          title: "Notifications and how we reach you",
          summary:
            "Notifications lists every update on your requests, payments and messages. In Settings → Notifications you choose SMS, WhatsApp, email or in-app for each kind of update.",
          keywords:
            "notifications alerts bell unread mark as read SMS WhatsApp email channels quiet hours browser push preferences",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes",
            cost: "Free",
          },
          sections: [
            {
              id: "read",
              title: "Read your notifications",
              steps: [
                {
                  text: "Click **Notifications** in the side menu. Updates are grouped into **Today** and **Earlier**; new ones carry a **New** badge.",
                  shot: "client-notifications",
                  marks: [
                    "Notification settings",
                    "Mark all as read",
                    "All or Unread",
                    "Open or mark as read",
                  ],
                },
                {
                  text: "Click **Unread** to see only new ones, **All** to see everything.",
                },
                {
                  text: "Click **Open** to go to the request, payment or message it is about, or **Mark as read** to clear it. **Mark all as read** clears them all.",
                },
                {
                  text: "Under some updates, **How it looked** shows the SMS, WhatsApp or email we sent you.",
                },
              ],
            },
            {
              id: "channels",
              title: "Choose your channels",
              steps: [
                {
                  text: "Click **Notification settings** at the top (or **Settings → Notifications**).",
                },
                {
                  text: "In **Notification channels**, each row is a kind of update (**Request updates**, **Missing documents**, **Payments and receipts**, **Messages from your adviser**, **Deadline reminders**, **News and tips**). Switch **In-app**, **SMS**, **WhatsApp** or **Email** on or off.",
                  shot: "client-settings-channels",
                  marks: [
                    "Channels per update",
                    "Quiet hours",
                    "Save preferences",
                  ],
                },
                {
                  text: "A greyed switch is **Always on, we must tell you about this.**",
                },
                {
                  text: "Turn on **Quiet hours** and set **From** and **To**: no SMS or WhatsApp in that window (urgent items still arrive).",
                },
                { text: "Click **Save preferences**. You see **Saved**." },
                {
                  text: "Optional: in **Browser notifications**, switch on **On for this device** to get a pop-up on this computer or phone.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Notifications et moyens de vous joindre",
          summary:
            "Notifications liste chaque nouvelle sur vos demandes, paiements et messages. Dans Paramètres → Notifications, choisissez SMS, WhatsApp, e-mail ou application pour chaque type de nouvelle.",
          keywords:
            "notifications alertes non lues marquer comme lu SMS WhatsApp e-mail canaux heures calmes navigateur préférences",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "read",
              title: "Lire vos notifications",
              steps: [
                {
                  text: "Cliquez sur **Notifications** dans le menu latéral. Elles sont groupées en **Aujourd'hui** et **Plus tôt** ; les nouvelles portent un badge **Nouveau**.",
                  shot: "client-notifications",
                  marks: [
                    "Paramètres de notification",
                    "Tout marquer comme lu",
                    "Toutes ou Non lues",
                    "Ouvrir ou marquer comme lu",
                  ],
                },
                {
                  text: "Cliquez sur **Non lues** pour ne voir que les nouvelles, **Toutes** pour tout voir.",
                },
                {
                  text: "Cliquez sur **Ouvrir** pour aller à la demande, au paiement ou au message concerné, ou sur **Marquer comme lu**. **Tout marquer comme lu** les efface toutes.",
                },
                {
                  text: "Sous certaines notifications, **Aperçu de l'envoi** montre le SMS, le WhatsApp ou l'e-mail envoyé.",
                },
              ],
            },
            {
              id: "channels",
              title: "Choisir vos canaux",
              steps: [
                {
                  text: "Cliquez sur **Paramètres de notification** en haut (ou **Paramètres → Notifications**).",
                },
                {
                  text: "Dans **Canaux de notification**, chaque ligne est un type de nouvelle (**Suivi des demandes**, **Documents manquants**, **Paiements et reçus**, **Messages de votre conseiller**, **Rappels d'échéance**, **Actualités et conseils**). Activez ou coupez **Dans l'app**, **SMS**, **WhatsApp** ou **E-mail**.",
                  shot: "client-settings-channels",
                  marks: [
                    "Canaux par type",
                    "Heures calmes",
                    "Enregistrer les préférences",
                  ],
                },
                {
                  text: "Un interrupteur grisé est **Toujours actif, nous devons vous en informer.**",
                },
                {
                  text: "Activez **Heures calmes** et réglez **De** et **À** : pas de SMS ni WhatsApp pendant ce créneau (l'urgent passe quand même).",
                },
                {
                  text: "Cliquez sur **Enregistrer les préférences**. Vous voyez **Enregistré**.",
                },
                {
                  text: "Facultatif : dans **Notifications du navigateur**, activez **Activées sur cet appareil** pour recevoir une alerte sur cet ordinateur ou ce téléphone.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Imenyesha n'uko tukugeraho",
          summary:
            "Ubutumwa (imenyesha) bwerekana buri makuru ku busabe bwawe, kwishyura n'ubutumwa. Mu Igenamiterere → Ubutumwa uhitamo SMS, WhatsApp, imeyili cyangwa ku rubuga kuri buri bwoko bw'amakuru.",
          keywords:
            "imenyesha ubutumwa bitarasomwe byasomwe SMS WhatsApp imeyili uburyo amasaha y'ituze mushakisha",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "read",
              title: "Soma imenyesha ryawe",
              steps: [
                {
                  text: "Kanda **Ubutumwa** (Notifications) mu rutonde rw'ibumoso. Amakuru agabanyijwemo **Uyu munsi** na **Mbere**; amashya afite ikirango **Gishya**.",
                  shot: "client-notifications",
                  marks: [
                    "Igenamiterere ry'ubutumwa",
                    "Byose byasomwe",
                    "Byose cyangwa Bitarasomwe",
                    "Fungura cyangwa byasomwe",
                  ],
                },
                {
                  text: "Kanda **Bitarasomwe** urebe amashya gusa, **Byose** urebe byose.",
                },
                {
                  text: "Kanda **Fungura** ujye ku busabe, ubwishyu cyangwa ubutumwa bijyanye, cyangwa **Byasomwe** ubikureho. **Byose byasomwe** ibikuraho byose.",
                },
                {
                  text: "Munsi ya bimwe, **Uko byagaragaye** yerekana SMS, WhatsApp cyangwa imeyili twakoherereje.",
                },
              ],
            },
            {
              id: "channels",
              title: "Hitamo uburyo tukugeraho",
              steps: [
                {
                  text: "Kanda **Igenamiterere ry'ubutumwa** hejuru (cyangwa **Igenamiterere → Ubutumwa**).",
                },
                {
                  text: "Muri **Uburyo bwo kukumenyesha**, buri murongo ni ubwoko bw'amakuru (**Amakuru ku busabe**, **Inyandiko zibura**, **Kwishyura n'inyemezabwishyu**, **Ubutumwa bw'umujyanama**, **Kwibutsa igihe ntarengwa**, **Amakuru n'inama**). Fungura cyangwa ufunge **Ku rubuga**, **SMS**, **WhatsApp** cyangwa **Imeyili**.",
                  shot: "client-settings-channels",
                  marks: [
                    "Uburyo kuri buri makuru",
                    "Amasaha y'ituze",
                    "Bika ibyo wahisemo",
                  ],
                },
                {
                  text: "Buto yijimye isobanura **Buri gihe birakora, tugomba kubikumenyesha.**",
                },
                {
                  text: "Fungura **Amasaha y'ituze** ushyireho **Kuva** na **Kugeza**: nta SMS cyangwa WhatsApp muri ayo masaha (ibyihutirwa biraza).",
                },
                { text: "Kanda **Bika ibyo wahisemo**. Ubona **Byabitswe**." },
                {
                  text: "Si ngombwa: muri **Amatangazo ya mushakisha**, fungura **Bifunguye kuri iki gikoresho** kugira ngo ubone itangazo kuri iyi mudasobwa cyangwa telefoni.",
                },
              ],
            },
          ],
        },
      },
    },
    // 15. Help and tickets
    {
      slug: "help-and-tickets",
      cat: "help",
      minutes: 3,
      updated: UPDATED,
      pages: ["/help"],
      t: {
        en: {
          title: "Get help and open a support ticket",
          summary:
            "Help answers common questions, lets you message your adviser, and opens support tickets for questions, complaints or feedback that you can follow and rate.",
          keywords:
            "help centre support ticket complaint question feedback FAQ contact reply rate",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes",
            cost: "Free",
          },
          sections: [
            {
              id: "find",
              title: "Find an answer",
              steps: [
                {
                  text: "Click **Help** in the side menu. Type in **Search help articles** (for example refund, documents, payment).",
                  shot: "client-help",
                  marks: [
                    "Refunds",
                    "Search help articles",
                    "Popular questions",
                    "Open a ticket",
                    "Contact us",
                  ],
                },
                {
                  text: "Click a question under **Popular questions** to read the answer.",
                },
                {
                  text: "To talk to someone about a request, click **Message your adviser** in **Contact us** (it opens My requests: pick the request, then **Messages**). **Contact options** lists our phone, email and offices.",
                },
              ],
            },
            {
              id: "ticket",
              title: "Open a ticket",
              steps: [
                {
                  text: "Under **My tickets**, click **Open a ticket**.",
                  shot: "client-help-ticket",
                  marks: [
                    "Type",
                    "Related request",
                    "Subject",
                    "Message",
                    "Send",
                  ],
                },
                {
                  text: "Choose the **Type**: **Question**, **Complaint** or **Feedback**. Complaints are answered within 3 business days.",
                },
                {
                  text: "Pick the **Related request** (or **Not about a request**), write a **Subject** and your **Message**.",
                },
                {
                  text: "Choose **How should we reply?** (**In-app**, **Email** or **SMS**) and click **Send**. You see **Ticket … received** with its reference.",
                },
              ],
            },
            {
              id: "follow",
              title: "Follow and reply",
              steps: [
                {
                  text: "Back on **Help**, the tabs **All**, **Open**, **Waiting for you** and **Resolved** filter your tickets. Click one to open it.",
                },
                {
                  text: "Read the replies from **HEBUZA support**, write in **Your reply** and click **Send reply**. **Waiting for you** means we need your answer.",
                },
                {
                  text: "When it is **Resolved**, rate the help under **How did we do?** and click **Send rating**. Need more? Open a new ticket.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Obtenir de l'aide et ouvrir un ticket",
          summary:
            "L'aide répond aux questions courantes, vous permet d'écrire à votre conseiller et d'ouvrir des tickets (question, réclamation, avis) que vous suivez et notez.",
          keywords:
            "aide centre d'aide support ticket réclamation question avis FAQ contact répondre noter",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "find",
              title: "Trouver une réponse",
              steps: [
                {
                  text: "Cliquez sur **Aide** dans le menu latéral. Tapez dans **Rechercher dans l'aide** (par ex. remboursement, documents, paiement).",
                  shot: "client-help",
                  marks: [
                    "Remboursements",
                    "Rechercher dans l'aide",
                    "Questions fréquentes",
                    "Ouvrir un ticket",
                    "Nous contacter",
                  ],
                },
                {
                  text: "Cliquez sur une question sous **Questions fréquentes** pour lire la réponse.",
                },
                {
                  text: "Pour parler d'une demande, cliquez sur **Écrire à votre conseiller** dans **Nous contacter** (Mes demandes s'ouvre : choisissez la demande, puis **Messages**). **Moyens de contact** donne téléphone, e-mail et bureaux.",
                },
              ],
            },
            {
              id: "ticket",
              title: "Ouvrir un ticket",
              steps: [
                {
                  text: "Sous **Mes tickets**, cliquez sur **Ouvrir un ticket**.",
                  shot: "client-help-ticket",
                  marks: [
                    "Type",
                    "Demande concernée",
                    "Objet",
                    "Message",
                    "Envoyer",
                  ],
                },
                {
                  text: "Choisissez le **Type** : **Question**, **Réclamation** ou **Avis**. Les réclamations reçoivent une réponse sous 3 jours ouvrés.",
                },
                {
                  text: "Choisissez la **Demande concernée** (ou **Sans rapport avec une demande**), écrivez un **Objet** et votre **Message**.",
                },
                {
                  text: "Choisissez **Comment vous répondre ?** (**Dans l'app**, **E-mail** ou **SMS**) et cliquez sur **Envoyer**. Vous voyez **Ticket … reçu** avec sa référence.",
                },
              ],
            },
            {
              id: "follow",
              title: "Suivre et répondre",
              steps: [
                {
                  text: "De retour sur **Aide**, les onglets **Tous**, **Ouverts**, **En attente de vous** et **Résolus** filtrent vos tickets. Cliquez sur un ticket pour l'ouvrir.",
                },
                {
                  text: "Lisez les réponses du **Support HEBUZA**, écrivez dans **Votre réponse** et cliquez sur **Envoyer la réponse**. **En attente de vous** signifie que nous attendons votre réponse.",
                },
                {
                  text: "Une fois **Résolu**, notez l'aide reçue sous **Comment avons-nous fait ?** et cliquez sur **Envoyer la note**. Besoin d'autre chose ? Ouvrez un nouveau ticket.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Bona ubufasha kandi utange ikibazo",
          summary:
            "Ubufasha busubiza ibibazo bikunze kubazwa, bukagufasha kwandikira umujyanama no gutanga ibibazo (ikibazo, ikirego, igitekerezo) ukurikirana kandi ugaha amanota.",
          keywords:
            "ubufasha tike ikibazo ikirego igitekerezo ibibazo bikunze kubazwa twandikire gusubiza amanota",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "find",
              title: "Shaka igisubizo",
              steps: [
                {
                  text: "Kanda **Ubufasha** mu rutonde rw'ibumoso. Andika muri **Shakisha mu bufasha** (urugero: gusubizwa, inyandiko, kwishyura).",
                  shot: "client-help",
                  marks: [
                    "Gusubizwa amafaranga",
                    "Shakisha mu bufasha",
                    "Ibibazo bikunze kubazwa",
                    "Tanga ikibazo",
                    "Twandikire",
                  ],
                },
                {
                  text: "Kanda ikibazo kiri munsi ya **Ibibazo bikunze kubazwa** usome igisubizo.",
                },
                {
                  text: "Kuvugana n'umuntu ku busabe, kanda **Andikira umujyanama wawe** muri **Twandikire** (bifungura Ibyo nasabye: hitamo ubusabe, hanyuma **Ubutumwa**). **Uburyo bwo kutwandikira** bwerekana telefoni, imeyili n'ibiro.",
                },
              ],
            },
            {
              id: "ticket",
              title: "Tanga ikibazo",
              steps: [
                {
                  text: "Munsi ya **Ibibazo byanjye**, kanda **Tanga ikibazo**.",
                  shot: "client-help-ticket",
                  marks: [
                    "Ubwoko",
                    "Ubusabe bijyanye",
                    "Umutwe",
                    "Ubutumwa",
                    "Ohereza",
                  ],
                },
                {
                  text: "Hitamo **Ubwoko**: **Ikibazo**, **Ikirego** cyangwa **Igitekerezo**. Ibirego bisubizwa mu minsi 3 y'akazi.",
                },
                {
                  text: "Hitamo **Ubusabe bijyanye** (cyangwa **Ntibijyanye n'ubusabe**), wandike **Umutwe** n'**Ubutumwa** bwawe.",
                },
                {
                  text: "Hitamo **Tugusubize dute?** (**Ku rubuga**, **Imeyili** cyangwa **SMS**) ukande **Ohereza**. Ubona **Ikibazo … cyakiriwe** n'inomero yacyo.",
                },
              ],
            },
            {
              id: "follow",
              title: "Gikurikirane kandi usubize",
              steps: [
                {
                  text: "Ugarutse ku **Ubufasha**, ibice **Byose**, **Bifunguye**, **Bigutegereje** na **Byakemutse** biyungurura ibibazo byawe. Kanda kimwe ugifungure.",
                },
                {
                  text: "Soma ibisubizo bya **Ubufasha bwa HEBUZA**, wandike muri **Igisubizo cyawe** ukande **Ohereza igisubizo**. **Kigutegereje** bisobanura ko dutegereje igisubizo cyawe.",
                },
                {
                  text: "Iyo **Cyakemutse**, tanga amanota munsi ya **Twagufashije dute?** ukande **Ohereza amanota**. Ukeneye ibindi? Tanga ikibazo gishya.",
                },
              ],
            },
          ],
        },
      },
    },
    // 16. Profile and security
    {
      slug: "profile-and-security",
      cat: "account",
      minutes: 4,
      updated: UPDATED,
      pages: ["/settings", "/settings/security"],
      t: {
        en: {
          title: "Update your profile, password and two-step verification",
          summary:
            "Settings → Profile holds your photo, address, name, phone and language. Settings → Security changes your password, turns on two-step verification and signs out other devices.",
          keywords:
            "settings profile name phone number photo address language password change two-step verification 2FA authenticator sessions devices sign out",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes",
            cost: "Free",
          },
          sections: [
            {
              id: "profile",
              title: "Edit your profile",
              steps: [
                {
                  text: "Click **Settings** in the side menu. The **Profile** section opens; the other sections (**Security**, **Notifications**, **Privacy & data**) are in the settings menu.",
                  shot: "client-settings-profile",
                  marks: [
                    "Settings sections",
                    "Choose photo",
                    "Personal details",
                    "Preferred language",
                  ],
                },
                {
                  text: "**Profile photo**: click **Choose photo** (or **Change photo**), check the preview and click **Save photo**. JPG, PNG or WebP up to 5 MB. **Remove photo** deletes it.",
                },
                {
                  text: "**Address**: fill in **Province**, **District**, **Sector**, **Cell** and **Street / house**, then **Save address**. It prefills forms when you allow profile reuse.",
                },
                {
                  text: "**Personal details**: change your **Full name** or **Phone number** (for example 788 123 456) and click **Save changes**. To change your email address, contact us.",
                },
                {
                  text: "**Language**: pick your **Preferred language**. The page switches at once and our messages follow it.",
                },
              ],
            },
            {
              id: "security",
              title: "Password, two-step and devices",
              steps: [
                {
                  text: "In the settings menu, click **Security**.",
                  shot: "client-settings-security",
                  marks: [
                    "Two-step verification",
                    "Change password",
                    "Sign out other devices",
                  ],
                },
                {
                  text: "**Two-step verification**: click **Turn on** and follow the steps with an authenticator app, then **Finish setup**. Keep the backup codes; **Regenerate backup codes** makes new ones. **Turn off** disables it.",
                },
                {
                  text: "**Password**: type your **Current password**, a **New password** (at least 10 characters with a letter and a number) and **Confirm new password**, then click **Change password**.",
                },
                {
                  text: "**Devices and sessions** lists where you are signed in. Click **Sign out** next to a device, or **Sign out all other devices**.",
                },
              ],
              warn: "If you see **Your current password is not correct.**, check the keyboard language and Caps Lock, then type it again.",
            },
          ],
        },
        fr: {
          title: "Modifier profil, mot de passe et vérification en deux étapes",
          summary:
            "Paramètres → Profil contient photo, adresse, nom, téléphone et langue. Paramètres → Sécurité change le mot de passe, active la vérification en deux étapes et déconnecte les autres appareils.",
          keywords:
            "paramètres profil nom téléphone photo adresse langue mot de passe deux étapes 2FA authentificateur sessions appareils déconnecter",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "profile",
              title: "Modifier votre profil",
              steps: [
                {
                  text: "Cliquez sur **Paramètres** dans le menu latéral. La section **Profil** s'ouvre ; les autres (**Sécurité**, **Notifications**, **Confidentialité**) sont dans le menu des paramètres.",
                  shot: "client-settings-profile",
                  marks: [
                    "Sections des paramètres",
                    "Choisir une photo",
                    "Informations personnelles",
                    "Langue préférée",
                  ],
                },
                {
                  text: "**Photo de profil** : cliquez sur **Choisir une photo** (ou **Changer la photo**), vérifiez l'aperçu et cliquez sur **Enregistrer la photo**. JPG, PNG ou WebP, 5 Mo max. **Supprimer la photo** l'efface.",
                },
                {
                  text: "**Adresse** : remplissez **Province**, **District**, **Secteur**, **Cellule** et **Rue / maison**, puis **Enregistrer l'adresse**. Elle préremplit les formulaires si vous autorisez la réutilisation du profil.",
                },
                {
                  text: "**Informations personnelles** : modifiez **Nom complet** ou **Numéro de téléphone** (ex. 788 123 456) et cliquez sur **Enregistrer**. Pour changer d'adresse e-mail, contactez-nous.",
                },
                {
                  text: "**Langue** : choisissez votre **Langue préférée**. La page change aussitôt et nos messages suivent.",
                },
              ],
            },
            {
              id: "security",
              title: "Mot de passe, deux étapes et appareils",
              steps: [
                {
                  text: "Dans le menu des paramètres, cliquez sur **Sécurité**.",
                  shot: "client-settings-security",
                  marks: [
                    "Vérification en deux étapes",
                    "Changer le mot de passe",
                    "Déconnecter les autres appareils",
                  ],
                },
                {
                  text: "**Vérification en deux étapes** : cliquez sur **Activer** et suivez les étapes avec une application d'authentification, puis **Terminer**. Gardez les codes de secours ; **Régénérer les codes de secours** en crée de nouveaux. **Désactiver** l'arrête.",
                },
                {
                  text: "**Mot de passe** : saisissez le **Mot de passe actuel**, un **Nouveau mot de passe** (10 caractères minimum avec une lettre et un chiffre) et **Confirmer le nouveau mot de passe**, puis cliquez sur **Changer le mot de passe**.",
                },
                {
                  text: "**Appareils et sessions** liste où vous êtes connecté. Cliquez sur **Déconnecter** à côté d'un appareil, ou sur **Déconnecter les autres appareils**.",
                },
              ],
              warn: "Si vous voyez **Votre mot de passe actuel est incorrect.**, vérifiez la langue du clavier et la touche Verr. Maj, puis retapez-le.",
            },
          ],
        },
        rw: {
          title:
            "Hindura umwirondoro, ijambobanga no kwemeza mu ntambwe ebyiri",
          summary:
            "Igenamiterere → Umwirondoro ririmo ifoto, aderesi, izina, telefoni n'ururimi. Igenamiterere → Umutekano rihindura ijambobanga, rifungura kwemeza mu ntambwe ebyiri kandi risohora ibindi bikoresho.",
          keywords:
            "igenamiterere umwirondoro izina telefoni ifoto aderesi ururimi ijambobanga intambwe ebyiri ibikoresho sohora",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "profile",
              title: "Hindura umwirondoro wawe",
              steps: [
                {
                  text: "Kanda **Igenamiterere** mu rutonde rw'ibumoso. Igice cy'**Umwirondoro** kirafunguka; ibindi (**Umutekano**, **Ubutumwa**, **Ibanga n'amakuru**) biri mu rutonde rw'igenamiterere.",
                  shot: "client-settings-profile",
                  marks: [
                    "Ibice by'igenamiterere",
                    "Hitamo ifoto",
                    "Umwirondoro",
                    "Ururimi uhitamo",
                  ],
                },
                {
                  text: "**Ifoto y'umwirondoro**: kanda **Hitamo ifoto** (cyangwa **Hindura ifoto**), urebe uko izagaragara ukande **Bika ifoto**. JPG, PNG cyangwa WebP itarenze MB 5. **Kuraho ifoto** irayisiba.",
                },
                {
                  text: "**Aderesi**: uzuza **Intara**, **Akarere**, **Umurenge**, **Akagari** na **Umuhanda / inzu**, hanyuma **Bika aderesi**. Ikoreshwa kuzuza amafishi iyo wemeye gukoresha umwirondoro.",
                },
                {
                  text: "**Umwirondoro**: hindura **Amazina yose** cyangwa **Nimero ya telefoni** (urugero 788 123 456) ukande **Bika impinduka**. Guhindura imeyili, twandikire.",
                },
                {
                  text: "**Ururimi**: hitamo **Ururimi uhitamo**. Paji ihita ihinduka kandi ubutumwa bwacu burarukurikiza.",
                },
              ],
            },
            {
              id: "security",
              title: "Ijambobanga, intambwe ebyiri n'ibikoresho",
              steps: [
                {
                  text: "Mu rutonde rw'igenamiterere, kanda **Umutekano**.",
                  shot: "client-settings-security",
                  marks: [
                    "Kwemeza mu ntambwe ebyiri",
                    "Hindura ijambobanga",
                    "Sohora ibindi bikoresho",
                  ],
                },
                {
                  text: "**Kwemeza mu ntambwe ebyiri**: kanda **Bifungure** ukurikize intambwe ukoresheje porogaramu yo kwemeza, hanyuma **Rangiza**. Bika kode z'ingoboka; **Ongera ukore kode z'ingoboka** ikora inshya. **Bifunge** irabihagarika.",
                },
                {
                  text: "**Ijambobanga**: andika **Ijambobanga usanzwe ukoresha**, **Ijambobanga rishya** (nibura inyuguti 10 zirimo inyuguti n'umubare) na **Emeza ijambobanga rishya**, hanyuma ukande **Hindura ijambobanga**.",
                },
                {
                  text: "**Ibikoresho byinjiye** byerekana aho winjiye. Kanda **Sohora** iruhande rw'igikoresho, cyangwa **Sohora ibindi bikoresho byose**.",
                },
              ],
              warn: "Niba ubonye **Ijambobanga usanzwe ukoresha si ryo.**, reba ururimi rwa mwandikisho na Caps Lock, hanyuma wongere uryandike.",
            },
          ],
        },
      },
    },
    // 17. Privacy and data
    {
      slug: "privacy-and-data",
      cat: "account",
      minutes: 3,
      updated: UPDATED,
      pages: ["/settings/privacy"],
      t: {
        en: {
          title: "Consents, data export and deleting your account",
          summary:
            "Settings → Privacy & data lets you change your consents, get a copy of your data, and delete your account when no request is active.",
          keywords:
            "privacy data consent marketing export copy download delete account close account GDPR retention",
          facts: {
            who: "Every signed-in client",
            time: "2 minutes",
            cost: "Free",
          },
          sections: [
            {
              id: "consents",
              title: "Change your consents",
              steps: [
                {
                  text: "Click **Settings**, then **Privacy & data**. **Your consents** lists each use of your data with a switch.",
                  shot: "client-settings-privacy",
                  marks: ["Your consents", "Request export", "Delete account"],
                },
                {
                  text: "Switch on or off **Offers by email**, **Offers by SMS**, **Offers on WhatsApp**, **Help us improve**, **Reuse my profile in forms** and **Keep my assistant chats**. Each change is saved at once.",
                },
                {
                  text: "**Process my data to deliver services** is **Required while you have open requests**. **Consent history** shows every change with its date.",
                },
              ],
            },
            {
              id: "export",
              title: "Get a copy of your data",
              steps: [
                {
                  text: "Under **Export your data**, click **Request export**. The box shows **Export requested on …**; we prepare it within 30 days and notify you.",
                },
                {
                  text: "When it says **Your export is ready.**, click the link to download it.",
                },
              ],
            },
            {
              id: "delete",
              title: "Delete your account",
              steps: [
                {
                  text: "Under **Delete your account**, click **Delete account**. If it is greyed, you have an active request or a legal hold; the reason is shown.",
                },
                {
                  text: "In **Delete your account?**, tick **I understand the consequences and want to continue.**, enter your password and confirm.",
                },
                {
                  text: "You see **Deletion scheduled.** Your account is deleted 14 days later; sign in before then to cancel.",
                },
              ],
              warn: "Deleting removes your profile and documents. Records the law makes us keep, like receipts, are kept and anonymised.",
            },
          ],
        },
        fr: {
          title: "Consentements, export des données et suppression du compte",
          summary:
            "Paramètres → Confidentialité vous permet de modifier vos consentements, d'obtenir une copie de vos données et de supprimer votre compte s'il n'y a pas de demande en cours.",
          keywords:
            "confidentialité données consentement marketing exporter copie télécharger supprimer compte fermer RGPD conservation",
          facts: {
            who: "Tout client connecté",
            time: "2 minutes",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "consents",
              title: "Modifier vos consentements",
              steps: [
                {
                  text: "Cliquez sur **Paramètres**, puis **Confidentialité**. **Vos consentements** liste chaque usage de vos données avec un interrupteur.",
                  shot: "client-settings-privacy",
                  marks: [
                    "Vos consentements",
                    "Demander l'export",
                    "Supprimer le compte",
                  ],
                },
                {
                  text: "Activez ou coupez **Offres par e-mail**, **Offres par SMS**, **Offres sur WhatsApp**, l'amélioration du service, **Réutiliser mon profil dans les formulaires** et **Conserver mes échanges avec l'assistant**. Chaque changement est enregistré aussitôt.",
                },
                {
                  text: "Le traitement nécessaire au service est **Obligatoire tant que vous avez des demandes en cours**. **Historique des consentements** montre chaque changement daté.",
                },
              ],
            },
            {
              id: "export",
              title: "Obtenir une copie de vos données",
              steps: [
                {
                  text: "Sous **Exporter vos données**, cliquez sur **Demander l'export**. L'encadré indique **Export demandé le …** ; nous le préparons sous 30 jours et vous prévenons.",
                },
                {
                  text: "Quand il affiche **Votre export est prêt.**, cliquez sur le lien pour le télécharger.",
                },
              ],
            },
            {
              id: "delete",
              title: "Supprimer votre compte",
              steps: [
                {
                  text: "Sous **Supprimer votre compte**, cliquez sur **Supprimer le compte**. S'il est grisé, une demande est en cours ou une obligation légale s'applique ; la raison est affichée.",
                },
                {
                  text: "Dans **Supprimer votre compte ?**, cochez **Je comprends les conséquences et je veux continuer.**, saisissez votre mot de passe et confirmez.",
                },
                {
                  text: "Vous voyez **Suppression programmée.** Le compte est supprimé 14 jours plus tard ; reconnectez-vous avant pour annuler.",
                },
              ],
              warn: "La suppression retire votre profil et vos documents. Ce que la loi nous oblige à garder, comme les reçus, est conservé de façon anonyme.",
            },
          ],
        },
        rw: {
          title: "Uburenganzira, gukuramo amakuru no gusiba konti",
          summary:
            "Igenamiterere → Ibanga n'amakuru rigufasha guhindura uburenganzira watanze, kubona kopi y'amakuru yawe no gusiba konti igihe nta busabe bugikorwa.",
          keywords:
            "ibanga amakuru uburenganzira amatangazo kopi kuramo siba konti gufunga konti igihe tubika",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Iminota 2",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "consents",
              title: "Hindura uburenganzira watanze",
              steps: [
                {
                  text: "Kanda **Igenamiterere**, hanyuma **Ibanga n'amakuru**. **Uburenganzira watanze** yerekana buri mikoreshereze y'amakuru yawe ifite buto.",
                  shot: "client-settings-privacy",
                  marks: ["Uburenganzira watanze", "Saba kopi", "Siba konti"],
                },
                {
                  text: "Fungura cyangwa ufunge **Amatangazo kuri imeyili**, **Amatangazo kuri SMS**, **Amatangazo kuri WhatsApp**, kudufasha kunoza serivisi, **Koresha umwirondoro wanjye mu mafishi** na **Bika ibiganiro byanjye n'umufasha**. Buri mpinduka ihita ibikwa.",
                },
                {
                  text: "Gukoresha amakuru kugira ngo tuguhe serivisi **Ni ngombwa igihe ufite ubusabe bugikorwa**. **Amateka y'uruhushya** yerekana buri mpinduka n'itariki.",
                },
              ],
            },
            {
              id: "export",
              title: "Bona kopi y'amakuru yawe",
              steps: [
                {
                  text: "Munsi ya **Kuramo amakuru yawe**, kanda **Saba kopi**. Agasanduku kerekana **Wasabye kopi ku wa …**; tuyitegura mu minsi 30 tukakumenyesha.",
                },
                {
                  text: "Iyo herekana **Kopi yawe iriteguye.**, kanda ihuza uyikuremo.",
                },
              ],
            },
            {
              id: "delete",
              title: "Siba konti yawe",
              steps: [
                {
                  text: "Munsi ya **Siba konti yawe**, kanda **Siba konti**. Niba yijimye, ufite ubusabe bugikorwa cyangwa ihagarikwa ry'amategeko; impamvu irerekanwa.",
                },
                {
                  text: "Muri **Urashaka gusiba konti yawe?**, kanda ku **Ndumva ingaruka kandi ndashaka gukomeza.**, wandike ijambobanga wemeze.",
                },
                {
                  text: "Ubona **Gusiba byateganyijwe.** Konti isibwa nyuma y'iminsi 14; injira mbere y'icyo gihe niba ushaka kubihagarika.",
                },
              ],
              warn: "Gusiba bikuraho umwirondoro wawe n'inyandiko. Ibyo amategeko adusaba kubika, nk'inyemezabwishyu, birabikwa bitagaragaza nyirabyo.",
            },
          ],
        },
      },
    },
    // 18. Guides and the Help button
    {
      slug: "using-guides",
      cat: "start",
      minutes: 1,
      updated: UPDATED,
      pages: ["/dashboard/guides"],
      t: {
        en: {
          title: "Find a guide for any screen",
          summary:
            "The Help button at the top of every dashboard page opens the guides for the screen you are on. Guides in the side menu lists them all.",
          keywords:
            "guides help button question mark how to tutorial instructions manual",
          facts: {
            who: "Every signed-in client",
            time: "1 minute",
            cost: "Free",
          },
          sections: [
            {
              id: "help",
              title: "Help for the page you are on",
              steps: [
                {
                  text: "Click **Help** (the round ? button) at the top of the page.",
                  shot: "client-guides",
                  marks: ["Help button", "Guides in the menu"],
                },
                {
                  text: "A panel opens. **For this page** lists the guides about the screen you are on; **New here? Start with these** shows the first guides to read.",
                  shot: "client-help-panel",
                  marks: ["The guides panel"],
                },
                {
                  text: "Type in the search box (for example pay with MoMo, track, upload) to find any guide.",
                },
                {
                  text: "Click a guide to read it, then **Open the full guide** for the full page with screenshots. **All guides in this dashboard** lists everything.",
                },
              ],
            },
            {
              id: "menu",
              title: "All guides",
              intro:
                "Click **Guides** at the bottom of the side menu to see every dashboard guide by topic.",
            },
          ],
        },
        fr: {
          title: "Trouver un guide pour chaque écran",
          summary:
            "Le bouton Aide en haut de chaque page de votre espace ouvre les guides de l'écran affiché. Guides, dans le menu latéral, les liste tous.",
          keywords:
            "guides aide bouton point d'interrogation comment faire tutoriel mode d'emploi",
          facts: {
            who: "Tout client connecté",
            time: "1 minute",
            cost: "Gratuit",
          },
          sections: [
            {
              id: "help",
              title: "L'aide de la page affichée",
              steps: [
                {
                  text: "Cliquez sur **Aide** (le bouton rond ?) en haut de la page.",
                  shot: "client-guides",
                  marks: ["Bouton Aide", "Guides dans le menu"],
                },
                {
                  text: "Un panneau s'ouvre. **Pour cette page** liste les guides de l'écran affiché ; **Nouveau ? Commencez ici** montre les premiers guides à lire.",
                  shot: "client-help-panel",
                  marks: ["Le panneau des guides"],
                },
                {
                  text: "Tapez dans la recherche (par ex. payer par MoMo, suivre, téléverser) pour trouver n'importe quel guide.",
                },
                {
                  text: "Cliquez sur un guide pour le lire, puis **Ouvrir le guide complet** pour la page avec captures. **Tous les guides de cet espace** liste tout.",
                },
              ],
            },
            {
              id: "menu",
              title: "Tous les guides",
              intro:
                "Cliquez sur **Guides** en bas du menu latéral pour voir tous les guides de votre espace par thème.",
            },
          ],
        },
        rw: {
          title: "Shaka amabwiriza ya buri paji",
          summary:
            "Buto y'Ubufasha iri hejuru kuri buri paji ifungura amabwiriza y'iyo paji uriho. Amabwiriza mu rutonde rw'ibumoso arabyerekana byose.",
          keywords:
            "amabwiriza ubufasha buto akamenyetso k'ikibazo uko bikorwa inyigisho",
          facts: {
            who: "Buri mukiriya winjiye",
            time: "Umunota 1",
            cost: "Ni ubuntu",
          },
          sections: [
            {
              id: "help",
              title: "Ubufasha bw'iyi paji",
              steps: [
                {
                  text: "Kanda **Ubufasha** (buto y'uruziga ifite ?) hejuru ya paji.",
                  shot: "client-guides",
                  marks: ["Buto y'Ubufasha", "Amabwiriza mu rutonde"],
                },
                {
                  text: "Igice kirafunguka. **Kuri iyi paji** yerekana amabwiriza y'iyi paji uriho; **Uri mushya? Tangirira aha** yerekana ayo gusoma mbere.",
                  shot: "client-help-panel",
                  marks: ["Igice cy'amabwiriza"],
                },
                {
                  text: "Andika mu gasanduku ko gushakisha (urugero: kwishyura na MoMo, gukurikirana) ubone amabwiriza ayo ari yo yose.",
                },
                {
                  text: "Kanda amabwiriza uyasome, hanyuma **Fungura amabwiriza yose** urebe paji yuzuye ifite amafoto. **Amabwiriza yose y'iyi konti** arabyerekana byose.",
                },
              ],
            },
            {
              id: "menu",
              title: "Amabwiriza yose",
              intro:
                "Kanda **Amabwiriza** hasi mu rutonde rw'ibumoso urebe amabwiriza yose y'iyi konti ku nsanganyamatsiko.",
            },
          ],
        },
      },
    },
  ],
};

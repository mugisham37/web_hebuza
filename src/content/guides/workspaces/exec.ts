import type { WsGuideSet } from "./index";

// exec dashboard guides. rw/fr are drafts for native review. Shots: scripts/guides/ws-exec.spec.ts.
const U = "2026-11-26";

export const EXEC_WS: WsGuideSet = {
  workspace: "exec",
  cats: [
    {
      key: "numbers",
      t: { en: "The numbers", fr: "Les chiffres", rw: "Imibare" },
    },
    { key: "decide", t: { en: "Decisions", fr: "Décisions", rw: "Ibyemezo" } },
  ],
  guides: [
    {
      slug: "exec-overview",
      cat: "numbers",
      minutes: 2,
      updated: U,
      start: true,
      pages: ["/exec"],
      t: {
        en: {
          title: "Your executive overview",
          summary:
            "One read-only page with the last 30 days of money, cases, bookings, leads and AI spend. Figures refresh every minute.",
          keywords: "executive dashboard overview kpi revenue collections",
          facts: { who: "Senior management" },
          sections: [
            {
              id: "read",
              title: "What's on the page",
              steps: [
                {
                  text: "Open **Overview** in the side menu. The line under the title gives the period: last 30 days up to today.",
                  shot: "exec-overview",
                  marks: [
                    "Money",
                    "Counts",
                    "Ageing and cases",
                    "Open my approvals",
                  ],
                },
                {
                  text: "The top row is money: **Revenue invoiced** (with the all-time total), **Collections** and **Receivables**.",
                },
                {
                  text: "The second row counts **SLA breaches**, **Bookings**, **Lead conversion** and **AI assistant cost**.",
                },
                {
                  text: "Below, **Receivables ageing** and **Cases by status**.",
                },
                {
                  text: "Click **Open my approvals** to decide what waits for you.",
                },
              ],
              tips: [
                "If the page shows an error card, click its retry button; the rest of HEBUZA keeps working.",
              ],
            },
          ],
        },
        fr: {
          title: "Votre vue d'ensemble de direction",
          summary:
            "Une page en lecture seule avec les 30 derniers jours : argent, dossiers, rendez-vous, prospects et coût de l'IA. Les chiffres se mettent à jour chaque minute.",
          keywords:
            "direction tableau de bord indicateurs chiffre d'affaires encaissements",
          facts: { who: "Direction générale" },
          sections: [
            {
              id: "read",
              title: "Ce que montre la page",
              steps: [
                {
                  text: "Ouvrez **Vue d'ensemble** dans le menu latéral. La ligne sous le titre indique la période : les 30 derniers jours.",
                  shot: "exec-overview",
                  marks: [
                    "Argent",
                    "Compteurs",
                    "Ancienneté et dossiers",
                    "Ouvrir mes approbations",
                  ],
                },
                {
                  text: "La première rangée concerne l'argent : **Chiffre d'affaires facturé** (avec le total historique), **Encaissements** et **Créances**.",
                },
                {
                  text: "La deuxième compte **Dépassements de SLA**, **Rendez-vous**, **Conversion des prospects** et **Coût de l'assistant IA**.",
                },
                {
                  text: "En dessous : **Ancienneté des créances** et **Dossiers par statut**.",
                },
                {
                  text: "Cliquez sur **Ouvrir mes approbations** pour décider de ce qui vous attend.",
                },
              ],
              tips: [
                "En cas de carte d'erreur, cliquez sur réessayer ; le reste de HEBUZA continue de fonctionner.",
              ],
            },
          ],
        },
        rw: {
          title: "Incamake y'ubuyobozi",
          summary:
            "Urupapuro rumwe rusomwa gusa rw'iminsi 30 ishize: amafaranga, dosiye, gahunda, abakiriya bashya n'ikiguzi cya AI. Imibare ivugururwa buri munota.",
          keywords: "ubuyobozi incamake imibare amafaranga",
          facts: { who: "Ubuyobozi bukuru" },
          sections: [
            {
              id: "read",
              title: "Ibiri ku rupapuro",
              steps: [
                {
                  text: "Fungura **Incamake** mu rutonde rw'uruhande. Umurongo uri munsi y'umutwe werekana igihe: iminsi 30 ishize.",
                  shot: "exec-overview",
                  marks: [
                    "Amafaranga",
                    "Imibare",
                    "Igihe n'imiterere ya dosiye",
                    "Fungura ibyo ngomba kwemeza",
                  ],
                },
                {
                  text: "Umurongo wa mbere ni amafaranga: **Amafaranga yanditswe ku nyemezabuguzi** (n'igiteranyo cyose), **Amafaranga yinjiye** na **Amafaranga ataraboneka**.",
                },
                {
                  text: "Uwa kabiri ubara **Dosiye zarenze igihe**, **Gahunda zafashwe**, **Abakiriya bashya babonetse** na **Ikiguzi cy'umufasha wa AI**.",
                },
                {
                  text: "Munsi: **Igihe amafaranga ataraboneka amaze** na **Dosiye ukurikije uko zihagaze**.",
                },
                {
                  text: "Kanda **Fungura ibyo ngomba kwemeza** ufate ibyemezo bigutegereje.",
                },
              ],
              tips: [
                "Ikarita y'ikosa nigaragara, kanda ongera ugerageze; ibindi bya HEBUZA birakomeza gukora.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "exec-reading-the-numbers",
      cat: "numbers",
      minutes: 3,
      updated: U,
      start: true,
      pages: ["/exec"],
      t: {
        en: {
          title: "Read the numbers",
          summary:
            "What each figure on the executive overview means and when to act on it.",
          keywords:
            "meaning kpi definitions revenue collections receivables ageing sla conversion",
          sections: [
            {
              id: "money",
              title: "Money",
              steps: [
                {
                  text: "**Revenue invoiced**: what was invoiced in the period. The small line gives the all-time total.",
                },
                {
                  text: "**Collections**: what was actually received. A large gap with revenue means clients owe money.",
                },
                {
                  text: "**Receivables**: what is still owed today. **Receivables ageing** splits it by how long it has been owed; the oldest bucket is the one to chase.",
                },
              ],
            },
            {
              id: "work",
              title: "Work and growth",
              steps: [
                {
                  text: "**SLA breaches**: open cases past their deadline. Shown in red when above zero; ask the service manager about them.",
                },
                {
                  text: "**Bookings**: consultations booked, with how many were completed.",
                },
                {
                  text: "**Lead conversion**: share of leads won, with won / total under it.",
                },
                {
                  text: "**AI assistant cost**: spend in US dollars and number of calls over 30 days.",
                },
                {
                  text: "**Cases by status**: how many cases sit in each status, with the total.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Lire les chiffres",
          summary:
            "Ce que signifie chaque chiffre de la vue d'ensemble et quand agir.",
          keywords:
            "signification indicateurs définitions créances ancienneté SLA conversion",
          sections: [
            {
              id: "money",
              title: "Argent",
              steps: [
                {
                  text: "**Chiffre d'affaires facturé** : ce qui a été facturé sur la période. La petite ligne donne le total historique.",
                },
                {
                  text: "**Encaissements** : ce qui a été réellement reçu. Un grand écart avec le facturé signifie que des clients doivent de l'argent.",
                },
                {
                  text: "**Créances** : ce qui reste dû aujourd'hui. **Ancienneté des créances** les répartit par durée ; la tranche la plus ancienne est à relancer.",
                },
              ],
            },
            {
              id: "work",
              title: "Activité et croissance",
              steps: [
                {
                  text: "**Dépassements de SLA** : dossiers ouverts au-delà de leur échéance. En rouge au-dessus de zéro ; interrogez le responsable de service.",
                },
                {
                  text: "**Rendez-vous** : consultations réservées, dont celles réalisées.",
                },
                {
                  text: "**Conversion des prospects** : part des prospects gagnés, avec gagnés / total.",
                },
                {
                  text: "**Coût de l'assistant IA** : dépense en dollars US et nombre d'appels sur 30 jours.",
                },
                {
                  text: "**Dossiers par statut** : nombre de dossiers par statut, avec le total.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Soma imibare",
          summary:
            "Icyo buri mubare w'incamake usobanura n'igihe ukwiye kugira icyo ukora.",
          keywords: "ibisobanuro imibare amafaranga igihe ntarengwa",
          sections: [
            {
              id: "money",
              title: "Amafaranga",
              steps: [
                {
                  text: "**Amafaranga yanditswe ku nyemezabuguzi**: ayanditswe muri icyo gihe. Umurongo muto werekana igiteranyo cyose.",
                },
                {
                  text: "**Amafaranga yinjiye**: ayakiriwe koko. Itandukaniro rinini bivuze ko abakiriya bafite amadeni.",
                },
                {
                  text: "**Amafaranga ataraboneka**: asigaye kwishyurwa uyu munsi. **Igihe amafaranga ataraboneka amaze** ayagabanya ukurikije igihe; aya kera cyane ni yo akurikiranwa mbere.",
                },
              ],
            },
            {
              id: "work",
              title: "Akazi n'iterambere",
              steps: [
                {
                  text: "**Dosiye zarenze igihe**: dosiye zifunguye zarengeje igihe ntarengwa. Mu mutuku iyo zirenze zeru; baza umuyobozi wa serivisi.",
                },
                { text: "**Gahunda zafashwe**: inama zafashwe, n'izarangiye." },
                {
                  text: "**Abakiriya bashya babonetse**: ijanisha ry'abatsinzwe, n'umubare wabo / bose.",
                },
                {
                  text: "**Ikiguzi cy'umufasha wa AI**: amadolari yakoreshejwe n'umubare w'ibisabwe mu minsi 30.",
                },
                {
                  text: "**Dosiye ukurikije uko zihagaze**: umubare wa dosiye kuri buri miterere, n'igiteranyo.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "exec-approvals",
      cat: "decide",
      minutes: 4,
      updated: U,
      start: true,
      pages: ["/exec/approvals"],
      t: {
        en: {
          title: "Approve what waits for you",
          summary:
            "Procurement approvals above the finance limit, and access or setting changes that need an executive: privileged role grants, separation-of-duties waivers, retention changes, break-glass and production restores.",
          keywords:
            "approve reject procurement purchase request bills renewals role grant waiver break glass",
          sections: [
            {
              id: "proc",
              title: "Procurement approvals",
              steps: [
                {
                  text: "Open **Approvals**. The top section, **Procurement approvals**, has tabs **Requests**, **Bills**, **Exceptions**, **Renewals**, **Settings** and **Overrides**.",
                  shot: "exec-approvals",
                  marks: ["Procurement approvals", "Search changes"],
                },
                {
                  text: "On a card, click **Details** to read it, then **Approve** or **Reject** (write a **Reason**). The toast says **Decision recorded**.",
                },
                {
                  text: "**Override segregation** is only for when no other eligible person exists; it is flagged in the audit log.",
                },
              ],
            },
            {
              id: "changes",
              title: "Access and setting changes",
              steps: [
                {
                  text: "Below, the changes list shows only what an executive approves. Switch **Pending** / **Decided** or search.",
                },
                {
                  text: "Click **Review**. Read **What changes** and the requester's note.",
                  shot: "exec-approval",
                  marks: ["Request details"],
                },
                {
                  text: "Click **Approve**, or **Reject** with a reason of 10+ characters, then **Reject request**.",
                },
              ],
              tips: [
                "Requests nobody decides within 48 hours expire and don't apply.",
              ],
              warn: "Approving a role grant or break-glass gives real access at once. You can never approve your own request.",
            },
          ],
        },
        fr: {
          title: "Approuver ce qui vous attend",
          summary:
            "Les approbations achats au-delà de la limite finance, et les changements d'accès ou de paramètres qui exigent la direction : rôles privilégiés, dérogations, conservation, accès d'urgence et restaurations.",
          keywords:
            "approuver rejeter achats demandes factures renouvellements rôle dérogation",
          sections: [
            {
              id: "proc",
              title: "Approbations achats",
              steps: [
                {
                  text: "Ouvrez **Approbations**. La section du haut, **Approbations achats**, a les onglets **Demandes**, **Factures**, **Dérogations**, **Renouvellements**, **Paramètres** et **Dérogations SoD**.",
                  shot: "exec-approvals",
                  marks: ["Approbations achats", "Recherche"],
                },
                {
                  text: "Sur une carte, cliquez sur **Détails**, puis **Approuver** ou **Refuser** (avec un **Motif**). Le message indique **Décision enregistrée**.",
                },
                {
                  text: "La dérogation à la séparation ne sert que s'il n'existe aucune autre personne habilitée ; elle est signalée au journal d'audit.",
                },
              ],
            },
            {
              id: "changes",
              title: "Changements d'accès et de paramètres",
              steps: [
                {
                  text: "En dessous, la liste ne montre que ce que la direction approuve. Basculez **En attente** / **Décidées** ou cherchez.",
                },
                {
                  text: "Cliquez sur **Examiner**. Lisez **Ce qui change** et la note du demandeur.",
                  shot: "exec-approval",
                  marks: ["Détail de la demande"],
                },
                {
                  text: "Cliquez sur **Approuver**, ou **Rejeter** avec un motif de 10 caractères ou plus, puis **Rejeter la demande**.",
                },
              ],
              tips: [
                "Sans décision en 48 heures, la demande expire et ne s'applique pas.",
              ],
              warn: "Approuver un rôle ou un accès d'urgence donne un accès réel immédiatement. Vous ne pouvez jamais approuver votre propre demande.",
            },
          ],
        },
        rw: {
          title: "Emeza ibigutegereje",
          summary:
            "Ibyemezo by'amasoko birenze imipaka y'imari, n'impinduka z'uburenganzira cyangwa igenamiterere bisaba ubuyobozi: inshingano z'ububasha bwihariye, impushya, igihe amakuru abikwa, uburenganzira bwihutirwa no kugarura production.",
          keywords:
            "emeza anga amasoko ubusabe fagitire ivugurura inshingano uruhushya",
          sections: [
            {
              id: "proc",
              title: "Kwemeza amasoko",
              steps: [
                {
                  text: "Fungura **Ibyemezo**. Igice cyo hejuru, **Kwemeza amasoko**, gifite amatabu **Ubusabe**, **Fagitire**, **Ibidasanzwe**, **Ivugurura**, **Igenamiterere** na **Uruhushya**.",
                  shot: "exec-approvals",
                  marks: ["Kwemeza amasoko", "Shakisha"],
                },
                {
                  text: "Ku ikarita, kanda **Birambuye**, hanyuma **Emeza** cyangwa **Anga** (wandike **Impamvu**). Ubutumwa buvuga **Icyemezo cyanditswe**.",
                },
                {
                  text: "Kurenga itandukanywa ry'inshingano bikorwa gusa iyo nta wundi wemerewe uhari; byandikwa mu gitabo cy'igenzura.",
                },
              ],
            },
            {
              id: "changes",
              title: "Impinduka z'uburenganzira n'igenamiterere",
              steps: [
                {
                  text: "Munsi, urutonde rwerekana gusa ibyo ubuyobozi bwemeza. Hindura **Bitegereje** / **Byafashweho icyemezo** cyangwa ushakishe.",
                },
                {
                  text: "Kanda **Suzuma**. Soma **Igihinduka** n'icyo usaba yanditse.",
                  shot: "exec-approval",
                  marks: ["Ibisobanuro by'ubusabe"],
                },
                {
                  text: "Kanda **Emeza**, cyangwa **Anga** n'impamvu y'inyuguti 10+, hanyuma **Anga ubusabe**.",
                },
              ],
              tips: [
                "Ubusabe budafatiwe icyemezo mu masaha 48 burarangira ntibukore.",
              ],
              warn: "Kwemeza inshingano cyangwa uburenganzira bwihutirwa bihita bitanga uburenganzira nyabwo. Ntushobora kwemeza ubusabe bwawe.",
            },
          ],
        },
      },
    },
    {
      slug: "exec-targets",
      cat: "numbers",
      minutes: 2,
      updated: U,
      pages: ["/exec/targets"],
      t: {
        en: {
          title: "Set report targets",
          summary:
            "Monthly targets per report metric. Reports scale them to the period and show green, amber or red.",
          keywords: "targets goals kpi monthly green amber red",
          sections: [
            {
              id: "set",
              title: "Add or change a target",
              steps: [
                {
                  text: "Open **Targets**.",
                  shot: "exec-targets",
                  marks: ["Report", "Metric", "Monthly target", "Save target"],
                },
                {
                  text: "Pick the **Report**, then the **Metric** (the list follows the report).",
                },
                {
                  text: "Type the **Monthly target** (whole number) and choose **Good when**: **at or above target** or **at or below target**.",
                },
                {
                  text: "Click **Save target**. It appears in the table; saving the same report and metric again replaces it.",
                },
                { text: "To drop a target, click **Remove** on its row." },
              ],
            },
          ],
        },
        fr: {
          title: "Fixer les objectifs des rapports",
          summary:
            "Objectifs mensuels par indicateur. Les rapports les ramènent à la période et affichent vert, orange ou rouge.",
          keywords: "objectifs indicateurs mensuel vert orange rouge",
          sections: [
            {
              id: "set",
              title: "Ajouter ou modifier un objectif",
              steps: [
                {
                  text: "Ouvrez **Objectifs**.",
                  shot: "exec-targets",
                  marks: [
                    "Rapport",
                    "Indicateur",
                    "Objectif mensuel",
                    "Enregistrer",
                  ],
                },
                { text: "Choisissez le **Rapport**, puis l'**Indicateur**." },
                {
                  text: "Saisissez l'**Objectif mensuel** (nombre entier) et **Bon quand** : **au-dessus ou égal** ou **en dessous ou égal**.",
                },
                {
                  text: "Cliquez sur **Enregistrer**. L'objectif apparaît dans le tableau ; le même rapport et indicateur le remplace.",
                },
                {
                  text: "Pour supprimer, cliquez sur **Retirer** sur la ligne.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Shyiraho intego za raporo",
          summary:
            "Intego za buri kwezi kuri buri gipimo. Raporo zizihuza n'igihe zikerekana icyatsi, umuhondo cyangwa umutuku.",
          keywords: "intego ibipimo ukwezi icyatsi umuhondo umutuku",
          sections: [
            {
              id: "set",
              title: "Ongeraho cyangwa uhindure intego",
              steps: [
                {
                  text: "Fungura **Intego**.",
                  shot: "exec-targets",
                  marks: [
                    "Raporo",
                    "Igipimo",
                    "Intego y'ukwezi",
                    "Bika intego",
                  ],
                },
                { text: "Hitamo **Raporo**, hanyuma **Igipimo**." },
                {
                  text: "Andika **Intego y'ukwezi** (umubare wuzuye) uhitemo **Ni byiza iyo**: **bingana cyangwa birenze** cyangwa **bingana cyangwa biri munsi**.",
                },
                {
                  text: "Kanda **Bika intego**. Igaragara mu mbonerahamwe; raporo n'igipimo bimwe biyisimbuza.",
                },
                { text: "Kuyikuraho, kanda **Kuraho** ku murongo wayo." },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "exec-reports",
      cat: "numbers",
      minutes: 1,
      updated: U,
      pages: ["/exec/reports"],
      t: {
        en: {
          title: "Reports",
          summary:
            "The executive Reports page is still being built. Until it ships, use the Overview and Targets.",
          keywords: "reports placeholder coming soon",
          sections: [
            {
              id: "now",
              title: "What you can use today",
              steps: [
                {
                  text: "Open **Reports**: it shows **This area is being built.**",
                  shot: "exec-reports",
                  marks: ["Reports"],
                },
                {
                  text: "For the figures, use **Overview**; to set what “good” looks like, use **Targets**.",
                },
                {
                  text: "As Senior management you may also open the marketing reports and campaigns pages and the finance approvals inbox when a colleague sends you a link, without holding those roles.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Rapports",
          summary:
            "La page Rapports de la direction est en construction. En attendant, utilisez la Vue d'ensemble et les Objectifs.",
          keywords: "rapports bientôt",
          sections: [
            {
              id: "now",
              title: "Ce qui est disponible",
              steps: [
                {
                  text: "Ouvrez **Rapports** : la page indique **Cet espace est en construction.**",
                  shot: "exec-reports",
                  marks: ["Rapports"],
                },
                {
                  text: "Pour les chiffres, utilisez **Vue d'ensemble** ; pour fixer les objectifs, **Objectifs**.",
                },
                {
                  text: "En tant que Direction générale, vous pouvez aussi ouvrir les rapports et campagnes marketing et les approbations finance via un lien d'un collègue, sans ces rôles.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Raporo",
          summary:
            "Urupapuro rwa Raporo rw'ubuyobozi ruracyubakwa. Hagati aho koresha Incamake n'Intego.",
          keywords: "raporo biraza",
          sections: [
            {
              id: "now",
              title: "Ibiboneka ubu",
              steps: [
                {
                  text: "Fungura **Raporo**: herekana **Iki gice kirimo kubakwa.**",
                  shot: "exec-reports",
                  marks: ["Raporo"],
                },
                {
                  text: "Imibare iri muri **Incamake**; intego zishyirwaho muri **Intego**.",
                },
                {
                  text: "Nk'Ubuyobozi bukuru, ushobora no gufungura raporo n'ubukangurambaga by'iyamamaza n'ibyemezo by'imari ukoresheje umurongo wohererejwe na mugenzi wawe, nta zindi nshingano.",
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

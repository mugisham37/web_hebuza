import type { WsGuideSet } from "./index";

// work dashboard guides. rw/fr are drafts for native review.
const U = "2026-11-26";

export const WORK_WS: WsGuideSet = {
  workspace: "work",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "jobs",
      t: {
        en: "Offers & jobs",
        fr: "Offres et missions",
        rw: "Akazi wahawe n'imirimo",
      },
    },
    { key: "comms", t: { en: "Messages", fr: "Messages", rw: "Ubutumwa" } },
    {
      key: "field",
      t: { en: "Field visits", fr: "Visites terrain", rw: "Ingendo z'akazi" },
    },
    {
      key: "money",
      t: {
        en: "Earnings & contract",
        fr: "Revenus et contrat",
        rw: "Ibyo winjije n'amasezerano",
      },
    },
    {
      key: "account",
      t: {
        en: "Profile & team",
        fr: "Profil et équipe",
        rw: "Umwirondoro n'itsinda",
      },
    },
  ],
  guides: [
    // ------------------------------------------------------------------ start
    {
      slug: "work-onboarding",
      cat: "start",
      minutes: 10,
      updated: U,
      start: true,
      pages: ["/work/onboarding", "/work"],
      t: {
        en: {
          title: "Complete your onboarding and get cleared",
          summary:
            "Verify your identity, add credentials, sign your agreements and submit so HEBUZA can clear you for offers.",
          facts: {
            who: "External agents and firm members",
            time: "About 25 minutes, then a few working days for verification",
            need: [
              "National ID or passport (photo or PDF, max 10 MB)",
              "Your professional credentials with expiry dates",
              "MTN MoMo, Airtel Money or bank details, and your TIN if you have one",
            ],
          },
          keywords:
            "onboarding verification identity selfie credentials nda sla agreement tin cleared",
          sections: [
            {
              id: "steps",
              title: "Fill the six steps",
              intro:
                "Until you are cleared, the top banner links to the next onboarding step. Work saves as you go.",
              steps: [
                {
                  text: "Open the banner link or **Continue onboarding** on **Home**. The step list shows each step's state (**To do**, **In progress**, **Ready**).",
                  shot: "work-onboarding",
                  marks: [""],
                },
                {
                  text: "**Identity (ID + selfie)**: choose the **ID type**, enter the **ID number**, then **Upload** or **Take a photo** for **ID, front**, **ID, back** and **Selfie**. Click **Save & continue**.",
                },
                {
                  text: "**Professional credentials**: click **Add credential**, fill **Type**, **Credential name**, **Issuer**, **Expires on** and **Services it covers**, attach the file and click **Submit for review**.",
                },
                {
                  text: "**NDA, SLA & service agreement**: read each document to the end, tick **I have read and agree to these terms**, type your name in **Type your full name to sign** and click **Sign**.",
                },
                {
                  text: "**Payout details & TIN**: choose the **Payout method**, fill the number or account, **Account name** and **TIN** (optional).",
                },
                {
                  text: "**Services & availability**: pick your **Services**, **Working days** and **Maximum active jobs**.",
                },
              ],
            },
            {
              id: "submit",
              title: "Submit",
              steps: [
                {
                  text: "On **Review & submit**, check each item; click **Edit** to go back to one.",
                },
                {
                  text: "Click **Submit for verification**. Status becomes **Pending verification** and editing is locked until HEBUZA responds.",
                },
                {
                  text: "When cleared you see **You're cleared!**. Click **View available offers**.",
                },
              ],
              warn: "You can't accept offers or upload client work until you are cleared. Each service needs a verified credential.",
              faq: [
                {
                  q: "HEBUZA asked for changes.",
                  a: "Status shows **Changes requested**. Fix the highlighted items and submit again.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Terminer votre intégration et être habilité",
          summary:
            "Vérifiez votre identité, ajoutez vos justificatifs, signez vos accords et envoyez pour être habilité aux offres.",
          facts: {
            who: "Agents externes et membres de cabinet",
            time: "Environ 25 minutes, puis quelques jours ouvrés de vérification",
            need: [
              "Carte d'identité ou passeport (photo ou PDF, 10 Mo max.)",
              "Vos justificatifs professionnels avec date d'expiration",
              "MTN MoMo, Airtel Money ou banque, et votre NIF si vous en avez un",
            ],
          },
          keywords:
            "intégration vérification identité selfie justificatifs nda sla nif habilité",
          sections: [
            {
              id: "steps",
              title: "Remplir les six étapes",
              intro:
                "Tant que vous n'êtes pas habilité, le bandeau du haut mène à l'étape suivante. Tout s'enregistre au fur et à mesure.",
              steps: [
                {
                  text: "Ouvrez le lien du bandeau ou **Continuer l'intégration** sur **Accueil**. La liste indique l'état de chaque étape.",
                  shot: "work-onboarding",
                  marks: [""],
                },
                {
                  text: "**Identité (pièce + selfie)** : **Type de pièce**, **Numéro de pièce**, puis **Téléverser** ou **Prendre une photo** pour **Pièce, recto**, **Pièce, verso** et **Selfie**. Cliquez sur **Enregistrer et continuer**.",
                },
                {
                  text: "**Justificatifs professionnels** : **Ajouter un justificatif**, remplissez **Type**, **Intitulé**, **Émetteur**, **Expire le**, **Services couverts**, joignez le fichier et **Envoyer pour examen**.",
                },
                {
                  text: "**NDA, SLA et contrat de service** : lisez jusqu'au bout, cochez **J'ai lu et j'accepte ces conditions**, tapez votre nom dans **Tapez votre nom complet pour signer** puis **Signer**.",
                },
                {
                  text: "**Versement et NIF** : **Mode de versement**, numéro ou compte, **Titulaire du compte** et **NIF** (facultatif).",
                },
                {
                  text: "**Services et disponibilités** : **Services**, **Jours de travail** et **Dossiers actifs maximum**.",
                },
              ],
            },
            {
              id: "submit",
              title: "Envoyer",
              steps: [
                {
                  text: "Sur **Vérifier et envoyer**, contrôlez chaque élément ; **Modifier** y revient.",
                },
                {
                  text: "Cliquez sur **Envoyer pour vérification**. Le statut passe à **En attente de vérification** ; la modification est verrouillée.",
                },
                { text: "Une fois habilité, cliquez sur **Voir les offres**." },
              ],
              warn: "Sans habilitation, impossible d'accepter des offres ou de téléverser du travail client. Chaque service exige un justificatif vérifié.",
              faq: [
                {
                  q: "HEBUZA demande des modifications.",
                  a: "Corrigez les éléments en surbrillance et renvoyez.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Rangiza kwiyandikisha kandi wemezwe",
          summary:
            "Emeza umwirondoro, ongeraho ibyangombwa, usinye amasezerano wohereze kugira ngo HEBUZA ikwemerere akazi.",
          facts: {
            who: "Abakozi bo hanze n'abanyamuryango b'ibigo",
            time: "Iminota nka 25, hanyuma iminsi mike y'akazi yo gusuzuma",
            need: [
              "Indangamuntu cyangwa pasiporo (ifoto cyangwa PDF, MB 10)",
              "Ibyangombwa by'umwuga n'amatariki birangiriraho",
              "MTN MoMo, Airtel Money cyangwa banki, na TIN niba uyifite",
            ],
          },
          keywords:
            "kwiyandikisha kwemezwa indangamuntu ifoto ibyangombwa nda sla tin",
          sections: [
            {
              id: "steps",
              title: "Uzuza intambwe esheshatu",
              intro:
                "Mbere yo kwemezwa, itangazo ryo hejuru rikujyana ku ntambwe ikurikira. Byose bibikwa uko ukomeza.",
              steps: [
                {
                  text: "Kanda umuyoboro w'itangazo cyangwa **Komeza kwiyandikisha** kuri **Ahabanza**. Urutonde rwerekana uko buri ntambwe ihagaze.",
                  shot: "work-onboarding",
                  marks: [""],
                },
                {
                  text: "**Umwirondoro (indangamuntu + ifoto)**: **Ubwoko bw'icyangombwa**, **Nomero y'icyangombwa**, hanyuma **Ohereza** cyangwa **Fata ifoto** kuri **Indangamuntu, imbere**, **Indangamuntu, inyuma** na **Ifoto yawe**. Kanda **Bika ukomeze**.",
                },
                {
                  text: "**Ibyangombwa by'umwuga**: **Ongeraho icyangombwa**, uzuza **Ubwoko**, **Izina ry'icyangombwa**, **Uwagitanze**, **Kirangira ku wa**, **Serivisi kireba**, omeka dosiye ukande **Ohereza gisuzumwe**.",
                },
                {
                  text: "**NDA, SLA n'amasezerano y'akazi**: soma kugeza ku iherezo, hitamo **Nasomye kandi nemeye aya mabwiriza**, andika amazina muri **Andika amazina yawe yose kugira ngo usinye** ukande **Sinya**.",
                },
                {
                  text: "**Uburyo bwo kwishyurwa na TIN**: **Uburyo**, nimero cyangwa konti, **Izina riri kuri konti** na **TIN** (si ngombwa).",
                },
                {
                  text: "**Serivisi n'igihe uboneka**: **Serivisi**, **Iminsi y'akazi** n'**Umubare ntarengwa w'akazi icyarimwe**.",
                },
              ],
            },
            {
              id: "submit",
              title: "Ohereza",
              steps: [
                {
                  text: "Kuri **Suzuma wohereze**, genzura buri kintu; **Hindura** igusubiza aho.",
                },
                {
                  text: "Kanda **Ohereza isuzumwe**. Uko uhagaze kuba gutegereje gusuzumwa; ntushobora guhindura kugeza HEBUZA isubije.",
                },
                { text: "Wemejwe, kanda **Reba akazi gahari**." },
              ],
              warn: "Mbere yo kwemezwa ntushobora kwemera akazi cyangwa kohereza ibikorwa by'umukiriya. Buri serivisi isaba icyangombwa cyemejwe.",
              faq: [
                {
                  q: "HEBUZA yasabye impinduka.",
                  a: "Kosora ibyagaragajwe wongere wohereze.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "work-home",
      cat: "start",
      minutes: 3,
      updated: U,
      start: true,
      pages: ["/work"],
      t: {
        en: {
          title: "Read your Home screen",
          summary:
            "Your waiting offers, active jobs, last payout and next steps at a glance.",
          keywords: "home dashboard tiles next steps status banner",
          sections: [
            {
              id: "home",
              title: "What you see",
              steps: [
                {
                  text: "Open **Home**. Three tiles show **Offers waiting**, **Active jobs** and **Last payout (net)**. Click a tile to open it.",
                  shot: "work-home",
                  marks: ["Tiles", "Help"],
                },
                {
                  text: "**Offers for you** lists the newest offers. Click one, or **View all offers**.",
                },
                {
                  text: "**Your next steps** lists what needs you: review offers, renew your contract, settle your licence fee or renew a credential.",
                },
                {
                  text: "A banner at the top warns when onboarding, your contract or a credential needs action; click its button to fix it.",
                },
              ],
              tips: [
                "No offers? Click **Update your profile** and make sure services, rates and availability are complete.",
              ],
            },
          ],
        },
        fr: {
          title: "Lire votre écran Accueil",
          summary:
            "Offres en attente, dossiers actifs, dernier versement et prochaines étapes en un coup d'œil.",
          keywords: "accueil tableau de bord tuiles étapes bandeau",
          sections: [
            {
              id: "home",
              title: "Ce que vous voyez",
              steps: [
                {
                  text: "Ouvrez **Accueil**. Trois tuiles : **Offres en attente**, **Dossiers actifs** et **Dernier versement (net)**.",
                  shot: "work-home",
                  marks: ["Tuiles", "Aide"],
                },
                {
                  text: "**Offres pour vous** liste les dernières offres. Cliquez-en une, ou **Voir toutes les offres**.",
                },
                {
                  text: "**Prochaines étapes** liste ce qui vous attend : offres, contrat, redevance ou justificatif.",
                },
                {
                  text: "Un bandeau avertit si l'intégration, le contrat ou un justificatif demande une action.",
                },
              ],
              tips: [
                "Pas d'offres ? **Mettre à jour mon profil** : services, tarifs et disponibilités complets.",
              ],
            },
          ],
        },
        rw: {
          title: "Soma urupapuro rw'Ahabanza",
          summary:
            "Akazi gategereje, akazi uri gukora, ubwishyu buheruka n'intambwe zikurikira.",
          keywords: "ahabanza udusanduku intambwe itangazo",
          sections: [
            {
              id: "home",
              title: "Ibyo ubona",
              steps: [
                {
                  text: "Fungura **Ahabanza**. Udusanduku dutatu: **Akazi gategereje**, **Akazi uri gukora** na **Ubwishyu buheruka (net)**.",
                  shot: "work-home",
                  marks: ["Udusanduku", "Ubufasha"],
                },
                {
                  text: "**Akazi wahawe** kerekana akazi gashya. Kanda kamwe, cyangwa **Reba akazi kose**.",
                },
                {
                  text: "**Intambwe zikurikira** zerekana ibigutegereje: akazi, amasezerano, uruhushya cyangwa icyangombwa.",
                },
                {
                  text: "Itangazo ryo hejuru rikuburira iyo kwiyandikisha, amasezerano cyangwa icyangombwa bikeneye igikorwa.",
                },
              ],
              tips: [
                "Nta kazi? Kanda **Vugurura porofili** urebe ko serivisi, ibiciro n'igihe uboneka byuzuye.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "work-help",
      cat: "start",
      minutes: 2,
      updated: U,
      start: true,
      pages: ["/work/guides", "/work"],
      t: {
        en: {
          title: "Find help with the ? button",
          summary:
            "Open the guides for the screen you are on, or browse every guide on the Guides page.",
          keywords: "help guides ? search",
          sections: [
            {
              id: "help",
              title: "Open help",
              steps: [
                {
                  text: "Click **Help** (the **?** in the top bar). The **Guides** panel opens with guides for this screen first.",
                  shot: "work-help",
                  marks: ["Guides panel"],
                },
                {
                  text: "Search by task, for example “counter-propose” or “invoice”. Click a guide to read it; **Back** returns to the list.",
                },
                {
                  text: "Click **Guides** in the side menu to browse all guides by topic.",
                  shot: "work-guides",
                  marks: ["Guides"],
                },
              ],
            },
          ],
        },
        fr: {
          title: "Trouver de l'aide avec le bouton ?",
          summary:
            "Ouvrez les guides de l'écran courant ou parcourez-les tous sur la page Guides.",
          keywords: "aide guides ? recherche",
          sections: [
            {
              id: "help",
              title: "Ouvrir l'aide",
              steps: [
                {
                  text: "Cliquez sur **Aide** (le **?** en haut). Le panneau **Guides** s'ouvre avec les guides de l'écran en premier.",
                  shot: "work-help",
                  marks: ["Panneau Guides"],
                },
                {
                  text: "Cherchez par tâche, par ex. « échéance » ou « facture ». **Retour** ramène à la liste.",
                },
                {
                  text: "**Guides** dans le menu latéral liste tous les guides par thème.",
                  shot: "work-guides",
                  marks: ["Guides"],
                },
              ],
            },
          ],
        },
        rw: {
          title: "Shaka ubufasha ukoresheje akabuto ?",
          summary:
            "Fungura amabwiriza y'urupapuro uriho, cyangwa urebe yose ku rupapuro rw'Amabwiriza.",
          keywords: "ubufasha amabwiriza ? gushakisha",
          sections: [
            {
              id: "help",
              title: "Fungura ubufasha",
              steps: [
                {
                  text: "Kanda **Ubufasha** (**?** hejuru). **Amabwiriza** afunguka, ay'uru rupapuro aza mbere.",
                  shot: "work-help",
                  marks: ["Amabwiriza"],
                },
                {
                  text: "Shakisha ukoresheje igikorwa, urugero « itariki » cyangwa « fagitire ». **Subira inyuma** igusubiza ku rutonde.",
                },
                {
                  text: "**Amabwiriza** mu rutonde rw'ibumoso yerekana yose.",
                  shot: "work-guides",
                  marks: ["Amabwiriza"],
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "work-offers",
      cat: "jobs",
      minutes: 5,
      updated: U,
      start: true,
      pages: ["/work/offers", "/work"],
      t: {
        en: {
          title: "Accept, decline or counter-propose an offer",
          summary:
            "How offers reach you, how to answer before the timer ends, and how to ask for a later deadline.",
          facts: {
            who: "Cleared external agents",
            time: "Before the offer expires",
          },
          keywords:
            "offer accept decline counter-propose deadline timer conflict expired",
          sections: [
            {
              id: "read",
              title: "Read the offer",
              steps: [
                {
                  text: "Open **Offers**. Tabs **Pending**, **Accepted**, **Declined**, **Expired**.",
                  shot: "work-offers",
                  marks: ["Tabs"],
                },
                {
                  text: "Each card shows what you will earn, the items shared and the time left. Click **View details** for the **Brief excerpt** and **Deadline**.",
                },
              ],
              tips: [
                "Unanswered offers lower your match score: answer in time.",
              ],
            },
            {
              id: "accept",
              title: "Accept or decline",
              steps: [
                {
                  text: "Click **Accept**, choose **No conflict** and click **Accept offer**. The job appears in **Jobs**.",
                },
                {
                  text: "If you have a conflict, pick it, explain, and click **Declare & return to manager**.",
                },
                {
                  text: "To refuse, click **Decline**, choose a reason and click **Decline offer**.",
                },
              ],
              warn: "If **Accept** is unavailable with **Not cleared for this service, renew the credential to accept.**, upload a renewal under **Profile** → **Credentials**.",
            },
            {
              id: "counter",
              title: "Counter-propose a deadline",
              steps: [
                {
                  text: "Click **Counter-propose deadline**.",
                },
                {
                  text: "Pick a **New deadline** after the current one and give a **Reason**. Click **Send counter-proposal**.",
                },
                {
                  text: "The card shows **Timer paused** while your manager decides, then whether your date was accepted or the original kept.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Accepter, refuser ou proposer une autre échéance",
          summary:
            "Comment arrivent les offres, comment répondre à temps et demander une échéance plus tardive.",
          facts: {
            who: "Agents externes habilités",
            time: "Avant l'expiration de l'offre",
          },
          keywords: "offre accepter refuser échéance délai conflit expirée",
          sections: [
            {
              id: "read",
              title: "Lire l'offre",
              steps: [
                {
                  text: "Ouvrez **Offres**. Onglets **En attente**, **Acceptées**, **Refusées**, **Expirées**.",
                  shot: "work-offers",
                  marks: ["Onglets"],
                },
                {
                  text: "Chaque carte indique votre rémunération, les éléments partagés et le temps restant. **Voir les détails** montre l'**Extrait du brief** et l'**Échéance**.",
                },
              ],
              tips: [
                "Les offres sans réponse baissent votre score : répondez à temps.",
              ],
            },
            {
              id: "accept",
              title: "Accepter ou refuser",
              steps: [
                {
                  text: "Cliquez sur **Accepter**, choisissez **Aucun conflit** puis **Accepter l'offre**. La mission apparaît dans **Missions**.",
                },
                {
                  text: "En cas de conflit, choisissez-le, expliquez et cliquez sur **Déclarer et renvoyer au responsable**.",
                },
                {
                  text: "Pour refuser : **Refuser**, un motif, puis **Refuser l'offre**.",
                },
              ],
              warn: "Si **Accepter** est bloqué faute d'habilitation pour ce service, téléversez un renouvellement dans **Profil** → **Justificatifs**.",
            },
            {
              id: "counter",
              title: "Proposer une autre échéance",
              steps: [
                {
                  text: "Cliquez sur **Proposer une autre échéance**.",
                },
                {
                  text: "Choisissez une **Nouvelle échéance** après l'actuelle et un **Motif**. Cliquez sur **Envoyer**.",
                },
                {
                  text: "La carte affiche **Délai suspendu** pendant la décision, puis le résultat.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kwemera, kwanga cyangwa gusaba indi tariki",
          summary:
            "Uko akazi kakugeraho, uko wasubiza mbere y'uko igihe kirangira, n'uko wasaba itariki itinze.",
          facts: {
            who: "Abakozi bo hanze bemejwe",
            time: "Mbere y'uko akazi karangira",
          },
          keywords: "akazi emera anga indi tariki igihe",
          sections: [
            {
              id: "read",
              title: "Soma akazi",
              steps: [
                {
                  text: "Fungura **Ibyo wahawe**. Ibice **Bitegereje**, **Byemewe**, **Byanzwe**, **Byarangiye**.",
                  shot: "work-offers",
                  marks: ["Ibice"],
                },
                {
                  text: "Buri karita yerekana ayo uzinjiza, ibyasangijwe n'igihe gisigaye. **Reba ibisobanuro** yerekana **Igice cy'amabwiriza** n'**Itariki ntarengwa**.",
                },
              ],
              tips: ["Akazi udasubije kagabanya amanota yawe: subiza ku gihe."],
            },
            {
              id: "accept",
              title: "Kwemera cyangwa kwanga",
              steps: [
                {
                  text: "Kanda **Emera**, hitamo **Nta nyungu zivuguruzanya** ukande **Emera icyifuzo**. Akazi kaza muri **Imirimo**.",
                },
                {
                  text: "Niba hari inyungu zivuguruzanya, zihitemo, usobanure ukande **Tangaza kandi usubize umuyobozi**.",
                },
                {
                  text: "Kwanga: **Anga**, impamvu, hanyuma **Anga icyifuzo**.",
                },
              ],
              warn: "Niba **Emera** idakora kubera serivisi utemerewe, ohereza icyavuguruwe muri **Umwirondoro** → **Ibyangombwa**.",
            },
            {
              id: "counter",
              title: "Saba indi tariki",
              steps: [
                {
                  text: "Kanda **Saba indi tariki**.",
                },
                {
                  text: "Hitamo **Tariki nshya** iri nyuma y'iriho n'**Impamvu**. Kanda **Ohereza**.",
                },
                {
                  text: "Ikarita yerekana **Igihe cyahagaze** mu gihe umuyobozi afata icyemezo, hanyuma igisubizo.",
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ jobs
    {
      slug: "work-jobs",
      cat: "jobs",
      minutes: 5,
      updated: U,
      pages: ["/work/jobs"],
      t: {
        en: {
          title: "Work a job: brief, shared documents, access",
          summary:
            "Open a job, read the instructions, use only what is shared with you, and request more access or hand the job back.",
          keywords:
            "jobs brief shared documents request access watermark download hand back instructions",
          sections: [
            {
              id: "open",
              title: "Open a job",
              steps: [
                {
                  text: "Open **Jobs**. Use the views and search to find it, then click the row.",
                  shot: "work-jobs",
                  marks: ["Views"],
                },
                {
                  text: "Tabs: **Brief**, **Documents**, **Conversation**, **Deliverables**, **Timeline**, **Earnings**.",
                  shot: "work-job-brief",
                  marks: [
                    "Tabs",
                    "Change status",
                    "Propose new date",
                    "External outcome",
                  ],
                },
                {
                  text: "On **Brief**, read the instructions; **Version history** shows earlier versions. **Agreed earning** shows what you will be paid.",
                },
              ],
            },
            {
              id: "docs",
              title: "Shared documents and access",
              steps: [
                {
                  text: "**Documents** shows only items **Shared with you**. Click **Download**; downloads are watermarked and logged.",
                },
                {
                  text: "Need more? Click **Request access**, choose a **Reason**, add a note and click **Send request**. Your manager decides.",
                },
              ],
              tips: ["Access ends when the job closes."],
            },
            {
              id: "handback",
              title: "Hand a job back",
              steps: [
                { text: "Click **More actions** → **Hand back**." },
                {
                  text: "Answer **Why are you handing it back?**, add a note and click **Hand back**. The job becomes read-only until it is reassigned.",
                },
              ],
              warn: "Handing back cannot be undone from your side; your manager reassigns the job.",
            },
          ],
        },
        fr: {
          title: "Traiter une mission : brief, documents partagés, accès",
          summary:
            "Ouvrez une mission, lisez les instructions, utilisez seulement ce qui est partagé, demandez un accès ou rendez la mission.",
          keywords:
            "missions brief documents partagés accès filigrane télécharger rendre",
          sections: [
            {
              id: "open",
              title: "Ouvrir une mission",
              steps: [
                {
                  text: "Ouvrez **Missions**. Utilisez les vues et la recherche, puis cliquez sur la ligne.",
                  shot: "work-jobs",
                  marks: ["Vues"],
                },
                {
                  text: "Onglets : **Résumé**, **Documents**, **Conversation**, **Livrables**, **Historique**, **Revenus**.",
                  shot: "work-job-brief",
                  marks: [
                    "Onglets",
                    "Changer le statut",
                    "Proposer une date",
                    "Résultat externe",
                  ],
                },
                {
                  text: "Dans **Résumé**, lisez les instructions ; **Historique** montre les versions. **Rémunération convenue** indique votre paiement.",
                },
              ],
            },
            {
              id: "docs",
              title: "Documents et accès",
              steps: [
                {
                  text: "**Documents** ne montre que ce qui est **Partagé avec vous**. **Télécharger** : filigrané et journalisé.",
                },
                {
                  text: "Besoin de plus ? **Demander l'accès**, un **Motif**, une note, puis **Envoyer la demande**.",
                },
              ],
              tips: ["L'accès prend fin à la clôture de la mission."],
            },
            {
              id: "handback",
              title: "Rendre une mission",
              steps: [
                {
                  text: "Cliquez sur **Plus d'actions** → **Rendre le dossier**.",
                },
                {
                  text: "Répondez à **Pourquoi le rendez-vous ?**, ajoutez une note et cliquez sur **Rendre**. La mission passe en lecture seule.",
                },
              ],
              warn: "Vous ne pouvez pas annuler un rendu ; votre manager réattribue la mission.",
            },
          ],
        },
        rw: {
          title: "Gukora akazi: incamake, inyandiko zasangijwe, uburenganzira",
          summary:
            "Fungura akazi, usome amabwiriza, ukoreshe ibyasangijwe gusa, usabe uburenganzira cyangwa usubize akazi.",
          keywords:
            "imirimo incamake inyandiko uburenganzira kuramo subiza akazi",
          sections: [
            {
              id: "open",
              title: "Fungura akazi",
              steps: [
                {
                  text: "Fungura **Imirimo**. Koresha ibyiciro no gushakisha, ukande umurongo.",
                  shot: "work-jobs",
                  marks: ["Ibyiciro"],
                },
                {
                  text: "Ibice: **Incamake**, **Inyandiko**, **Ibiganiro**, **Ibyo gutanga**, **Amateka**, **Amafaranga**.",
                  shot: "work-job-brief",
                  marks: [
                    "Ibice",
                    "Hindura imiterere",
                    "Saba itariki nshya",
                    "Igisubizo cy'ikigo",
                  ],
                },
                {
                  text: "Kuri **Incamake**, soma amabwiriza; **Amateka** yerekana verisiyo zabanje. **Ayo mwumvikanye** yerekana ayo uzahembwa.",
                },
              ],
            },
            {
              id: "docs",
              title: "Inyandiko n'uburenganzira",
              steps: [
                {
                  text: "**Inyandiko** yerekana gusa **Byasangijwe nawe**. **Kuramo**: biranditswe kandi bifite izina ryawe.",
                },
                {
                  text: "Ukeneye ibindi? **Saba uburenganzira**, **Impamvu**, icyitonderwa, ukande **Ohereza ubusabe**.",
                },
              ],
              tips: ["Uburenganzira burangira iyo akazi gafunzwe."],
            },
            {
              id: "handback",
              title: "Gusubiza akazi",
              steps: [
                { text: "Kanda **Ibindi** → **Subiza akazi**." },
                {
                  text: "Subiza **Kuki ugasubije?**, wongereho icyitonderwa ukande **Subiza**. Akazi kaba ako gusoma gusa.",
                },
              ],
              warn: "Ntushobora kubisubiza inyuma; umuyobozi aha akazi undi.",
            },
          ],
        },
      },
    },
    {
      slug: "work-deliver",
      cat: "jobs",
      minutes: 5,
      updated: U,
      pages: ["/work/jobs"],
      t: {
        en: {
          title: "Deliver a job and record the institution's outcome",
          summary:
            "Upload deliverables, submit them for review, log a filing with an institution and record its decision.",
          facts: { need: ["PDF, JPG, PNG or DOCX files up to 10 MB"] },
          keywords:
            "deliverables upload submit review institution submission outcome status propose date",
          sections: [
            {
              id: "upload",
              title: "Upload and submit",
              steps: [
                {
                  text: "In the job, open **Deliverables** and click **Upload** for each required file.",
                  shot: "work-job-deliverables",
                  marks: ["Upload", "Submit"],
                },
                {
                  text: "Write the **Client note** and click **Submit for review**. Tick **I checked every file opens and is readable** and confirm.",
                },
                {
                  text: "If it is returned, click **Upload new version**, then **Resubmit for review**.",
                },
              ],
              warn: "Where the button reads **Deliver to client**, files go straight to the client and the job completes.",
            },
            {
              id: "institution",
              title: "Institution and outcome",
              steps: [
                {
                  text: "Click **Change status** → **Awaiting external institution**. Fill **Institution**, **Submission ref**, **Submitted on** and click **Confirm submission**.",
                },
                {
                  text: "When the institution answers, click **External outcome**, choose the result, write a **Note** and click **Save outcome**.",
                },
                {
                  text: "Need more time? Click **Propose new date**, choose the **New due date** and click **Propose**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Livrer une mission et noter le résultat de l'institution",
          summary:
            "Téléversez les livrables, soumettez-les, enregistrez un dépôt auprès d'une institution et notez sa décision.",
          facts: { need: ["Fichiers PDF, JPG, PNG ou DOCX de 10 Mo max."] },
          keywords:
            "livrables téléverser soumettre revue institution résultat statut date",
          sections: [
            {
              id: "upload",
              title: "Téléverser et soumettre",
              steps: [
                {
                  text: "Dans la mission, ouvrez **Livrables** et cliquez sur **Téléverser** pour chaque fichier requis.",
                  shot: "work-job-deliverables",
                  marks: ["Téléverser", "Soumettre"],
                },
                {
                  text: "Écrivez la **Note au client** et cliquez sur **Soumettre pour revue**. Cochez **J'ai vérifié que chaque fichier s'ouvre et se lit**.",
                },
                {
                  text: "En cas de renvoi : **Téléverser une nouvelle version**, puis **Soumettre à nouveau**.",
                },
              ],
              warn: "Si le bouton indique **Livrer au client**, les fichiers partent directement et la mission se termine.",
            },
            {
              id: "institution",
              title: "Institution et résultat",
              steps: [
                {
                  text: "**Changer le statut** → **En attente de l'institution**. Remplissez **Institution**, **Référence de soumission**, **Soumis le** puis **Confirmer la soumission**.",
                },
                {
                  text: "À la réponse, cliquez sur **Résultat externe**, choisissez le résultat, une **Note**, puis **Enregistrer**.",
                },
                {
                  text: "Plus de temps ? **Proposer une date**, la **Nouvelle échéance**, puis **Proposer**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Gutanga akazi no kwandika igisubizo cy'ikigo",
          summary:
            "Ohereza ibyakozwe, ubisuzumishe, wandike ko wohereje ku kigo n'icyemezo cyacyo.",
          facts: {
            need: ["Dosiye za PDF, JPG, PNG cyangwa DOCX zitarenze MB 10"],
          },
          keywords:
            "ibyo gutanga kohereza isuzuma ikigo igisubizo imiterere itariki",
          sections: [
            {
              id: "upload",
              title: "Ohereza kandi usuzumishe",
              steps: [
                {
                  text: "Mu kazi, fungura **Ibyo gutanga** ukande **Ohereza** kuri buri dosiye isabwa.",
                  shot: "work-job-deliverables",
                  marks: ["Ohereza", "Ohereza ngo bisuzumwe"],
                },
                {
                  text: "Andika **Ubutumwa ku mukiriya** ukande **Ohereza ngo bisuzumwe**. Hitamo **Nagenzuye ko buri dosiye ifunguka kandi isomeka**.",
                },
                {
                  text: "Byagaruwe: **Ohereza verisiyo nshya**, hanyuma **Ongera wohereze ngo bisuzumwe**.",
                },
              ],
              warn: "Aho akabuto kanditse **Ha umukiriya**, dosiye zijya ku mukiriya ako kanya kandi akazi kakarangira.",
            },
            {
              id: "institution",
              title: "Ikigo n'igisubizo",
              steps: [
                {
                  text: "**Hindura imiterere** → **Itegereje ikigo cyo hanze**. Uzuza **Ikigo**, **Nimero y'ubusabe**, **Byoherejwe ku wa** ukande **Emeza ko byoherejwe**.",
                },
                {
                  text: "Ikigo gisubije, kanda **Igisubizo cy'ikigo**, hitamo igisubizo, **Icyitonderwa**, ukande **Bika igisubizo**.",
                },
                {
                  text: "Ukeneye igihe? **Saba itariki nshya**, **Itariki nshya**, ukande **Saba**.",
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ comms
    {
      slug: "work-messages",
      cat: "comms",
      minutes: 3,
      updated: U,
      pages: ["/work/inbox", "/work/jobs"],
      t: {
        en: {
          title: "Message your manager and the client",
          summary:
            "Use the team lane with HEBUZA, and the client lane when client contact is enabled for the job.",
          keywords: "messages inbox team lane client lane contact templates",
          sections: [
            {
              id: "lanes",
              title: "Lanes",
              steps: [
                {
                  text: "Open **Messages** and click a conversation, or click **Message client** in a job header.",
                  shot: "work-inbox",
                  marks: ["Search"],
                },
                {
                  text: "Choose the lane: the **Team lane** reaches your manager; the **Client lane** reaches the client.",
                  shot: "work-job-conversation",
                  marks: ["Lane", "Send"],
                },
                {
                  text: "Type and click **Send**. Use **Attach file**, **Templates** or **Insert card** as needed.",
                },
              ],
              tips: [
                "If you see **Client contact not enabled for this job**, use the team lane or click **Ask manager for contact**.",
              ],
            },
          ],
        },
        fr: {
          title: "Écrire à votre manager et au client",
          summary:
            "Le canal équipe pour HEBUZA, le canal client quand le contact client est activé.",
          keywords: "messages canal équipe canal client contact modèles",
          sections: [
            {
              id: "lanes",
              title: "Canaux",
              steps: [
                {
                  text: "Ouvrez **Messages** et cliquez sur une conversation, ou **Écrire au client** dans l'en-tête de la mission.",
                  shot: "work-inbox",
                  marks: ["Recherche"],
                },
                {
                  text: "Choisissez : **Canal équipe** vers votre manager, **Canal client** vers le client.",
                  shot: "work-job-conversation",
                  marks: ["Canal", "Envoyer"],
                },
                {
                  text: "Tapez et cliquez sur **Envoyer**. **Joindre un fichier**, **Modèles** ou **Insérer une carte** au besoin.",
                },
              ],
              tips: [
                "Si le contact client n'est pas activé, utilisez le canal équipe ou **Demander le contact au responsable**.",
              ],
            },
          ],
        },
        rw: {
          title: "Kwandikira umuyobozi n'umukiriya",
          summary:
            "Koresha umurongo w'itsinda na HEBUZA, n'uw'umukiriya iyo kuvugana n'umukiriya byemewe.",
          keywords: "ubutumwa itsinda umukiriya inyandikorugero",
          sections: [
            {
              id: "lanes",
              title: "Imirongo",
              steps: [
                {
                  text: "Fungura **Ubutumwa** ukande ikiganiro, cyangwa **Andikira umukiriya** hejuru ku kazi.",
                  shot: "work-inbox",
                  marks: ["Gushakisha"],
                },
                {
                  text: "Hitamo: **Itsinda** igera ku muyobozi; **Umukiriya** igera ku mukiriya.",
                  shot: "work-job-conversation",
                  marks: ["Umurongo", "Ohereza"],
                },
                {
                  text: "Andika ukande **Ohereza**. Koresha **Omeka dosiye**, **Inyandikorugero** cyangwa **Shyiramo ikarita**.",
                },
              ],
              tips: [
                "Niba kuvugana n'umukiriya bitemewe, koresha itsinda cyangwa **Saba umuyobozi nimero**.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ money
    {
      slug: "work-earnings",
      cat: "money",
      minutes: 5,
      updated: U,
      pages: ["/work/earnings"],
      t: {
        en: {
          title: "Earnings, statements, payouts and invoices",
          summary:
            "Follow allocations, open monthly statements, check payouts and upload your invoices.",
          keywords:
            "earnings allocations statements payouts invoices wht net pdf csv",
          sections: [
            {
              id: "tabs",
              title: "The four tabs",
              steps: [
                {
                  text: "Open **Earnings**. Tabs: **Allocations**, **Statements**, **Payouts**, **Your invoices**. Tiles show your gross share.",
                  shot: "work-earnings",
                  marks: ["Tabs"],
                },
                {
                  text: "On **Allocations**, click a row to see your rate and timeline; click **Question this allocation** if it looks wrong.",
                },
                {
                  text: "On **Statements**, click **Open** on a month. It shows how gross becomes net (WHT, licence fee). Click **Download PDF** or **Download CSV**.",
                  shot: "work-statements",
                  marks: ["Tabs"],
                },
                {
                  text: "On **Payouts**, see each payout's date, method, provider ref and net amount.",
                },
              ],
            },
            {
              id: "invoice",
              title: "Upload an invoice",
              steps: [
                {
                  text: "Open **Your invoices** and click **Upload invoice**.",
                  shot: "work-invoices",
                  marks: ["Tabs"],
                },
                {
                  text: "Fill **Invoice number**, **Period**, **Amount (RWF)**, attach the **Invoice PDF (max 10 MB)** and click **Send invoice**.",
                },
              ],
              tips: [
                "Invoices are required for firms and VAT-registered agents. Firm members: your firm admin uploads them.",
              ],
            },
          ],
        },
        fr: {
          title: "Revenus, relevés, versements et factures",
          summary:
            "Suivez les allocations, ouvrez les relevés mensuels, vérifiez les versements et téléversez vos factures.",
          keywords:
            "revenus allocations relevés versements factures retenue net pdf csv",
          sections: [
            {
              id: "tabs",
              title: "Les quatre onglets",
              steps: [
                {
                  text: "Ouvrez **Revenus**. Onglets : **Allocations**, **Relevés**, **Versements**, **Vos factures**.",
                  shot: "work-earnings",
                  marks: ["Onglets"],
                },
                {
                  text: "Dans **Allocations**, cliquez sur une ligne pour le taux et le calendrier ; **Contester cette allocation** si besoin.",
                },
                {
                  text: "Dans **Relevés**, **Ouvrir** un mois : du brut au net. **Télécharger le PDF** ou **Télécharger le CSV**.",
                  shot: "work-statements",
                  marks: ["Onglets"],
                },
                {
                  text: "Dans **Versements**, date, mode, référence et montant net de chaque versement.",
                },
              ],
            },
            {
              id: "invoice",
              title: "Téléverser une facture",
              steps: [
                {
                  text: "Ouvrez **Vos factures** et cliquez sur **Téléverser une facture**.",
                  shot: "work-invoices",
                  marks: ["Onglets"],
                },
                {
                  text: "Remplissez **Numéro de facture**, **Période**, **Montant (RWF)**, joignez la **Facture PDF (10 Mo max.)** puis **Envoyer la facture**.",
                },
              ],
              tips: [
                "Obligatoire pour les cabinets et agents assujettis à la TVA. Membres de cabinet : l'admin s'en charge.",
              ],
            },
          ],
        },
        rw: {
          title: "Ibyo winjije, inyandiko, ubwishyu na fagitire",
          summary:
            "Kurikirana imigabane, fungura inyandiko z'ukwezi, urebe ubwishyu kandi wohereze fagitire.",
          keywords:
            "ibyo winjije imigabane inyandiko ubwishyu fagitire pdf csv",
          sections: [
            {
              id: "tabs",
              title: "Ibice bine",
              steps: [
                {
                  text: "Fungura **Ibyo winjije**. Ibice: **Imigabane**, **Inyandiko z'ukwezi**, **Ubwishyu**, **Fagitire zawe**.",
                  shot: "work-earnings",
                  marks: ["Ibice"],
                },
                {
                  text: "Kuri **Imigabane**, kanda umurongo urebe igiciro cyawe; **Baza kuri ibi byagenwe** niba bitari byo.",
                },
                {
                  text: "Kuri **Inyandiko z'ukwezi**, kanda **Fungura**: urebe uko amafaranga yose aba net. **Kuramo PDF** cyangwa **Kuramo CSV**.",
                  shot: "work-statements",
                  marks: ["Ibice"],
                },
                {
                  text: "Kuri **Ubwishyu**, reba itariki, uburyo, nimero n'amafaranga net.",
                },
              ],
            },
            {
              id: "invoice",
              title: "Ohereza fagitire",
              steps: [
                {
                  text: "Fungura **Fagitire zawe** ukande **Ohereza fagitire**.",
                  shot: "work-invoices",
                  marks: ["Ibice"],
                },
                {
                  text: "Uzuza **Nomero ya fagitire**, **Igihe**, **Amafaranga (RWF)**, omeka **Fagitire PDF (MB 10 ntarengwa)** ukande **Ohereza fagitire**.",
                },
              ],
              tips: [
                "Zisabwa ku bigo n'abakozi biyandikishije muri TVA. Abanyamuryango: umuyobozi w'ikigo ni we uzohereza.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "work-contract",
      cat: "money",
      minutes: 5,
      updated: U,
      pages: ["/work/contract"],
      t: {
        en: {
          title: "Your contract, rates, licence fee and renewal",
          summary:
            "Sign documents, propose a rate change, settle the monthly licence fee, renew or give notice.",
          keywords:
            "contract sign rate card licence fee momo renew notice expiry",
          sections: [
            {
              id: "overview",
              title: "Read and sign",
              steps: [
                {
                  text: "Open **Contract**. Tabs: **Overview**, **Documents**, **Rate card**, **Licence fees**, **Renewal & notice**, **History**.",
                  shot: "work-contract",
                  marks: ["Tabs"],
                },
                {
                  text: "A document marked **To sign** shows **Sign now**. Read to the end, tick **I have read and agree to these terms**, type your name and click **Sign**.",
                },
                {
                  text: "Click **View contract (PDF)** to download the signed copy.",
                },
              ],
            },
            {
              id: "rates",
              title: "Propose a rate change",
              steps: [
                {
                  text: "On **Rate card**, click **Propose a change**. Pick the **Rate type**, enter the **Proposed rate** and **Why this change?**.",
                },
                {
                  text: "Click **Send proposal**. Your manager reviews, then Finance approves.",
                },
              ],
            },
            {
              id: "licence",
              title: "Settle the licence fee",
              steps: [
                {
                  text: "On **Licence fees**, click **Pay** on a due invoice.",
                  shot: "work-licence",
                  marks: ["Tabs"],
                },
                {
                  text: "Choose **Pay now with MTN MoMo** (enter your **MoMo number**, click **Send prompt**, approve on your phone) or **Net from my next payout** (click **Net from payout**).",
                },
              ],
            },
            {
              id: "renew",
              title: "Renew or give notice",
              steps: [
                {
                  text: "On **Renewal & notice**, read the **Renewal terms** and click **Renew** (opens 60 days before the end date).",
                  shot: "work-renewal",
                  marks: ["Tabs"],
                },
                {
                  text: "To end the agreement, click **Give notice**, check your last day, give a **Reason** and click **Send notice**.",
                },
              ],
              warn: "After notice your access ends on your last day and open jobs are reassigned. An expired contract stops new offers.",
            },
          ],
        },
        fr: {
          title: "Contrat, tarifs, redevance et renouvellement",
          summary:
            "Signez, proposez un nouveau tarif, réglez la redevance mensuelle, renouvelez ou donnez votre préavis.",
          keywords:
            "contrat signer grille tarifaire redevance momo renouveler préavis",
          sections: [
            {
              id: "overview",
              title: "Lire et signer",
              steps: [
                {
                  text: "Ouvrez **Contrat**. Onglets : **Aperçu**, **Documents**, **Grille tarifaire**, **Redevances**, **Renouvellement & préavis**, **Historique**.",
                  shot: "work-contract",
                  marks: ["Onglets"],
                },
                {
                  text: "Un document à signer affiche **Signer**. Lisez jusqu'au bout, cochez **J'ai lu et j'accepte ces conditions**, tapez votre nom et cliquez sur **Signer**.",
                },
                {
                  text: "**Voir le contrat (PDF)** télécharge la copie signée.",
                },
              ],
            },
            {
              id: "rates",
              title: "Proposer un tarif",
              steps: [
                {
                  text: "Dans **Grille tarifaire**, **Proposer une modification** : **Type de tarif**, **Tarif proposé** et **Pourquoi ce changement ?**.",
                },
                {
                  text: "Cliquez sur **Envoyer**. Votre manager examine, puis la Finance approuve.",
                },
              ],
            },
            {
              id: "licence",
              title: "Régler la redevance",
              steps: [
                {
                  text: "Dans **Redevances**, cliquez sur **Payer** sur une facture due.",
                  shot: "work-licence",
                  marks: ["Onglets"],
                },
                {
                  text: "**Payer maintenant avec MTN MoMo** (**Numéro MoMo**, **Envoyer la demande**, validez sur le téléphone) ou **Déduire de mon prochain versement** (**Déduire du versement**).",
                },
              ],
            },
            {
              id: "renew",
              title: "Renouveler ou donner un préavis",
              steps: [
                {
                  text: "Dans **Renouvellement & préavis**, lisez les conditions et cliquez sur **Renouveler** (ouvert 60 jours avant la fin).",
                  shot: "work-renewal",
                  marks: ["Onglets"],
                },
                {
                  text: "Pour mettre fin : **Donner mon préavis**, vérifiez votre dernier jour, une **Raison**, puis **Envoyer le préavis**.",
                },
              ],
              warn: "Après préavis, l'accès cesse le dernier jour et les missions ouvertes sont réattribuées. Un contrat expiré bloque les nouvelles offres.",
            },
          ],
        },
        rw: {
          title: "Amasezerano, ibiciro, uruhushya no kuvugurura",
          summary:
            "Sinya inyandiko, usabe guhindura igiciro, wishyure uruhushya rwa buri kwezi, uvugurure cyangwa umenyeshe ko uhagaritse.",
          keywords:
            "amasezerano sinya ibiciro uruhushya momo vugurura menyesha",
          sections: [
            {
              id: "overview",
              title: "Soma usinye",
              steps: [
                {
                  text: "Fungura **Amasezerano**. Ibice: **Incamake**, **Inyandiko**, **Ibiciro**, **Uruhushya**, **Kuvugurura & kumenyesha**, **Amateka**.",
                  shot: "work-contract",
                  marks: ["Ibice"],
                },
                {
                  text: "Inyandiko itarasinywa igaragaza **Sinya ubu**. Soma kugeza ku iherezo, hitamo **Nasomye kandi nemeye aya mabwiriza**, wandike amazina ukande **Sinya**.",
                },
                { text: "**Reba amasezerano (PDF)** ikuramo kopi yasinywe." },
              ],
            },
            {
              id: "rates",
              title: "Saba guhindura igiciro",
              steps: [
                {
                  text: "Kuri **Ibiciro**, **Saba impinduka**: **Ubwoko bw'igiciro**, **Igiciro usaba** na **Kuki iyi mpinduka?**.",
                },
                {
                  text: "Kanda **Ohereza**. Umuyobozi arabisuzuma, hanyuma Imari ikabyemeza.",
                },
              ],
            },
            {
              id: "licence",
              title: "Kwishyura uruhushya",
              steps: [
                {
                  text: "Kuri **Uruhushya**, kanda **Ishyura** kuri fagitire igomba kwishyurwa.",
                  shot: "work-licence",
                  marks: ["Ibice"],
                },
                {
                  text: "**Ishyura ubu na MTN MoMo** (**Nimero ya MoMo**, **Ohereza ubusabe**, wemeze kuri telefoni) cyangwa **Bikurwe ku bwishyu butaha** (**Bikurwe ku bwishyu**).",
                },
              ],
            },
            {
              id: "renew",
              title: "Kuvugurura cyangwa kumenyesha",
              steps: [
                {
                  text: "Kuri **Kuvugurura & kumenyesha**, soma amabwiriza ukande **Vugurura** (bifunguka iminsi 60 mbere y'irangira).",
                  shot: "work-renewal",
                  marks: ["Ibice"],
                },
                {
                  text: "Guhagarika: **Menyesha**, reba umunsi wawe wa nyuma, **Impamvu**, ukande **Ohereza**.",
                },
              ],
              warn: "Nyuma yo kumenyesha, uburenganzira burangira ku munsi wa nyuma n'akazi gahabwa abandi. Amasezerano yarangiye ahagarika akazi gashya.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ account
    {
      slug: "work-profile",
      cat: "account",
      minutes: 4,
      updated: U,
      pages: ["/work/profile"],
      t: {
        en: {
          title: "Services, credentials and payout method",
          summary:
            "Keep your cleared services and credentials valid, and change where your payouts go.",
          keywords:
            "profile services clearance credentials renewal expired payout method otp",
          sections: [
            {
              id: "sections",
              title: "Profile sections",
              steps: [
                {
                  text: "Open **Profile**. Sections include **Services & clearance**, **Credentials**, **Payout method**, notifications and security.",
                  shot: "work-profile",
                  marks: ["Sections"],
                },
                {
                  text: "**Services & clearance** shows each service as Cleared, Under review or Not cleared. You receive offers only for cleared services.",
                },
              ],
            },
            {
              id: "creds",
              title: "Renew a credential",
              steps: [
                {
                  text: "Open **Credentials**. An expiring credential shows how many days are left.",
                  shot: "work-credentials",
                  marks: ["Sections"],
                },
                {
                  text: "Click **Upload renewal**, fill the new **Expires on** date, attach the file and click **Submit for review**.",
                },
              ],
              warn: "An expired credential stops offers for the services it covers until the renewal is verified.",
            },
            {
              id: "payout",
              title: "Change payout method",
              steps: [
                { text: "Open **Payout method** and click **Change method**." },
                {
                  text: "Pick the **Method**, enter the **Account or phone number** and **Account name**, then enter the code sent to your current phone.",
                },
                {
                  text: "Click **Request change**. Finance verifies the new account before money moves.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Services, justificatifs et mode de versement",
          summary:
            "Gardez vos services et justificatifs valides, et changez le compte de versement.",
          keywords:
            "profil services habilitation justificatifs renouvellement versement code",
          sections: [
            {
              id: "sections",
              title: "Sections du profil",
              steps: [
                {
                  text: "Ouvrez **Profil**. Sections : **Services & habilitation**, **Justificatifs**, **Mode de versement**, notifications et sécurité.",
                  shot: "work-profile",
                  marks: ["Sections"],
                },
                {
                  text: "**Services & habilitation** indique l'état de chaque service. Seuls les services habilités reçoivent des offres.",
                },
              ],
            },
            {
              id: "creds",
              title: "Renouveler un justificatif",
              steps: [
                {
                  text: "Ouvrez **Justificatifs**. Un justificatif proche de l'expiration indique les jours restants.",
                  shot: "work-credentials",
                  marks: ["Sections"],
                },
                {
                  text: "Cliquez sur **Téléverser le renouvellement**, saisissez **Expire le**, joignez le fichier et **Envoyer pour examen**.",
                },
              ],
              warn: "Un justificatif expiré bloque les offres des services concernés jusqu'à vérification.",
            },
            {
              id: "payout",
              title: "Changer le mode de versement",
              steps: [
                {
                  text: "Ouvrez **Mode de versement** et cliquez sur **Changer de mode**.",
                },
                {
                  text: "Choisissez le **Mode**, le **Numéro de compte ou de téléphone** et le **Titulaire du compte**, puis le code reçu sur votre téléphone actuel.",
                },
                {
                  text: "Cliquez sur **Demander le changement**. La Finance vérifie avant tout versement.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Serivisi, ibyangombwa n'uburyo bwo kwishyurwa",
          summary:
            "Komeza serivisi n'ibyangombwa byemewe, kandi uhindure aho uhemberwa.",
          keywords:
            "umwirondoro serivisi kwemezwa ibyangombwa kuvugurura kwishyurwa kode",
          sections: [
            {
              id: "sections",
              title: "Ibice by'umwirondoro",
              steps: [
                {
                  text: "Fungura **Umwirondoro**. Ibice: **Serivisi & kwemezwa**, **Ibyangombwa**, **Uburyo bwo kwishyurwa**, imenyesha n'umutekano.",
                  shot: "work-profile",
                  marks: ["Ibice"],
                },
                {
                  text: "**Serivisi & kwemezwa** yerekana uko buri serivisi ihagaze. Uhabwa akazi gusa kuri serivisi wemerewe.",
                },
              ],
            },
            {
              id: "creds",
              title: "Kuvugurura icyangombwa",
              steps: [
                {
                  text: "Fungura **Ibyangombwa**. Ikiri hafi kurangira kigaragaza iminsi isigaye.",
                  shot: "work-credentials",
                  marks: ["Ibice"],
                },
                {
                  text: "Kanda **Ohereza icyavuguruwe**, wandike **Kirangira ku wa**, omeka dosiye ukande **Ohereza gisuzumwe**.",
                },
              ],
              warn: "Icyangombwa cyarangiye gihagarika akazi ka serivisi kireba kugeza icyavuguruwe cyemejwe.",
            },
            {
              id: "payout",
              title: "Guhindura uburyo bwo kwishyurwa",
              steps: [
                {
                  text: "Fungura **Uburyo bwo kwishyurwa** ukande **Hindura uburyo**.",
                },
                {
                  text: "Hitamo **Uburyo**, **Nimero ya konti cyangwa telefone** na **Izina rya konti**, hanyuma wandike kode yoherejwe kuri telefone yawe.",
                },
                {
                  text: "Kanda **Saba impinduka**. Imari irabanza kugenzura konti nshya.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "work-team",
      cat: "account",
      minutes: 4,
      updated: U,
      pages: ["/work/team"],
      t: {
        en: {
          title: "Manage your firm's team (firm admin)",
          summary:
            "Invite members, assign firm jobs internally, request a removal and see firm payouts.",
          facts: { who: "Firm admins only" },
          keywords:
            "team firm admin invite member assign internally reassign removal payouts",
          sections: [
            {
              id: "members",
              title: "Members",
              steps: [
                {
                  text: "Open **Team**. Tabs: **Members**, **Jobs**, **Payouts**.",
                  shot: "work-team",
                  marks: ["Invite member", "Tabs"],
                },
                {
                  text: "Click **Invite member**. Fill **Full name**, **Email**, **Mobile number** and **Services they will deliver**, then **Send invitation**. The invitation is valid 72 hours.",
                },
                {
                  text: "To remove someone, click **Request removal**, give a **Reason** and click **Send request**. Your service manager reviews it.",
                },
              ],
            },
            {
              id: "assign",
              title: "Assign jobs",
              steps: [
                {
                  text: "On **Jobs**, click **Assign internally** (or **Reassign**) on a job.",
                },
                {
                  text: "Pick the member in **Assign to**. Members pending verification or not cleared for the service can't be picked.",
                },
              ],
              tips: [
                "Internal assignments are logged and visible to your service manager.",
                "**Payouts** go to the firm account; upload one firm invoice per period with **Upload firm invoice**.",
              ],
            },
          ],
        },
        fr: {
          title: "Gérer l'équipe du cabinet (admin)",
          summary:
            "Invitez des membres, attribuez les missions en interne, demandez un retrait et suivez les versements.",
          facts: { who: "Admins de cabinet uniquement" },
          keywords:
            "équipe cabinet admin inviter membre attribuer réattribuer retrait versements",
          sections: [
            {
              id: "members",
              title: "Membres",
              steps: [
                {
                  text: "Ouvrez **Équipe**. Onglets : **Membres**, **Dossiers**, **Versements**.",
                  shot: "work-team",
                  marks: ["Inviter un membre", "Onglets"],
                },
                {
                  text: "**Inviter un membre** : **Nom complet**, **E-mail**, **Numéro mobile**, **Services qu'il fournira**, puis **Envoyer l'invitation** (valable 72 heures).",
                },
                {
                  text: "Pour retirer quelqu'un : **Demander le retrait**, un **Motif**, puis **Envoyer la demande**.",
                },
              ],
            },
            {
              id: "assign",
              title: "Attribuer les missions",
              steps: [
                {
                  text: "Dans **Dossiers**, cliquez sur **Attribuer en interne** (ou **Réattribuer**).",
                },
                {
                  text: "Choisissez le membre dans **Attribuer à**. Les membres non vérifiés ou non habilités ne sont pas sélectionnables.",
                },
              ],
              tips: [
                "Les attributions sont journalisées et visibles par votre manager.",
                "Les **Versements** vont sur le compte du cabinet ; **Téléverser la facture** chaque période.",
              ],
            },
          ],
        },
        rw: {
          title: "Gucunga itsinda ry'ikigo (umuyobozi w'ikigo)",
          summary:
            "Tumira abanyamuryango, utange akazi imbere mu kigo, usabe gukura umuntu kandi urebe ubwishyu.",
          facts: { who: "Abayobozi b'ibigo gusa" },
          keywords:
            "itsinda ikigo tumira umunyamuryango gutanga akazi guha undi ubwishyu",
          sections: [
            {
              id: "members",
              title: "Abanyamuryango",
              steps: [
                {
                  text: "Fungura **Itsinda**. Ibice: **Abanyamuryango**, **Akazi**, **Ubwishyu**.",
                  shot: "work-team",
                  marks: ["Tumira umunyamuryango", "Ibice"],
                },
                {
                  text: "**Tumira umunyamuryango**: **Amazina yose**, **Imeyili**, **Telefoni**, **Serivisi azatanga**, ukande **Ohereza ubutumire** (bumara amasaha 72).",
                },
                {
                  text: "Gukura umuntu: **Saba kumukura**, **Impamvu**, ukande **Ohereza ubusabe**.",
                },
              ],
            },
            {
              id: "assign",
              title: "Gutanga akazi",
              steps: [
                {
                  text: "Kuri **Akazi**, kanda **Gutanga imbere mu kigo** (cyangwa **Guha undi**).",
                },
                {
                  text: "Hitamo umunyamuryango muri **Uhabwa**. Abataremezwa cyangwa batemerewe serivisi ntibatoranywa.",
                },
              ],
              tips: [
                "Gutanga akazi imbere mu kigo biranditswe kandi umuyobozi wa serivisi arabibona.",
                "**Ubwishyu** bujya kuri konti y'ikigo; **Shyiraho fagitire** buri gihe.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ field
    {
      slug: "work-field-day",
      cat: "field",
      minutes: 4,
      updated: U,
      pages: ["/work/field"],
      t: {
        en: {
          title: "Plan your field day on a phone",
          summary:
            "Download today's tasks for offline use, answer task offers, sync the outbox and claim expenses.",
          facts: { who: "Agents with field work turned on" },
          keywords:
            "field visits phone offline download prepare outbox sync expenses",
          sections: [
            {
              id: "prepare",
              title: "Before you leave",
              steps: [
                {
                  text: "Open **Field visits**. The day plan lists today's visits.",
                },
                {
                  text: "Tap **Download for offline**, then **Download now** while you have a connection. Data is wiped after 72 hours.",
                },
                {
                  text: "Under **New task offers**, tap **Accept** or **Decline** (declining needs a connection).",
                },
              ],
            },
            {
              id: "outbox",
              title: "Outbox and expenses",
              steps: [
                {
                  text: "Open **Outbox** and tap **Sync now** when online.",
                },
                {
                  text: "Open **Expenses** → **New expense**: **Category**, **Amount (RWF)**, **Task**, **Receipt photo**, then **Save expense**.",
                },
              ],
              warn: "**Discard** deletes an outbox item from the phone for good.",
            },
          ],
        },
        fr: {
          title: "Préparer votre journée terrain sur téléphone",
          summary:
            "Téléchargez les tâches pour le hors-ligne, répondez aux offres, synchronisez et déclarez vos dépenses.",
          facts: { who: "Agents avec le travail terrain activé" },
          keywords:
            "terrain visites téléphone hors ligne télécharger envois dépenses",
          sections: [
            {
              id: "prepare",
              title: "Avant de partir",
              steps: [
                {
                  text: "Ouvrez **Visites terrain**. Le plan du jour liste les visites.",
                },
                {
                  text: "Touchez **Télécharger pour le hors-ligne**, puis **Télécharger** tant que vous êtes connecté. Effacement après 72 heures.",
                },
                {
                  text: "Sous **Nouvelles offres**, **Accepter** ou **Refuser** (refuser nécessite une connexion).",
                },
              ],
            },
            {
              id: "outbox",
              title: "Envois et dépenses",
              steps: [
                {
                  text: "Ouvrez **Envois** et touchez **Synchroniser** en ligne.",
                },
                {
                  text: "**Dépenses** → **Nouvelle dépense** : **Catégorie**, **Montant (RWF)**, **Tâche**, **Photo du reçu**, puis **Enregistrer la dépense**.",
                },
              ],
              warn: "**Supprimer** efface définitivement un élément du téléphone.",
            },
          ],
        },
        rw: {
          title: "Gutegura umunsi w'ingendo kuri telefoni",
          summary:
            "Kurura imirimo ukore nta interineti, usubize imirimo wahawe, wohereze kandi usabe amafaranga wakoresheje.",
          facts: { who: "Abakozi bemerewe ingendo z'akazi" },
          keywords:
            "ingendo telefoni nta interineti kurura ibyoherezwa amafaranga",
          sections: [
            {
              id: "prepare",
              title: "Mbere yo kugenda",
              steps: [
                {
                  text: "Fungura **Ingendo z'akazi**. Gahunda y'umunsi yerekana ingendo.",
                },
                {
                  text: "Kanda **Kurura ngo ukore nta interineti**, hanyuma **Kurura ubu** ukiri kuri interineti. Bisibwa nyuma y'amasaha 72.",
                },
                {
                  text: "Munsi ya **Imirimo mishya wahawe**, kanda **Emera** cyangwa **Anga** (kwanga bisaba interineti).",
                },
              ],
            },
            {
              id: "outbox",
              title: "Ibyoherezwa n'amafaranga",
              steps: [
                {
                  text: "Fungura **Ibyoherezwa** ukande **Ohereza ubu**.",
                },
                {
                  text: "**Amafaranga yakoreshejwe** → **Ongeraho**: **Ubwoko**, **Amafaranga (RWF)**, **Igikorwa**, **Ifoto y'inyemezabwishyu**, ukande **Bika**.",
                },
              ],
              warn: "**Siba** ikuraho burundu ikintu kuri telefoni.",
            },
          ],
        },
      },
    },
    {
      slug: "work-field-visit",
      cat: "field",
      minutes: 5,
      updated: U,
      pages: ["/work/field/visits", "/work/field"],
      t: {
        en: {
          title: "Do a field visit: check in, scan, sign, check out",
          summary:
            "The four steps of a visit, with photo capture and the client's signature on a receipt.",
          keywords:
            "visit check-in gps photo scan receipt signature otp check-out",
          sections: [
            {
              id: "steps",
              title: "The four steps",
              steps: [
                {
                  text: "Tap a visit, then **Start visit**. At the site tap **I've arrived**; if GPS is weak, tap **Take photo** or **Continue without photo**.",
                },
                {
                  text: "**Work**: tick the **Visit checklist**, **Add note**, and **Scan document** (**Take photo of page 1**, **Add page**, **Use this crop**).",
                },
                {
                  text: "**Receipt**: choose **Collected from client** or **Returned to client**, **Add item** per document, then **Ask client to sign** (**Draw**, **Type name instead** or **SMS code**) and **Save signature**.",
                },
                {
                  text: "**Check-out**: choose **Completed**, **Partially done**, **Client absent** or **Rescheduled**, then tap **Check out**.",
                },
              ],
              warn: "Signed receipts can't be edited; use **Correct with a new receipt**.",
              tips: [
                "Everything is saved on the phone first and sent by the **Outbox** when online.",
              ],
            },
          ],
        },
        fr: {
          title: "Faire une visite : arrivée, scan, signature, départ",
          summary:
            "Les quatre étapes d'une visite, avec photo et signature du client sur le reçu.",
          keywords: "visite arrivée gps photo scan reçu signature départ",
          sections: [
            {
              id: "steps",
              title: "Les quatre étapes",
              steps: [
                {
                  text: "Touchez une visite puis **Commencer la visite**. Sur place, **Je suis arrivé** ; GPS faible : **Prendre une photo** ou **Continuer sans photo**.",
                },
                {
                  text: "**Travail** : **Liste de la visite**, **Ajouter la note**, **Scanner un document** (**Photographier la page 1**, **Ajouter une page**, **Utiliser ce cadrage**).",
                },
                {
                  text: "**Reçu** : **Reçu du client** ou **Rendu au client**, **Ajouter un élément**, puis **Faire signer le client** (**Dessiner**, **Saisir le nom** ou **Code SMS**) et **Enregistrer la signature**.",
                },
                {
                  text: "**Départ** : **Terminée**, **Partiellement faite**, **Client absent** ou **Reportée**, puis **Pointer le départ**.",
                },
              ],
              warn: "Un reçu signé n'est plus modifiable ; utilisez **Corriger avec un nouveau reçu**.",
              tips: [
                "Tout est d'abord enregistré sur le téléphone, puis envoyé par les **Envois**.",
              ],
            },
          ],
        },
        rw: {
          title: "Gukora urugendo: kugera, scan, umukono, gusoza",
          summary:
            "Intambwe enye z'urugendo, harimo amafoto n'umukono w'umukiriya ku nyemezabwishyu.",
          keywords:
            "urugendo kugera gps ifoto scan inyemezabwishyu umukono gusoza",
          sections: [
            {
              id: "steps",
              title: "Intambwe enye",
              steps: [
                {
                  text: "Kanda urugendo, hanyuma **Tangira uruzinduko**. Ugeze, kanda **Nageze**; GPS idakora neza: **Fata ifoto** cyangwa **Komeza nta foto**.",
                },
                {
                  text: "**Akazi**: **Urutonde rw'urugendo**, **Ongeraho igisobanuro**, **Scan inyandiko** (**Fotora urupapuro rwa 1**, **Ongeraho urupapuro**, **Koresha iki gice**).",
                },
                {
                  text: "**Inyemezabwishyu**: **Byakiriwe ku mukiriya** cyangwa **Byasubijwe umukiriya**, **Ongeraho ikintu**, hanyuma **Saba umukiriya gusinya** (**Shushanya**, **Andika izina** cyangwa **Kode ya SMS**) na **Bika umukono**.",
                },
                {
                  text: "**Gusoza**: **Byarangiye**, **Byakozwe igice**, **Umukiriya ntiyari ahari** cyangwa **Byimuriwe**, ukande **Soza**.",
                },
              ],
              warn: "Inyemezabwishyu yasinywe ntihinduka; koresha **Kosora ukoresheje inyemezabwishyu nshya**.",
              tips: [
                "Byose bibanza kubikwa kuri telefoni, bikoherezwa na **Ibyoherezwa**.",
              ],
            },
          ],
        },
      },
    },
  ],
};

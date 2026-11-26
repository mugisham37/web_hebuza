import type { WsGuideSet } from "./index";

// partners dashboard guides. rw/fr are drafts for native review. Shots: scripts/guides/ws-partners.spec.ts.
const U = "2026-11-26";

export const PARTNERS_WS: WsGuideSet = {
  workspace: "partners",
  cats: [
    {
      key: "partners",
      t: { en: "Partners", fr: "Partenaires", rw: "Abafatanyabikorwa" },
    },
    {
      key: "money",
      t: { en: "Commissions", fr: "Commissions", rw: "Komisiyo" },
    },
  ],
  guides: [
    {
      slug: "partners-overview",
      cat: "partners",
      minutes: 3,
      updated: U,
      start: true,
      pages: ["/partners"],
      t: {
        en: {
          title: "Your partner list",
          summary:
            "Every institution HEBUZA works with, with health, referrals and what needs follow-up. Partner managers add and edit; executives and finance read.",
          keywords: "partners list institutions add partner kpi health",
          facts: {
            who: "Partner manager (edit); Senior management and Finance officer (read)",
          },
          sections: [
            {
              id: "read",
              title: "Read the list",
              steps: [
                {
                  text: "Open **Overview** in the side menu. The top shows **Active partners**, **Agreements expiring (90 days)**, **Overdue actions** and **Meetings this week**.",
                  shot: "partners-list",
                  marks: [
                    "Add partner",
                    "Key figures",
                    "Status filter",
                  ],
                },
                {
                  text: "Filter by status with the tabs: **All**, **Prospect**, **Active**, **Dormant**, **Archived**.",
                },
                {
                  text: "**Health** reads **Healthy**, **No recent contact** or **Needs attention**. Click a partner's name to open it.",
                },
              ],
            },
            {
              id: "add",
              title: "Add a partner",
              steps: [
                {
                  text: "Click **Add partner**.",
                  shot: "partners-add",
                  marks: ["Partner form"],
                },
                {
                  text: "Fill **Name**, **Type**, **Tier** and **Status**; optionally sector, country, website and notes. Tick **Show logo on the website** and give a **Logo URL** to list them publicly.",
                },
                {
                  text: "Click **Save**. The toast says **Saved** and the partner appears in the list.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Votre liste de partenaires",
          summary:
            "Chaque institution avec laquelle HEBUZA travaille, avec santé, références et suivis. Les responsables des partenariats ajoutent et modifient ; la direction et la finance consultent.",
          keywords: "partenaires liste institutions ajouter santé",
          facts: {
            who: "Responsable des partenariats (modification) ; Direction générale et Responsable financier (lecture)",
          },
          sections: [
            {
              id: "read",
              title: "Lire la liste",
              steps: [
                {
                  text: "Ouvrez **Vue d'ensemble**. En haut : **Partenaires actifs**, **Accords expirant (90 jours)**, **Actions en retard** et **Réunions cette semaine**.",
                  shot: "partners-list",
                  marks: [
                    "Ajouter un partenaire",
                    "Chiffres clés",
                    "Filtre de statut",
                  ],
                },
                {
                  text: "Filtrez par statut : **Tous**, **Prospect**, **Actif**, **Dormant**, **Archivé**.",
                },
                {
                  text: "La **Santé** indique **Bonne**, **Pas de contact récent** ou **À surveiller**. Cliquez sur un nom pour l'ouvrir.",
                },
              ],
            },
            {
              id: "add",
              title: "Ajouter un partenaire",
              steps: [
                {
                  text: "Cliquez sur **Ajouter un partenaire**.",
                  shot: "partners-add",
                  marks: ["Formulaire"],
                },
                {
                  text: "Remplissez nom, type, niveau et statut ; éventuellement secteur, pays, site et notes. Cochez l'affichage du logo sur le site et donnez l'URL du logo pour le publier.",
                },
                {
                  text: "Cliquez sur **Enregistrer**. Le message **Enregistré** s'affiche et le partenaire apparaît.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Urutonde rw'abafatanyabikorwa",
          summary:
            "Buri kigo HEBUZA ikorana na cyo, uko umubano uhagaze, aboherejwe n'ibikurikiranwa. Ushinzwe abafatanyabikorwa arongeraho akanahindura; ubuyobozi n'imari barasoma.",
          keywords: "abafatanyabikorwa urutonde ibigo ongeraho",
          facts: {
            who: "Ushinzwe abafatanyabikorwa (guhindura); Ubuyobozi bukuru n'Ushinzwe imari (gusoma)",
          },
          sections: [
            {
              id: "read",
              title: "Soma urutonde",
              steps: [
                {
                  text: "Fungura **Incamake**. Hejuru: **Abafatanyabikorwa bakora**, **Amasezerano arangira (iminsi 90)**, **Ibikorwa byatinze** na **Inama z'iki cyumweru**.",
                  shot: "partners-list",
                  marks: [
                    "Ongeraho umufatanyabikorwa",
                    "Imibare y'ingenzi",
                    "Yungurura",
                  ],
                },
                {
                  text: "Yungurura ukurikije uko bahagaze: **Byose**, **Uteganyijwe**, **Arakora**, **Yasinziriye**, **Yabitswe**.",
                },
                {
                  text: "**Ubuzima** bwerekana **Ni byiza**, **Nta guhura vuba** cyangwa **Bikeneye kwitabwaho**. Kanda ku izina umufungure.",
                },
              ],
            },
            {
              id: "add",
              title: "Ongeraho umufatanyabikorwa",
              steps: [
                {
                  text: "Kanda **Ongeraho umufatanyabikorwa**.",
                  shot: "partners-add",
                  marks: ["Ifishi"],
                },
                {
                  text: "Uzuza izina, ubwoko, urwego n'uko ahagaze; ushobora kongeraho urwego akoreramo, igihugu, urubuga n'ibisobanuro. Emeza kwerekana ikirango ku rubuga utange aho ikirango kiri.",
                },
                {
                  text: "Kanda **Bika**. Ubutumwa **Byabitswe** buragaragara n'umufatanyabikorwa akaza mu rutonde.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "partner-detail",
      cat: "partners",
      minutes: 5,
      updated: U,
      start: true,
      pages: ["/partners/"],
      t: {
        en: {
          title: "Work with one partner",
          summary:
            "A partner's page holds its contacts, agreements, action plan, meetings, correspondence, referrals and revenue, objectives, opportunities, obligations and history.",
          keywords:
            "partner detail contacts agreements mou action plan meetings minutes referrals obligations history archive",
          sections: [
            {
              id: "tabs",
              title: "Find your way around",
              steps: [
                {
                  text: "Open a partner from the list. **Overview** shows **Actions on time**, **Referrals**, **Referred revenue** and **Last contact**, with the health badge and **Download history (PDF)**.",
                },
                {
                  text: "The tabs are **Contacts**, **Agreements**, **Action plan**, **Meetings**, **Correspondence**, **Referrals & revenue**, **Objectives**, **Opportunities**, **Obligations** and **History**.",
                },
              ],
            },
            {
              id: "rows",
              title: "Add, edit and remove entries",
              steps: [
                {
                  text: "Open a tab and click **Add**. Fill the form and click **Save**.",
                },
                {
                  text: "On a row, **Save** reopens it for editing. **Remove** turns into **Confirm remove**; click again to delete.",
                },
                {
                  text: "Agreements: set **Kind** (MoU, Contract, NDA, SLA), dates, **Value (RWF)** and **Referral commission (%)**; use **Upload version** to attach signed copies.",
                },
                {
                  text: "Meetings: **Calendar invite** downloads an invite; after the meeting, **Save minutes** and use **Make action** to turn a decision into an action.",
                },
                {
                  text: "Action plan: **Mark done** when an action is finished.",
                },
              ],
              tips: [
                "The **Referral commission (%)** on the agreement is the rate used for commissions.",
              ],
            },
            {
              id: "edit",
              title: "Edit or archive the partner",
              intro:
                "At the top of the page, **Save** opens the partner's details (name, type, tier, status…). **Archive** hides an inactive partner from the active list; **Reactivate** brings it back. Only partner managers see these buttons.",
            },
          ],
        },
        fr: {
          title: "Travailler avec un partenaire",
          summary:
            "La fiche d'un partenaire regroupe contacts, accords, plan d'action, réunions, correspondance, références et revenus, objectifs, opportunités, obligations et historique.",
          keywords:
            "fiche partenaire contacts accords plan d'action réunions références obligations archiver",
          sections: [
            {
              id: "tabs",
              title: "Se repérer",
              steps: [
                {
                  text: "Ouvrez un partenaire. **Vue d'ensemble** montre **Actions à temps**, **Références**, **Revenu référé** et **Dernier contact**, avec la santé et **Télécharger l'historique (PDF)**.",
                },
                {
                  text: "Onglets : **Contacts**, **Accords**, **Plan d'action**, **Réunions**, **Correspondance**, **Références et revenus**, **Objectifs**, **Opportunités**, **Obligations** et **Historique**.",
                },
              ],
            },
            {
              id: "rows",
              title: "Ajouter, modifier, supprimer",
              steps: [
                {
                  text: "Ouvrez un onglet et cliquez sur **Ajouter**. Remplissez puis **Enregistrer**.",
                },
                {
                  text: "Sur une ligne, **Enregistrer** la rouvre pour modification. **Supprimer** devient **Confirmer la suppression** ; cliquez à nouveau.",
                },
                {
                  text: "Accords : type (MoU, contrat, NDA, SLA), dates, valeur et **Commission de référence (%)** ; **Ajouter une version** pour joindre une copie signée.",
                },
                {
                  text: "Réunions : **Invitation calendrier** télécharge l'invitation ; ensuite **Enregistrer le compte rendu** et **Créer une action** à partir d'une décision.",
                },
                {
                  text: "Plan d'action : **Terminer** quand une action est faite.",
                },
              ],
              tips: [
                "La **Commission de référence (%)** de l'accord sert au calcul des commissions.",
              ],
            },
            {
              id: "edit",
              title: "Modifier ou archiver",
              intro:
                "En haut, **Enregistrer** ouvre les informations du partenaire. **Archiver** retire un partenaire inactif ; **Réactiver** le rétablit. Seuls les responsables des partenariats voient ces boutons.",
            },
          ],
        },
        rw: {
          title: "Gukorana n'umufatanyabikorwa umwe",
          summary:
            "Urupapuro rw'umufatanyabikorwa rufite abo kuvugana, amasezerano, gahunda y'ibikorwa, inama, inzandiko, aboherejwe n'inyungu, intego, amahirwe, inshingano n'amateka.",
          keywords:
            "umufatanyabikorwa abo kuvugana amasezerano inama aboherejwe amateka",
          sections: [
            {
              id: "tabs",
              title: "Menya aho ibintu biri",
              steps: [
                {
                  text: "Fungura umufatanyabikorwa. **Incamake** yerekana **Ibikorwa ku gihe**, **Aboherejwe**, **Inyungu z'aboherejwe** na **Ubwo baherukaga guhura**, n'**Kuramo amateka (PDF)**.",
                },
                {
                  text: "Amatabu: **Abo kuvugana**, **Amasezerano**, **Gahunda y'ibikorwa**, **Inama**, **Inzandiko**, **Aboherejwe n'inyungu**, **Intego**, **Amahirwe**, **Inshingano** na **Amateka**.",
                },
              ],
            },
            {
              id: "rows",
              title: "Ongeraho, hindura, siba",
              steps: [
                {
                  text: "Fungura itabu ukande **Ongeraho**. Uzuza ukande **Bika**.",
                },
                {
                  text: "Ku murongo, **Bika** irawufungura ngo uwuhindure. **Siba** ihinduka **Emeza gusiba**; ongera ukande.",
                },
                {
                  text: "Amasezerano: ubwoko (MoU, amasezerano, NDA, SLA), amatariki, agaciro na **Komisiyo ku boherejwe (%)**; **Ohereza verisiyo** ushyireho kopi yasinywe.",
                },
                {
                  text: "Inama: **Ubutumire bwa kalendari** bukuramo ubutumire; nyuma **Bika inyandiko y'inama** na **Bihindure igikorwa**.",
                },
                {
                  text: "Gahunda y'ibikorwa: **Byarangiye** igikorwa nikirangira.",
                },
              ],
              tips: [
                "**Komisiyo ku boherejwe (%)** iri ku masezerano ni yo ikoreshwa kubara komisiyo.",
              ],
            },
            {
              id: "edit",
              title: "Hindura cyangwa ubike mu bubiko",
              intro:
                "Hejuru, **Bika** ifungura amakuru y'umufatanyabikorwa. **Bika mu bubiko** ikura udakora mu rutonde; **Ongera ukoreshe** iramugarura. Ushinzwe abafatanyabikorwa wenyine ni we ubona izi buto.",
            },
          ],
        },
      },
    },
    {
      slug: "partner-commissions",
      cat: "money",
      minutes: 2,
      updated: U,
      start: true,
      pages: ["/partners/commissions"],
      t: {
        en: {
          title: "Follow partner commissions",
          summary:
            "Commissions are computed from paid cases referred by partners, at the agreement's rate. Finance approves and marks them paid.",
          keywords: "commissions referral payout approve paid reversed",
          sections: [
            {
              id: "read",
              title: "Read the table",
              steps: [
                {
                  text: "Open **Commissions**. Each row shows **Partner**, **Case**, **Paid**, **Rate**, **Commission** and status.",
                },
                {
                  text: "Statuses: **To approve**, **Approved**, **Paid**, **Rejected**, **Reversed (refund)** when the client was refunded.",
                },
              ],
            },
            {
              id: "finance",
              title: "Finance: approve and pay",
              steps: [
                {
                  text: "A Finance officer sees **Approve** and **Reject** on rows **To approve**.",
                },
                {
                  text: "Once paid out, click **Mark paid** on the approved row.",
                },
              ],
              tips: [
                "Partner managers can't approve commissions; a wrong rate is fixed on the partner's agreement.",
              ],
            },
          ],
        },
        fr: {
          title: "Suivre les commissions partenaires",
          summary:
            "Les commissions sont calculées sur les dossiers payés référés par les partenaires, au taux de l'accord. La finance les approuve et les marque payées.",
          keywords: "commissions références approuver payée annulée",
          sections: [
            {
              id: "read",
              title: "Lire le tableau",
              steps: [
                {
                  text: "Ouvrez **Commissions**. Chaque ligne : **Partenaire**, dossier, montant payé, taux, **Commission** et statut.",
                },
                {
                  text: "Statuts : **À approuver**, **Approuvée**, **Payée**, rejetée, **Annulée (remboursement)** si le client a été remboursé.",
                },
              ],
            },
            {
              id: "finance",
              title: "Finance : approuver et payer",
              steps: [
                {
                  text: "Un responsable financier voit **Approuver** et **Rejeter** sur les lignes **À approuver**.",
                },
                { text: "Après versement, cliquez sur **Marquer payée**." },
              ],
              tips: [
                "Les responsables des partenariats n'approuvent pas les commissions ; un mauvais taux se corrige dans l'accord.",
              ],
            },
          ],
        },
        rw: {
          title: "Kurikirana komisiyo z'abafatanyabikorwa",
          summary:
            "Komisiyo zibarwa ku dosiye zishyuwe zoherejwe n'abafatanyabikorwa, ku gipimo cy'amasezerano. Imari irazemeza ikanazandika ko zishyuwe.",
          keywords: "komisiyo aboherejwe emeza yishyuwe",
          sections: [
            {
              id: "read",
              title: "Soma imbonerahamwe",
              steps: [
                {
                  text: "Fungura **Komisiyo**. Buri murongo: umufatanyabikorwa, dosiye, ayishyuwe, igipimo, komisiyo n'uko ihagaze.",
                },
                {
                  text: "Uko zihagaze: **Itegereje kwemezwa**, **Yemejwe**, **Yishyuwe**, yanzwe, **Yasubijwe (gusubizwa)** iyo umukiriya yasubijwe amafaranga.",
                },
              ],
            },
            {
              id: "finance",
              title: "Imari: kwemeza no kwishyura",
              steps: [
                {
                  text: "Ushinzwe imari abona **Emeza** na **Anga** ku mirongo **Itegereje kwemezwa**.",
                },
                {
                  text: "Imaze kwishyurwa, kanda **Yishyuwe** ku murongo wemejwe.",
                },
              ],
              tips: [
                "Ushinzwe abafatanyabikorwa ntiyemeza komisiyo; igipimo kitari cyo gikosorerwa ku masezerano.",
              ],
            },
          ],
        },
      },
    },
  ],
};

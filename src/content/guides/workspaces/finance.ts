import type { Locale } from "@/shared/i18n/config";
import type { WsGuideSet } from "./index";
import en from "@/shared/i18n/dictionaries/en.json";
import fr from "@/shared/i18n/dictionaries/fr.json";
import rw from "@/shared/i18n/dictionaries/rw.json";
import { financeApprovals } from "@/content/pages/finance-approvals";
import { financeCommon } from "@/content/pages/finance-common";
import { financeOverview } from "@/content/pages/finance-overview";
import { financeQuotes } from "@/content/pages/finance-quotes";
import { financeInvoices } from "@/content/pages/finance-invoices";
import { financePayments } from "@/content/pages/finance-payments";
import { financeRecon } from "@/content/pages/finance-recon";
import { financeReceivables } from "@/content/pages/finance-receivables";
import { financeRefunds } from "@/content/pages/finance-refunds";
import { financePayouts } from "@/content/pages/finance-payouts";
import { financeSubscriptions } from "@/content/pages/finance-subscriptions";
import { financeRevenue } from "@/content/pages/finance-revenue";
import { financeReports } from "@/content/pages/finance-reports";
import { financeSettings } from "@/content/pages/finance-settings";
import { procurementDe } from "@/content/pages/procurement-de";
import { copyF } from "@/lib/field/copy-f";
import { guidesCopy } from "../copy";

// finance dashboard guides. rw/fr are drafts for native review. Button/field names come from the same copy the screens
// use, so a label change on screen changes the guide too.
const DICT = { en, fr, rw };
const L = (l: Locale) => ({
  n: DICT[l].wsnav,
  c: financeCommon(l),
  ap: financeApprovals(l),
  ov: financeOverview(l),
  q: financeQuotes(l),
  i: financeInvoices(l),
  p: financePayments(l),
  rc: financeRecon(l),
  ar: financeReceivables(l),
  rf: financeRefunds(l),
  po: financePayouts(l),
  sb: financeSubscriptions(l),
  rv: financeRevenue(l),
  rp: financeReports(l),
  st: financeSettings(l),
  pd: procurementDe(l).payables,
  fd: copyF(l),
  g: guidesCopy(l),
});
/** bold label, with {placeholders} dropped */
const b = (s: string) =>
  `**${s
    .replace(/\s*\{\w+\}\s*/g, " ")
    .replace(/\s+([:·)])/g, "$1")
    .trim()}**`;
const E = L("en"),
  F = L("fr"),
  R = L("rw");
const U = "2026-11-26";

export const FINANCE_WS: WsGuideSet = {
  workspace: "finance",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "billing",
      t: {
        en: "Quotes & invoices",
        fr: "Devis et factures",
        rw: "Ibiciro na fagitire",
      },
    },
    {
      key: "money",
      t: {
        en: "Payments & reconciliation",
        fr: "Paiements et rapprochement",
        rw: "Ubwishyu no guhuza konti",
      },
    },
    {
      key: "collect",
      t: {
        en: "Receivables & refunds",
        fr: "Créances et remboursements",
        rw: "Kwishyuza no gusubiza",
      },
    },
    {
      key: "payout",
      t: {
        en: "Agents, payouts & suppliers",
        fr: "Agents, versements et fournisseurs",
        rw: "Abakozi, kwishyura n'abatanga",
      },
    },
    {
      key: "admin",
      t: {
        en: "Reports & settings",
        fr: "Rapports et paramètres",
        rw: "Raporo n'igenamiterere",
      },
    },
  ],
  guides: [
    // ------------------------------------------------------------------ overview
    {
      slug: "finance-overview",
      cat: "start",
      minutes: 3,
      updated: U,
      pages: ["/finance"],
      start: true,
      t: {
        en: {
          title: "Your finance overview",
          summary:
            "What the overview shows each morning and how to jump straight to the work waiting for you.",
          keywords: "home dashboard today queues cash position ageing",
          facts: { who: "Finance team", time: "3 minutes" },
          sections: [
            {
              id: "read",
              title: "Read the overview",
              steps: [
                {
                  text: `Open ${b(E.n.overview)} in the side menu. The top line greets you and the ${b(E.ov.needsYou)} strip counts proofs, approvals, mismatches and refunds waiting.`,
                  shot: "finance-overview",
                  marks: ["Today's summary", "Work queues"],
                },
                {
                  text: `The tiles show ${b(E.ov.tiles.collected)}, ${b(E.ov.tiles.pending)}, ${b(E.ov.tiles.unreconciled)}, ${b(E.ov.tiles.refunds)} and ${b(E.ov.tiles.allocations)}. Click a tile to open the list behind it.`,
                },
                {
                  text: `Below, check ${b(E.ov.nextPayout)}, ${b(E.ov.ageing)}, ${b(E.ov.renewals)} and ${b(E.ov.cash)}.`,
                },
                {
                  text: `In ${b(E.ov.queues)}, each row has an action (${b(E.ov.qAction.proofs)}, ${b(E.ov.qAction.allocations)}, ${b(E.ov.qAction.unmatched)}, ${b(E.ov.qAction.overdue)}…). Click it to open that queue.`,
                },
              ],
              tips: [
                `${b(E.ov.cash)} stays empty until a bank statement is imported. Use ${b(E.ov.importCta)}.`,
                `Pick another day with ${b(E.ov.date)} to see that day's figures.`,
              ],
            },
            {
              id: "actions",
              title: "Quick actions",
              intro: `The ${b(E.n.overview)} header and the command menu offer ${b(E.i.newInvoice)}, ${b(E.rc.importTitle)}, ${b(E.p.openProofs)} and ${b(E.po.create)} so you never have to hunt for a screen.`,
            },
          ],
        },
        fr: {
          title: "Votre vue d'ensemble finance",
          summary:
            "Ce que la vue d'ensemble montre chaque matin et comment aller droit au travail qui vous attend.",
          keywords: "accueil tableau de bord files trésorerie ancienneté",
          facts: { who: "Équipe finance", time: "3 minutes" },
          sections: [
            {
              id: "read",
              title: "Lire la vue d'ensemble",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.overview)} dans le menu latéral. Le bandeau ${b(F.ov.needsYou)} compte les preuves, approbations, écarts et remboursements en attente.`,
                  shot: "finance-overview",
                  marks: ["Résumé du jour", "Files de travail"],
                },
                {
                  text: `Les tuiles montrent ${b(F.ov.tiles.collected)}, ${b(F.ov.tiles.pending)}, ${b(F.ov.tiles.unreconciled)}, ${b(F.ov.tiles.refunds)} et ${b(F.ov.tiles.allocations)}. Cliquez une tuile pour ouvrir la liste.`,
                },
                {
                  text: `Plus bas, consultez ${b(F.ov.nextPayout)}, ${b(F.ov.ageing)}, ${b(F.ov.renewals)} et ${b(F.ov.cash)}.`,
                },
                {
                  text: `Dans ${b(F.ov.queues)}, chaque ligne a une action (${b(F.ov.qAction.proofs)}, ${b(F.ov.qAction.allocations)}, ${b(F.ov.qAction.unmatched)}, ${b(F.ov.qAction.overdue)}…). Cliquez-la pour ouvrir la file.`,
                },
              ],
              tips: [
                `${b(F.ov.cash)} reste vide tant qu'aucun relevé n'est importé. Utilisez ${b(F.ov.importCta)}.`,
                `Choisissez un autre jour avec ${b(F.ov.date)} pour voir ses chiffres.`,
              ],
            },
            {
              id: "actions",
              title: "Actions rapides",
              intro: `L'en-tête et le menu de commandes proposent ${b(F.i.newInvoice)}, ${b(F.rc.importTitle)}, ${b(F.p.openProofs)} et ${b(F.po.create)}.`,
            },
          ],
        },
        rw: {
          title: "Incamake y'imari",
          summary:
            "Ibyo incamake yerekana buri gitondo n'uko wajya ako kanya ku kazi kagutegereje.",
          keywords: "ahabanza imirongo y'akazi amafaranga ari kuri konti",
          facts: { who: "Itsinda ry'imari", time: "Iminota 3" },
          sections: [
            {
              id: "read",
              title: "Soma incamake",
              steps: [
                {
                  text: `Fungura ${b(R.n.overview)} muri menu y'uruhande. Umurongo ${b(R.ov.needsYou)} ubara ibimenyetso, ibyemezo, ibitandukanye n'ibisubizwa bigutegereje.`,
                  shot: "finance-overview",
                  marks: ["Incamake y'uyu munsi", "Imirongo y'akazi"],
                },
                {
                  text: `Udusanduku twerekana ${b(R.ov.tiles.collected)}, ${b(R.ov.tiles.pending)}, ${b(R.ov.tiles.unreconciled)}, ${b(R.ov.tiles.refunds)} na ${b(R.ov.tiles.allocations)}. Kanda agasanduku ubone urutonde.`,
                },
                {
                  text: `Hasi, reba ${b(R.ov.nextPayout)}, ${b(R.ov.ageing)}, ${b(R.ov.renewals)} na ${b(R.ov.cash)}.`,
                },
                {
                  text: `Muri ${b(R.ov.queues)}, buri murongo ufite igikorwa (${b(R.ov.qAction.proofs)}, ${b(R.ov.qAction.allocations)}, ${b(R.ov.qAction.unmatched)}, ${b(R.ov.qAction.overdue)}…). Kanda ugifungure.`,
                },
              ],
              tips: [
                `${b(R.ov.cash)} ntikigaragara mbere yo kwinjiza raporo ya banki. Koresha ${b(R.ov.importCta)}.`,
                `Hitamo undi munsi kuri ${b(R.ov.date)} ubone imibare yawo.`,
              ],
            },
            {
              id: "actions",
              title: "Ibikorwa byihuse",
              intro: `Hejuru no muri menu y'amabwiriza harimo ${b(R.i.newInvoice)}, ${b(R.rc.importTitle)}, ${b(R.p.openProofs)} na ${b(R.po.create)}.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ approvals
    {
      slug: "finance-approvals-inbox",
      cat: "start",
      minutes: 4,
      updated: U,
      pages: ["/finance/approvals"],
      start: true,
      t: {
        en: {
          title: "Sign approvals (maker-checker)",
          summary:
            "Every money step needs a second person. The Approvals inbox lists what waits for a signature; you sign on the record itself.",
          keywords:
            "maker checker four eyes sign second signature segregation of duties",
          facts: {
            who: "Finance team; executives see only their steps",
            time: "4 minutes",
          },
          sections: [
            {
              id: "inbox",
              title: "Work the inbox",
              steps: [
                {
                  text: `Open ${b(E.n.approvals)} in the side menu.`,
                  shot: "finance-approvals",
                  marks: ["Filter by type", "Waiting steps"],
                },
                {
                  text: `Pick a tab: ${b(E.ap.tabs.all)}, ${b(E.ap.tabs.manual_payment)}, ${b(E.ap.tabs.refund)}, ${b(E.ap.tabs.allocation)}, ${b(E.ap.tabs.batch)} or ${b(E.ap.tabs.setting)}.`,
                },
                {
                  text: `Read ${b(E.ap.col.step)}: ${b(E.ap.mine.sign)} means you can sign; ${b(E.ap.mine.waiting)} or ${b(E.ap.mine.blocked)} means someone else must.`,
                },
                {
                  text: `Click the row to open the record (payment, refund, batch, setting). Sign there with its own button, for example ${b(E.p.checker.approve)} or ${b(E.po.batch.authorise)}.`,
                },
              ],
            },
            {
              id: "bulk",
              title: "Approve several allocations at once",
              steps: [
                {
                  text: `Open the ${b(E.ap.tabs.allocation)} tab and tick the rows marked ${b(E.ap.mine.sign)}.`,
                },
                {
                  text: `Click ${b(E.ap.bulk.approve)} in the bar at the bottom. Check the total pool in the dialog, then confirm.`,
                },
              ],
              tips: [E.ap.bulk.only],
            },
            {
              id: "why",
              title: "Why you can't approve your own work",
              intro:
                "HEBUZA separates duties: the person who records, prepares or changes a money record never signs the next step. The button stays disabled and the record shows who must sign.",
              faq: [
                {
                  q: "A payment of RWF 600,000 needs two signatures?",
                  a: `${E.p.checker.second} ${E.p.checker.exec}`,
                },
                {
                  q: "A row says it returns in a few hours.",
                  a: `Column ${E.ap.col.sla}: if nobody signs, the item goes back to the queue for someone else.`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Signer les approbations (double contrôle)",
          summary:
            "Chaque étape d'argent demande une seconde personne. La boîte Approbations liste ce qui attend une signature ; vous signez sur le dossier lui-même.",
          keywords:
            "double contrôle quatre yeux signature séparation des tâches",
          facts: {
            who: "Équipe finance ; les dirigeants voient seulement leurs étapes",
            time: "4 minutes",
          },
          sections: [
            {
              id: "inbox",
              title: "Traiter la boîte",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.approvals)} dans le menu latéral.`,
                  shot: "finance-approvals",
                  marks: ["Filtrer par type", "Étapes en attente"],
                },
                {
                  text: `Choisissez un onglet : ${b(F.ap.tabs.all)}, ${b(F.ap.tabs.manual_payment)}, ${b(F.ap.tabs.refund)}, ${b(F.ap.tabs.allocation)}, ${b(F.ap.tabs.batch)} ou ${b(F.ap.tabs.setting)}.`,
                },
                {
                  text: `Lisez ${b(F.ap.col.step)} : ${b(F.ap.mine.sign)} veut dire que vous pouvez signer ; ${b(F.ap.mine.waiting)} ou ${b(F.ap.mine.blocked)}, quelqu'un d'autre doit le faire.`,
                },
                {
                  text: `Cliquez la ligne pour ouvrir le dossier, puis signez avec son bouton, par exemple ${b(F.p.checker.approve)} ou ${b(F.po.batch.authorise)}.`,
                },
              ],
            },
            {
              id: "bulk",
              title: "Approuver plusieurs répartitions",
              steps: [
                {
                  text: `Ouvrez l'onglet ${b(F.ap.tabs.allocation)} et cochez les lignes ${b(F.ap.mine.sign)}.`,
                },
                {
                  text: `Cliquez ${b(F.ap.bulk.approve)} dans la barre du bas. Vérifiez le total dans la fenêtre, puis confirmez.`,
                },
              ],
              tips: [F.ap.bulk.only],
            },
            {
              id: "why",
              title:
                "Pourquoi vous ne pouvez pas approuver votre propre travail",
              intro:
                "HEBUZA sépare les tâches : la personne qui saisit, prépare ou modifie un dossier d'argent ne signe jamais l'étape suivante. Le bouton reste désactivé et le dossier indique qui doit signer.",
              faq: [
                {
                  q: "Un paiement de 600 000 RWF demande deux signatures ?",
                  a: `${F.p.checker.second} ${F.p.checker.exec}`,
                },
                {
                  q: "Une ligne indique un retour dans quelques heures.",
                  a: `Colonne ${F.ap.col.sla} : sans signature, l'élément revient dans la file pour quelqu'un d'autre.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Gusinya ibyemezo (ugenzura wa kabiri)",
          summary:
            "Buri ntambwe y'amafaranga isaba undi muntu. Ibyemezo byerekana ibitegereje umukono; usinya kuri dosiye ubwayo.",
          keywords: "ugenzura wa kabiri umukono gutandukanya inshingano",
          facts: {
            who: "Itsinda ry'imari; abayobozi babona intambwe zabo gusa",
            time: "Iminota 4",
          },
          sections: [
            {
              id: "inbox",
              title: "Kora ku byemezo",
              steps: [
                {
                  text: `Fungura ${b(R.n.approvals)} muri menu y'uruhande.`,
                  shot: "finance-approvals",
                  marks: ["Hitamo ubwoko", "Ibitegereje"],
                },
                {
                  text: `Hitamo: ${b(R.ap.tabs.all)}, ${b(R.ap.tabs.manual_payment)}, ${b(R.ap.tabs.refund)}, ${b(R.ap.tabs.allocation)}, ${b(R.ap.tabs.batch)} cyangwa ${b(R.ap.tabs.setting)}.`,
                },
                {
                  text: `Reba ${b(R.ap.col.step)}: ${b(R.ap.mine.sign)} bivuze ko ushobora gusinya; ${b(R.ap.mine.waiting)} cyangwa ${b(R.ap.mine.blocked)} bivuze ko ari undi.`,
                },
                {
                  text: `Kanda umurongo ufungure dosiye, usinye ukoresheje buto yayo, urugero ${b(R.p.checker.approve)} cyangwa ${b(R.po.batch.authorise)}.`,
                },
              ],
            },
            {
              id: "bulk",
              title: "Kwemeza amagabana menshi icyarimwe",
              steps: [
                {
                  text: `Fungura ${b(R.ap.tabs.allocation)} uhitemo imirongo ifite ${b(R.ap.mine.sign)}.`,
                },
                {
                  text: `Kanda ${b(R.ap.bulk.approve)} hasi. Reba igiteranyo mu idirishya, hanyuma wemeze.`,
                },
              ],
              tips: [R.ap.bulk.only],
            },
            {
              id: "why",
              title: "Impamvu utakwemeza ibyo wakoze",
              intro:
                "HEBUZA itandukanya inshingano: uwanditse, uwateguye cyangwa uwahinduye dosiye y'amafaranga ntasinya intambwe ikurikira. Buto ntikora, kandi dosiye yerekana ugomba gusinya.",
              faq: [
                {
                  q: "Ubwishyu bwa RWF 600,000 busaba imikono ibiri?",
                  a: `${R.p.checker.second} ${R.p.checker.exec}`,
                },
                {
                  q: "Umurongo uvuga ko uzagaruka mu masaha make.",
                  a: `Inkingi ${R.ap.col.sla}: nta usinye, bisubira ku murongo ngo undi abikore.`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ quotes
    {
      slug: "finance-quotes",
      cat: "billing",
      minutes: 5,
      updated: U,
      pages: ["/finance/quotes"],
      t: {
        en: {
          title: "Create, send and convert a quote",
          summary:
            "Build a quote from a case, send it to the client, revise it if they ask, then turn the accepted version into invoices.",
          keywords: "quotation devis estimate proforma convert revise withdraw",
          facts: {
            who: "Finance team",
            time: "5 minutes",
            need: ["An open case"],
          },
          sections: [
            {
              id: "create",
              title: "Create the draft",
              steps: [
                {
                  text: `Open ${b(E.n.quotes)} in the side menu and click ${b(E.q.newQuote)}.`,
                  shot: "finance-quotes",
                  marks: ["New quote", "Views by state", "Quotes"],
                },
                {
                  text: `In ${b(E.q.newDialog.title)}, choose the ${b(E.q.newDialog.case)} and click ${b(E.q.newDialog.create)}. ${E.q.newDialog.hint}`,
                  shot: "finance-quote-new",
                  marks: ["Pick the case"],
                },
                {
                  text: `Fill ${b(E.q.billTo)} (${b(E.q.tin)} for a company), ${b(E.q.validity)}, ${b(E.q.language)} and the ${b(E.q.lines)}. ${E.q.linesHint}`,
                },
                {
                  text: `${E.q.save.idle}. Use ${b(E.q.actions.preview)} to see the PDF.`,
                },
              ],
            },
            {
              id: "send",
              title: "Send it",
              steps: [
                {
                  text: `Click ${b(E.q.actions.send)}. If it stays disabled, the ${b(E.q.blockers.title)} box lists what to fix.`,
                },
                {
                  text: `In the dialog tick the ${b(E.q.send.channels)} (${b(E.q.send.email)}, ${b(E.q.send.portal)}, ${b(E.q.send.whatsapp)}), add a ${b(E.q.send.message)} and click ${b(E.q.send.confirm)}.`,
                },
              ],
              warn: `${E.q.banners.pendingMine} Above the approval limit, a second finance user uses ${b(E.q.actions.approveSend)}.`,
            },
            {
              id: "after",
              title: "After the client answers",
              steps: [
                {
                  text: `${b(E.c.status.changes_requested)} or ${b(E.c.status.expired)}: click ${b(E.q.actions.revise)}. A new version is drafted; the old one stays in ${b(E.q.revisions.title)}.`,
                },
                {
                  text: `${b(E.c.status.accepted)}: click ${b(E.q.actions.convert)}, check deposit and balance, and click ${b(E.q.convert.confirm)}. ${E.q.convert.two}`,
                },
                {
                  text: `To stop a sent quote, click ${b(E.q.actions.withdraw)}, choose a ${b(E.q.withdraw.reason)} and confirm ${b(E.q.withdraw.confirm)}.`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Créer, envoyer et convertir un devis",
          summary:
            "Préparez un devis depuis un dossier, envoyez-le, révisez-le si besoin, puis transformez la version acceptée en factures.",
          keywords: "devis estimation proforma convertir réviser retirer",
          facts: {
            who: "Équipe finance",
            time: "5 minutes",
            need: ["Un dossier ouvert"],
          },
          sections: [
            {
              id: "create",
              title: "Créer le brouillon",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.quotes)} dans le menu latéral et cliquez ${b(F.q.newQuote)}.`,
                  shot: "finance-quotes",
                  marks: ["Nouveau devis", "Vues par état", "Devis"],
                },
                {
                  text: `Dans ${b(F.q.newDialog.title)}, choisissez le ${b(F.q.newDialog.case)} et cliquez ${b(F.q.newDialog.create)}. ${F.q.newDialog.hint}`,
                  shot: "finance-quote-new",
                  marks: ["Choisir le dossier"],
                },
                {
                  text: `Remplissez ${b(F.q.billTo)} (${b(F.q.tin)} pour une société), ${b(F.q.validity)}, ${b(F.q.language)} et les ${b(F.q.lines)}. ${F.q.linesHint}`,
                },
                {
                  text: `${F.q.save.idle}. ${b(F.q.actions.preview)} affiche le PDF.`,
                },
              ],
            },
            {
              id: "send",
              title: "L'envoyer",
              steps: [
                {
                  text: `Cliquez ${b(F.q.actions.send)}. S'il reste grisé, l'encadré ${b(F.q.blockers.title)} dit quoi corriger.`,
                },
                {
                  text: `Cochez les ${b(F.q.send.channels)} (${b(F.q.send.email)}, ${b(F.q.send.portal)}, ${b(F.q.send.whatsapp)}), ajoutez un ${b(F.q.send.message)} et cliquez ${b(F.q.send.confirm)}.`,
                },
              ],
              warn: `${F.q.banners.pendingMine} Au-dessus du seuil, un second utilisateur finance utilise ${b(F.q.actions.approveSend)}.`,
            },
            {
              id: "after",
              title: "Après la réponse du client",
              steps: [
                {
                  text: `${b(F.c.status.changes_requested)} ou ${b(F.c.status.expired)} : cliquez ${b(F.q.actions.revise)}. Une nouvelle version est créée ; l'ancienne reste dans ${b(F.q.revisions.title)}.`,
                },
                {
                  text: `${b(F.c.status.accepted)} : cliquez ${b(F.q.actions.convert)}, vérifiez acompte et solde, puis ${b(F.q.convert.confirm)}. ${F.q.convert.two}`,
                },
                {
                  text: `Pour arrêter un devis envoyé : ${b(F.q.actions.withdraw)}, choisissez un ${b(F.q.withdraw.reason)} et confirmez ${b(F.q.withdraw.confirm)}.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Gukora, kohereza no guhindura igiciro fagitire",
          summary:
            "Kora igiciro uhereye kuri dosiye, ucyohereze ku mukiriya, ugisubiremo nibiba ngombwa, hanyuma icyemewe ukigire fagitire.",
          keywords: "igiciro proforma guhindura gusubiramo gukuraho",
          facts: {
            who: "Itsinda ry'imari",
            time: "Iminota 5",
            need: ["Dosiye ifunguye"],
          },
          sections: [
            {
              id: "create",
              title: "Kora umushinga",
              steps: [
                {
                  text: `Fungura ${b(R.n.quotes)} muri menu y'uruhande ukande ${b(R.q.newQuote)}.`,
                  shot: "finance-quotes",
                  marks: ["Igiciro gishya", "Uko bihagaze", "Ibiciro"],
                },
                {
                  text: `Muri ${b(R.q.newDialog.title)}, hitamo ${b(R.q.newDialog.case)} ukande ${b(R.q.newDialog.create)}. ${R.q.newDialog.hint}`,
                  shot: "finance-quote-new",
                  marks: ["Hitamo dosiye"],
                },
                {
                  text: `Uzuza ${b(R.q.billTo)} (${b(R.q.tin)} ku kigo), ${b(R.q.validity)}, ${b(R.q.language)} n'${b(R.q.lines)}. ${R.q.linesHint}`,
                },
                {
                  text: `${R.q.save.idle}. ${b(R.q.actions.preview)} ikwereka PDF.`,
                },
              ],
            },
            {
              id: "send",
              title: "Cyohereze",
              steps: [
                {
                  text: `Kanda ${b(R.q.actions.send)}. Niba idakora, agasanduku ${b(R.q.blockers.title)} kerekana icyo gukosora.`,
                },
                {
                  text: `Hitamo ${b(R.q.send.channels)} (${b(R.q.send.email)}, ${b(R.q.send.portal)}, ${b(R.q.send.whatsapp)}), wongereho ${b(R.q.send.message)} ukande ${b(R.q.send.confirm)}.`,
                },
              ],
              warn: `${R.q.banners.pendingMine} Hejuru y'urugero, undi mukozi w'imari akoresha ${b(R.q.actions.approveSend)}.`,
            },
            {
              id: "after",
              title: "Umukiriya amaze gusubiza",
              steps: [
                {
                  text: `${b(R.c.status.changes_requested)} cyangwa ${b(R.c.status.expired)}: kanda ${b(R.q.actions.revise)}. Haboneka verisiyo nshya; iya kera iguma muri ${b(R.q.revisions.title)}.`,
                },
                {
                  text: `${b(R.c.status.accepted)}: kanda ${b(R.q.actions.convert)}, urebe avansi n'asigaye, ukande ${b(R.q.convert.confirm)}. ${R.q.convert.two}`,
                },
                {
                  text: `Guhagarika igiciro cyoherejwe: ${b(R.q.actions.withdraw)}, hitamo ${b(R.q.withdraw.reason)} wemeze ${b(R.q.withdraw.confirm)}.`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ invoices
    {
      slug: "finance-invoices",
      cat: "billing",
      minutes: 6,
      updated: U,
      pages: ["/finance/invoices"],
      start: true,
      t: {
        en: {
          title: "Create, issue and void invoices",
          summary:
            "Issue a standalone invoice, record the EBM number, send reminders, apply client credit, and void or credit an invoice the right way.",
          keywords:
            "invoice bill ebm void cancel credit note reminder deposit renewal",
          facts: { who: "Finance team", time: "6 minutes" },
          sections: [
            {
              id: "list",
              title: "Find an invoice",
              steps: [
                {
                  text: `Open ${b(E.n.invoices)} in the side menu.`,
                  shot: "finance-invoices",
                  marks: ["New invoice", "Saved views", "Invoices"],
                },
                {
                  text: `Use the views ${b(E.i.views.overdue)}, ${b(E.i.views.missing_ebm)}, ${b(E.i.views.renewals)}, ${b(E.i.views.deposits)} or ${b(E.i.views.drafts)}, or search by number, client or case. Click a row to open it.`,
                },
              ],
            },
            {
              id: "create",
              title: "Create a standalone invoice",
              intro:
                "Invoices for quoted work come from Convert to invoice on the quote. Use this for retainers and extras.",
              steps: [
                {
                  text: `Click ${b(E.i.newInvoice)}.`,
                  shot: "finance-invoice-new",
                  marks: ["Choose the client"],
                },
                {
                  text: `Choose the ${b(E.i.new.client)}, optionally a ${b(E.i.new.case)}, the ${b(E.i.new.series)}, ${b(E.i.new.due)} and ${b(E.i.new.language)}.`,
                },
                { text: `Add the ${b(E.i.new.lines)}. ${E.i.new.linesHint}` },
                {
                  text: `Click ${b(E.i.new.saveIssue)}, or ${b(E.i.new.saveDraft)} to finish later.`,
                },
              ],
              warn: E.i.issue.body.replace(/\{series\}-•••••/, "the series"),
            },
            {
              id: "detail",
              title: "Work on an issued invoice",
              steps: [
                {
                  text: `The tabs show ${b(E.i.tabs.details)}, ${b(E.i.tabs.payments)}, ${b(E.i.tabs.credit)}, ${b(E.i.tabs.documents)}, ${b(E.i.tabs.reminders)} and ${b(E.i.tabs.history)}.`,
                  shot: "finance-invoice-detail",
                  marks: ["Tabs", "Record payment", "Send reminder", "Void"],
                },
                {
                  text: `Type the ${b(E.i.side.ebm)} and click ${b(E.i.side.ebmSave)}. ${E.i.side.ebmHint}`,
                },
                {
                  text: `${b(E.i.actions.record)} opens the manual payment form with this invoice filled in.`,
                },
                {
                  text: `${b(E.i.actions.remind)}: choose the ${b(E.i.remind.channel)} and confirm.`,
                },
                {
                  text: `If the client has credit, click ${b(E.i.side.apply)}, enter the amount (or ${b(E.i.credit.useMax)}) and click ${b(E.i.credit.confirm)}.`,
                },
              ],
            },
            {
              id: "void",
              title: "Void or credit",
              steps: [
                {
                  text: `No confirmed payment yet: click ${b(E.i.actions.void)}, pick a reason, then ${b(E.i.void.confirm)}. ${E.i.void.body}`,
                },
                {
                  text: `Paid or partly paid: click ${b(E.i.actions.creditNote)}. It opens a refund request; the credit note is issued when the refund is approved (see the refunds guide).`,
                },
              ],
              warn: E.i.voidBlocked,
            },
          ],
        },
        fr: {
          title: "Créer, émettre et annuler des factures",
          summary:
            "Émettre une facture autonome, saisir le numéro EBM, relancer, imputer un avoir client, et annuler ou créditer correctement.",
          keywords: "facture ebm annuler avoir relance acompte renouvellement",
          facts: { who: "Équipe finance", time: "6 minutes" },
          sections: [
            {
              id: "list",
              title: "Trouver une facture",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.invoices)} dans le menu latéral.`,
                  shot: "finance-invoices",
                  marks: ["Nouvelle facture", "Vues", "Factures"],
                },
                {
                  text: `Utilisez les vues ${b(F.i.views.overdue)}, ${b(F.i.views.missing_ebm)}, ${b(F.i.views.renewals)}, ${b(F.i.views.deposits)} ou ${b(F.i.views.drafts)}, ou cherchez. Cliquez une ligne pour l'ouvrir.`,
                },
              ],
            },
            {
              id: "create",
              title: "Créer une facture autonome",
              intro:
                "Les factures de travaux chiffrés viennent de Convertir en facture sur le devis. Ceci sert aux forfaits et aux extras.",
              steps: [
                {
                  text: `Cliquez ${b(F.i.newInvoice)}.`,
                  shot: "finance-invoice-new",
                  marks: ["Choisir le client"],
                },
                {
                  text: `Choisissez le ${b(F.i.new.client)}, éventuellement un ${b(F.i.new.case)}, la ${b(F.i.new.series)}, l'${b(F.i.new.due)} et la ${b(F.i.new.language)}.`,
                },
                {
                  text: `Ajoutez les ${b(F.i.new.lines)}. ${F.i.new.linesHint}`,
                },
                {
                  text: `Cliquez ${b(F.i.new.saveIssue)}, ou ${b(F.i.new.saveDraft)} pour finir plus tard.`,
                },
              ],
              warn: "Une facture émise reçoit le numéro suivant et ne peut plus être modifiée.",
            },
            {
              id: "detail",
              title: "Travailler sur une facture émise",
              steps: [
                {
                  text: `Les onglets : ${b(F.i.tabs.details)}, ${b(F.i.tabs.payments)}, ${b(F.i.tabs.credit)}, ${b(F.i.tabs.documents)}, ${b(F.i.tabs.reminders)} et ${b(F.i.tabs.history)}.`,
                  shot: "finance-invoice-detail",
                  marks: [
                    "Onglets",
                    "Enregistrer un paiement",
                    "Relancer",
                    "Annuler",
                  ],
                },
                {
                  text: `Saisissez le ${b(F.i.side.ebm)} et cliquez ${b(F.i.side.ebmSave)}. ${F.i.side.ebmHint}`,
                },
                {
                  text: `${b(F.i.actions.record)} ouvre le formulaire de paiement manuel pour cette facture.`,
                },
                {
                  text: `${b(F.i.actions.remind)} : choisissez le ${b(F.i.remind.channel)} et confirmez.`,
                },
                {
                  text: `Si le client a un avoir, cliquez ${b(F.i.side.apply)}, saisissez le montant (ou ${b(F.i.credit.useMax)}) puis ${b(F.i.credit.confirm)}.`,
                },
              ],
            },
            {
              id: "void",
              title: "Annuler ou créditer",
              steps: [
                {
                  text: `Sans paiement confirmé : ${b(F.i.actions.void)}, choisissez un motif, puis ${b(F.i.void.confirm)}. ${F.i.void.body}`,
                },
                {
                  text: `Payée ou en partie : ${b(F.i.actions.creditNote)}. Cela ouvre une demande de remboursement ; l'avoir est émis à son approbation.`,
                },
              ],
              warn: F.i.voidBlocked,
            },
          ],
        },
        rw: {
          title: "Gukora, gusohora no guhagarika fagitire",
          summary:
            "Sohora fagitire yigenga, wandike nomero ya EBM, wohereze ibyibutsa, ukoreshe inguzanyo y'umukiriya, kandi uhagarike cyangwa ugabanye fagitire neza.",
          keywords:
            "fagitire ebm guhagarika inyandiko y'inguzanyo kwibutsa avansi",
          facts: { who: "Itsinda ry'imari", time: "Iminota 6" },
          sections: [
            {
              id: "list",
              title: "Shaka fagitire",
              steps: [
                {
                  text: `Fungura ${b(R.n.invoices)} muri menu y'uruhande.`,
                  shot: "finance-invoices",
                  marks: ["Fagitire nshya", "Uburyo bwo kureba", "Fagitire"],
                },
                {
                  text: `Koresha ${b(R.i.views.overdue)}, ${b(R.i.views.missing_ebm)}, ${b(R.i.views.renewals)}, ${b(R.i.views.deposits)} cyangwa ${b(R.i.views.drafts)}, cyangwa ushakishe. Kanda umurongo uyifungure.`,
                },
              ],
            },
            {
              id: "create",
              title: "Kora fagitire yigenga",
              intro:
                "Fagitire z'akazi gafite igiciro ziva ku gihindura igiciro fagitire. Ibi ni iby'amasezerano ahoraho n'inyongera.",
              steps: [
                {
                  text: `Kanda ${b(R.i.newInvoice)}.`,
                  shot: "finance-invoice-new",
                  marks: ["Hitamo umukiriya"],
                },
                {
                  text: `Hitamo ${b(R.i.new.client)}, ${b(R.i.new.case)} niba ihari, ${b(R.i.new.series)}, ${b(R.i.new.due)} na ${b(R.i.new.language)}.`,
                },
                { text: `Ongeraho ${b(R.i.new.lines)}. ${R.i.new.linesHint}` },
                {
                  text: `Kanda ${b(R.i.new.saveIssue)}, cyangwa ${b(R.i.new.saveDraft)} uzarangize nyuma.`,
                },
              ],
              warn: "Fagitire yasohotse ihabwa nomero ikurikira kandi ntishobora guhindurwa.",
            },
            {
              id: "detail",
              title: "Gukora kuri fagitire yasohotse",
              steps: [
                {
                  text: `Ibice: ${b(R.i.tabs.details)}, ${b(R.i.tabs.payments)}, ${b(R.i.tabs.credit)}, ${b(R.i.tabs.documents)}, ${b(R.i.tabs.reminders)} na ${b(R.i.tabs.history)}.`,
                  shot: "finance-invoice-detail",
                  marks: [
                    "Ibice",
                    "Andika ubwishyu",
                    "Ohereza kwibutsa",
                    "Hagarika",
                  ],
                },
                {
                  text: `Andika ${b(R.i.side.ebm)} ukande ${b(R.i.side.ebmSave)}. ${R.i.side.ebmHint}`,
                },
                {
                  text: `${b(R.i.actions.record)} ifungura ifishi y'ubwishyu bwanditswe n'intoki kuri iyi fagitire.`,
                },
                {
                  text: `${b(R.i.actions.remind)}: hitamo ${b(R.i.remind.channel)} wemeze.`,
                },
                {
                  text: `Niba umukiriya afite inguzanyo, kanda ${b(R.i.side.apply)}, andika amafaranga (cyangwa ${b(R.i.credit.useMax)}) ukande ${b(R.i.credit.confirm)}.`,
                },
              ],
            },
            {
              id: "void",
              title: "Guhagarika cyangwa kugabanya",
              steps: [
                {
                  text: `Nta bwishyu bwemejwe: ${b(R.i.actions.void)}, hitamo impamvu, hanyuma ${b(R.i.void.confirm)}. ${R.i.void.body}`,
                },
                {
                  text: `Yishyuwe cyangwa igice: ${b(R.i.actions.creditNote)}. Bifungura ubusabe bwo gusubiza; inyandiko y'inguzanyo isohoka iyo bwemejwe.`,
                },
              ],
              warn: R.i.voidBlocked,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ payments
    {
      slug: "finance-record-payment",
      cat: "money",
      minutes: 5,
      updated: U,
      pages: ["/finance/payments"],
      start: true,
      t: {
        en: {
          title: "Track payments and record a manual payment",
          summary:
            "See every MoMo, Airtel, card and bank payment, record cash or a transfer without proof, and confirm someone else's entry.",
          keywords:
            "momo mtn airtel card bank transfer cash manual payment confirm reverse receipt",
          facts: {
            who: "Finance team",
            time: "5 minutes",
            need: [
              "The invoice number",
              "Evidence: receipt, slip or signed cash note",
            ],
          },
          sections: [
            {
              id: "track",
              title: "Follow payments",
              steps: [
                {
                  text: `Open ${b(E.n.payments)} in the side menu.`,
                  shot: "finance-payments",
                  marks: [
                    "Record a payment",
                    "Proofs to verify",
                    "Payment views",
                    "Payments",
                  ],
                },
                {
                  text: `Use ${b(E.p.tabs.pending)}, ${b(E.p.tabs.verification)}, ${b(E.p.tabs.failed)}, ${b(E.p.tabs.expired)}, ${b(E.p.tabs.reversed)} or ${b(E.p.tabs.attention)}. Filter by ${b(E.p.filters.method)}: ${E.c.method.mtn_momo}, ${E.c.method.airtel_money}, ${E.c.method.card}, ${E.c.method.bank_transfer}, ${E.c.method.cash}.`,
                },
                {
                  text: `Click a row. The drawer shows ${b(E.p.drawer.details)}, ${b(E.p.drawer.timeline)} and ${b(E.p.drawer.history)}. ${b(E.p.drawer.verifyNow)} asks the provider again; ${b(E.p.drawer.receipt)} shows the receipt.`,
                },
              ],
              tips: [
                "Mobile money and card payments confirm by themselves through the provider. You only act on what stays pending, fails or needs attention.",
              ],
            },
            {
              id: "record",
              title: "Record a cash or bank payment",
              steps: [
                {
                  text: `Click ${b(E.p.recordCash)}.`,
                  shot: "finance-record-payment",
                  marks: ["The form"],
                },
                {
                  text: `Choose the ${b(E.p.manual.invoice)}, the ${b(E.p.manual.method)} and the ${b(E.p.manual.amount)}. ${E.p.manual.amountHint}`,
                },
                {
                  text: `For a bank transfer enter the ${b(E.p.manual.bankRef)}. ${E.p.manual.bankRefHint}`,
                },
                {
                  text: `Set ${b(E.p.manual.received)}, attach the ${b(E.p.manual.evidence)}, choose a ${b(E.p.manual.reason)}.`,
                },
                { text: `Click ${b(E.p.manual.submit)}. ${E.p.manual.done}` },
              ],
              warn: E.p.manual.chainBody,
            },
            {
              id: "confirm",
              title: "Confirm a colleague's payment",
              steps: [
                {
                  text: `Open it from ${b(E.n.approvals)} › ${b(E.ap.tabs.manual_payment)}. Compare the ${b(E.p.checker.evidence)} with the ${b(E.p.checker.statement)}.`,
                },
                {
                  text: `Click ${b(E.p.checker.approve)}, or ${b(E.p.checker.reject)} with a reason. ${b(E.p.checker.sendBack)} hands it back to the queue.`,
                },
              ],
              tips: [E.p.checker.second, E.p.checker.exec],
            },
            {
              id: "reverse",
              title: "Reverse a payment",
              steps: [
                {
                  text: `In the payment drawer click ${b(E.p.drawer.reverse)}, choose the reason and read ${b(E.p.reverse.impact)}.`,
                },
                { text: `Click ${b(E.p.reverse.confirm)}.` },
              ],
              warn: `${E.p.reverse.body} The invoice reopens and the agent allocation is reversed.`,
            },
          ],
        },
        fr: {
          title: "Suivre les paiements et saisir un paiement manuel",
          summary:
            "Voyez chaque paiement MoMo, Airtel, carte et virement, saisissez une somme en espèces ou un virement sans preuve, et confirmez la saisie d'un collègue.",
          keywords:
            "momo mtn airtel carte virement espèces paiement manuel confirmer annuler reçu",
          facts: {
            who: "Équipe finance",
            time: "5 minutes",
            need: [
              "Le numéro de facture",
              "Une preuve : reçu, bordereau ou note signée",
            ],
          },
          sections: [
            {
              id: "track",
              title: "Suivre les paiements",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.payments)} dans le menu latéral.`,
                  shot: "finance-payments",
                  marks: [
                    "Saisir un paiement",
                    "Preuves à vérifier",
                    "Vues",
                    "Paiements",
                  ],
                },
                {
                  text: `Utilisez ${b(F.p.tabs.pending)}, ${b(F.p.tabs.verification)}, ${b(F.p.tabs.failed)}, ${b(F.p.tabs.expired)}, ${b(F.p.tabs.reversed)} ou ${b(F.p.tabs.attention)}. Filtrez par ${b(F.p.filters.method)}.`,
                },
                {
                  text: `Cliquez une ligne. Le panneau montre ${b(F.p.drawer.details)}, ${b(F.p.drawer.timeline)} et ${b(F.p.drawer.history)}. ${b(F.p.drawer.verifyNow)} interroge le fournisseur ; ${b(F.p.drawer.receipt)} affiche le reçu.`,
                },
              ],
              tips: [
                "Les paiements mobile money et carte se confirment seuls via le fournisseur. Vous n'agissez que sur ce qui reste en attente, échoue ou demande attention.",
              ],
            },
            {
              id: "record",
              title: "Saisir un paiement en espèces ou par virement",
              steps: [
                {
                  text: `Cliquez ${b(F.p.recordCash)}.`,
                  shot: "finance-record-payment",
                  marks: ["Le formulaire"],
                },
                {
                  text: `Choisissez la ${b(F.p.manual.invoice)}, la ${b(F.p.manual.method)} et le ${b(F.p.manual.amount)}. ${F.p.manual.amountHint}`,
                },
                {
                  text: `Pour un virement, saisissez la ${b(F.p.manual.bankRef)}. ${F.p.manual.bankRefHint}`,
                },
                {
                  text: `Indiquez ${b(F.p.manual.received)}, joignez la ${b(F.p.manual.evidence)}, choisissez un ${b(F.p.manual.reason)}.`,
                },
                { text: `Cliquez ${b(F.p.manual.submit)}. ${F.p.manual.done}` },
              ],
              warn: F.p.manual.chainBody,
            },
            {
              id: "confirm",
              title: "Confirmer le paiement d'un collègue",
              steps: [
                {
                  text: `Ouvrez-le depuis ${b(F.n.approvals)} › ${b(F.ap.tabs.manual_payment)}. Comparez la ${b(F.p.checker.evidence)} avec la ${b(F.p.checker.statement)}.`,
                },
                {
                  text: `Cliquez ${b(F.p.checker.approve)}, ou ${b(F.p.checker.reject)} avec un motif. ${b(F.p.checker.sendBack)} le rend à la file.`,
                },
              ],
              tips: [F.p.checker.second, F.p.checker.exec],
            },
            {
              id: "reverse",
              title: "Contre-passer un paiement",
              steps: [
                {
                  text: `Dans le panneau du paiement, cliquez ${b(F.p.drawer.reverse)}, choisissez le motif et lisez ${b(F.p.reverse.impact)}.`,
                },
                { text: `Cliquez ${b(F.p.reverse.confirm)}.` },
              ],
              warn: `${F.p.reverse.body} La facture se rouvre et la répartition de l'agent est annulée.`,
            },
          ],
        },
        rw: {
          title: "Gukurikirana ubwishyu no kwandika ubwishyu n'intoki",
          summary:
            "Reba ubwishyu bwose bwa MoMo, Airtel, ikarita na banki, wandike amafaranga y'intoki cyangwa ayoherejwe nta kimenyetso, kandi wemeze ibyo mugenzi wawe yanditse.",
          keywords:
            "momo mtn airtel ikarita banki amafaranga y'intoki kwemeza gusubiza inyemezabwishyu",
          facts: {
            who: "Itsinda ry'imari",
            time: "Iminota 5",
            need: [
              "Nomero ya fagitire",
              "Ikimenyetso: inyemezabwishyu cyangwa urupapuro rusinye",
            ],
          },
          sections: [
            {
              id: "track",
              title: "Gukurikirana ubwishyu",
              steps: [
                {
                  text: `Fungura ${b(R.n.payments)} muri menu y'uruhande.`,
                  shot: "finance-payments",
                  marks: [
                    "Andika ubwishyu",
                    "Ibimenyetso byo kugenzura",
                    "Uburyo bwo kureba",
                    "Ubwishyu",
                  ],
                },
                {
                  text: `Koresha ${b(R.p.tabs.pending)}, ${b(R.p.tabs.verification)}, ${b(R.p.tabs.failed)}, ${b(R.p.tabs.expired)}, ${b(R.p.tabs.reversed)} cyangwa ${b(R.p.tabs.attention)}. Shungura ukoresheje ${b(R.p.filters.method)}.`,
                },
                {
                  text: `Kanda umurongo. Hagaragara ${b(R.p.drawer.details)}, ${b(R.p.drawer.timeline)} na ${b(R.p.drawer.history)}. ${b(R.p.drawer.verifyNow)} ibaza ikigo cyishyuza; ${b(R.p.drawer.receipt)} yerekana inyemezabwishyu.`,
                },
              ],
              tips: [
                "Ubwishyu bwa mobile money n'ikarita bwiyemeza ubwabwo. Ukora gusa ku butegereje, ubwanze cyangwa ubukeneye kwitabwaho.",
              ],
            },
            {
              id: "record",
              title: "Kwandika amafaranga y'intoki cyangwa ya banki",
              steps: [
                {
                  text: `Kanda ${b(R.p.recordCash)}.`,
                  shot: "finance-record-payment",
                  marks: ["Ifishi"],
                },
                {
                  text: `Hitamo ${b(R.p.manual.invoice)}, ${b(R.p.manual.method)} na ${b(R.p.manual.amount)}. ${R.p.manual.amountHint}`,
                },
                {
                  text: `Ku yoherejwe kuri banki, andika ${b(R.p.manual.bankRef)}. ${R.p.manual.bankRefHint}`,
                },
                {
                  text: `Shyiraho ${b(R.p.manual.received)}, ongeraho ${b(R.p.manual.evidence)}, hitamo ${b(R.p.manual.reason)}.`,
                },
                { text: `Kanda ${b(R.p.manual.submit)}. ${R.p.manual.done}` },
              ],
              warn: R.p.manual.chainBody,
            },
            {
              id: "confirm",
              title: "Kwemeza ubwishyu bwanditswe na mugenzi wawe",
              steps: [
                {
                  text: `Bufungure muri ${b(R.n.approvals)} › ${b(R.ap.tabs.manual_payment)}. Gereranya ${b(R.p.checker.evidence)} na ${b(R.p.checker.statement)}.`,
                },
                {
                  text: `Kanda ${b(R.p.checker.approve)}, cyangwa ${b(R.p.checker.reject)} ufite impamvu. ${b(R.p.checker.sendBack)} ibusubiza ku murongo.`,
                },
              ],
              tips: [R.p.checker.second, R.p.checker.exec],
            },
            {
              id: "reverse",
              title: "Gusubiza inyuma ubwishyu",
              steps: [
                {
                  text: `Mu idirishya ry'ubwishyu, kanda ${b(R.p.drawer.reverse)}, hitamo impamvu usome ${b(R.p.reverse.impact)}.`,
                },
                { text: `Kanda ${b(R.p.reverse.confirm)}.` },
              ],
              warn: `${R.p.reverse.body} Fagitire yongera gufunguka kandi umugabane w'umukozi ugasubizwa inyuma.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ proofs
    {
      slug: "finance-transfer-proofs",
      cat: "money",
      minutes: 3,
      updated: U,
      pages: ["/finance/payments/proofs"],
      t: {
        en: {
          title: "Verify bank transfer proofs",
          summary:
            "Clients upload a transfer slip; you check it against the statement, then confirm or reject it.",
          keywords: "proof slip bank transfer verify",
          facts: { who: "Finance team", time: "3 minutes per proof" },
          sections: [
            {
              id: "check",
              title: "Check a proof",
              steps: [
                {
                  text: `In ${b(E.n.payments)}, click ${b(E.p.openProofs)}.`,
                  shot: "finance-proofs",
                  marks: ["Proof queue"],
                },
                {
                  text: `Pick a proof in ${b(E.p.proofs.queueLabel)} (J / K move, Enter opens). ${E.p.checker.lockedYou}`,
                },
                {
                  text: `Compare ${b(E.p.proofs.tabPreview)} with ${b(E.p.proofs.tabStatement)}: ${b(E.p.proofs.amount)}, ${b(E.p.proofs.ref)}, ${b(E.p.proofs.candidate)}.`,
                },
                {
                  text: `If both agree, click ${b(E.p.proofs.confirmMatch)}. Otherwise click ${b(E.p.checker.reject)}, choose a reason and ${b(E.p.reject.confirm)}. ${E.p.reject.body}`,
                },
              ],
              tips: [E.p.proofs.unreadable],
            },
          ],
        },
        fr: {
          title: "Vérifier les preuves de virement",
          summary:
            "Le client envoie un bordereau ; vous le comparez au relevé, puis vous confirmez ou rejetez.",
          keywords: "preuve bordereau virement vérifier",
          facts: { who: "Équipe finance", time: "3 minutes par preuve" },
          sections: [
            {
              id: "check",
              title: "Vérifier une preuve",
              steps: [
                {
                  text: `Dans ${b(F.n.payments)}, cliquez ${b(F.p.openProofs)}.`,
                  shot: "finance-proofs",
                  marks: ["File des preuves"],
                },
                {
                  text: `Choisissez une preuve dans ${b(F.p.proofs.queueLabel)} (J / K, Entrée pour ouvrir). ${F.p.checker.lockedYou}`,
                },
                {
                  text: `Comparez ${b(F.p.proofs.tabPreview)} et ${b(F.p.proofs.tabStatement)} : ${b(F.p.proofs.amount)}, ${b(F.p.proofs.ref)}, ${b(F.p.proofs.candidate)}.`,
                },
                {
                  text: `S'ils concordent, cliquez ${b(F.p.proofs.confirmMatch)}. Sinon ${b(F.p.checker.reject)}, choisissez un motif et ${b(F.p.reject.confirm)}. ${F.p.reject.body}`,
                },
              ],
              tips: [F.p.proofs.unreadable],
            },
          ],
        },
        rw: {
          title: "Kugenzura ibimenyetso by'amafaranga yoherejwe kuri banki",
          summary:
            "Umukiriya yohereza urupapuro rwa banki; urugereranya na raporo ya banki, ukemeza cyangwa ukanga.",
          keywords: "ikimenyetso banki kugenzura",
          facts: {
            who: "Itsinda ry'imari",
            time: "Iminota 3 kuri buri kimenyetso",
          },
          sections: [
            {
              id: "check",
              title: "Genzura ikimenyetso",
              steps: [
                {
                  text: `Muri ${b(R.n.payments)}, kanda ${b(R.p.openProofs)}.`,
                  shot: "finance-proofs",
                  marks: ["Urutonde rw'ibimenyetso"],
                },
                {
                  text: `Hitamo ikimenyetso muri ${b(R.p.proofs.queueLabel)} (J / K, Enter gufungura). ${R.p.checker.lockedYou}`,
                },
                {
                  text: `Gereranya ${b(R.p.proofs.tabPreview)} na ${b(R.p.proofs.tabStatement)}: ${b(R.p.proofs.amount)}, ${b(R.p.proofs.ref)}, ${b(R.p.proofs.candidate)}.`,
                },
                {
                  text: `Niba bihuye, kanda ${b(R.p.proofs.confirmMatch)}. Bitabaye ibyo ${b(R.p.checker.reject)}, hitamo impamvu na ${b(R.p.reject.confirm)}. ${R.p.reject.body}`,
                },
              ],
              tips: [R.p.proofs.unreadable],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ reconciliation
    {
      slug: "finance-reconciliation",
      cat: "money",
      minutes: 7,
      updated: U,
      pages: ["/finance/reconciliation"],
      t: {
        en: {
          title: "Import a statement, match and close the day",
          summary:
            "Import the MTN, Airtel, card or bank statement, resolve every line in the workbench, then close the day so nothing changes behind you.",
          keywords:
            "reconciliation bank statement csv import match close day month reopen",
          facts: {
            who: "Finance team",
            time: "7 minutes",
            need: ["The provider's CSV statement"],
          },
          sections: [
            {
              id: "home",
              title: "Start from the reconciliation home",
              steps: [
                {
                  text: `Open ${b(E.n.reconciliation)}. The last 7 days show how many lines need you.`,
                  shot: "finance-recon",
                  marks: [
                    "Ask providers again",
                    "Import statement",
                    "Close the day",
                  ],
                },
                {
                  text: `${b(E.rc.home.verify)} asks providers about pending payments first; it often clears lines before you start.`,
                },
              ],
            },
            {
              id: "import",
              title: "Import the statement",
              steps: [
                {
                  text: `Click ${b(E.rc.home.import)}.`,
                  shot: "finance-recon-import",
                  marks: ["Import steps"],
                },
                {
                  text: `${b(E.rc.wizard.steps.upload)}: choose the ${b(E.rc.wizard.provider)} and the ${b(E.rc.wizard.file)}. ${E.rc.wizard.fileHint} Click ${b(E.rc.wizard.next)}.`,
                },
                {
                  text: `${b(E.rc.wizard.steps.map)}: tell which column holds ${b(E.rc.wizard.fields.external_ref)}, ${b(E.rc.wizard.fields.amount)}, ${b(E.rc.wizard.fields.fee)} and ${b(E.rc.wizard.fields.occurred_at)}.`,
                },
                {
                  text: `${b(E.rc.wizard.steps.review)}: fix or tick ${b(E.rc.wizard.skip)}, then click ${b(E.rc.wizard.run)}.`,
                },
                {
                  text: `${b(E.rc.wizard.steps.results)}: click ${b(E.rc.wizard.openWorkbench)}.`,
                },
              ],
              warn: E.rc.wizard.duplicate,
            },
            {
              id: "match",
              title: "Resolve lines in the workbench",
              steps: [
                {
                  text: `Filter on ${b(E.rc.bench.filter.needs)}. For each line choose: ${b(E.rc.bench.actions.accept)}, ${b(E.rc.bench.actions.link)}, ${b(E.rc.bench.actions.create)}, ${b(E.rc.bench.actions.fee)}, ${b(E.rc.bench.actions.flag)} or ${b(E.rc.bench.actions.ignore)}.`,
                },
                {
                  text: `${b(E.rc.link.title)}: pick the payment and the ${b(E.rc.link.handling)} if amounts differ, then ${b(E.rc.link.confirm)}.`,
                },
                {
                  text: `A duplicate payment? Use ${b(E.rc.bench.actions.refund)}. It creates a 100% refund proposal.`,
                },
                {
                  text: `Check the right column too: ${E.rc.bench.platformHint}`,
                },
              ],
            },
            {
              id: "close",
              title: "Close the day or month",
              steps: [
                {
                  text: `Back on ${b(E.n.reconciliation)}, pick the day and click ${b(E.rc.home.close)}, then ${b(E.rc.close.confirm)}. At month end use ${b(E.rc.home.closeMonth)}.`,
                },
                {
                  text: `Need a change later? ${b(E.rc.home.reopen)} asks for a reason. Prefer ${b(E.rc.reopen.altAction)}.`,
                },
              ],
              warn: E.rc.close.body,
            },
          ],
        },
        fr: {
          title: "Importer un relevé, rapprocher et clôturer la journée",
          summary:
            "Importez le relevé MTN, Airtel, carte ou banque, traitez chaque ligne, puis clôturez la journée pour que rien ne change derrière vous.",
          keywords:
            "rapprochement relevé bancaire csv importer clôturer jour mois rouvrir",
          facts: {
            who: "Équipe finance",
            time: "7 minutes",
            need: ["Le relevé CSV du fournisseur"],
          },
          sections: [
            {
              id: "home",
              title: "Partir de l'accueil du rapprochement",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.reconciliation)}. Les 7 derniers jours montrent les lignes à traiter.`,
                  shot: "finance-recon",
                  marks: [
                    "Interroger les fournisseurs",
                    "Importer un relevé",
                    "Clôturer le jour",
                  ],
                },
                {
                  text: `${b(F.rc.home.verify)} interroge d'abord les fournisseurs sur les paiements en attente.`,
                },
              ],
            },
            {
              id: "import",
              title: "Importer le relevé",
              steps: [
                {
                  text: `Cliquez ${b(F.rc.home.import)}.`,
                  shot: "finance-recon-import",
                  marks: ["Étapes"],
                },
                {
                  text: `${b(F.rc.wizard.steps.upload)} : choisissez le ${b(F.rc.wizard.provider)} et le ${b(F.rc.wizard.file)}. ${F.rc.wizard.fileHint} Cliquez ${b(F.rc.wizard.next)}.`,
                },
                {
                  text: `${b(F.rc.wizard.steps.map)} : indiquez les colonnes ${b(F.rc.wizard.fields.external_ref)}, ${b(F.rc.wizard.fields.amount)}, ${b(F.rc.wizard.fields.fee)} et ${b(F.rc.wizard.fields.occurred_at)}.`,
                },
                {
                  text: `${b(F.rc.wizard.steps.review)} : corrigez ou cochez ${b(F.rc.wizard.skip)}, puis ${b(F.rc.wizard.run)}.`,
                },
                {
                  text: `${b(F.rc.wizard.steps.results)} : cliquez ${b(F.rc.wizard.openWorkbench)}.`,
                },
              ],
              warn: F.rc.wizard.duplicate,
            },
            {
              id: "match",
              title: "Traiter les lignes",
              steps: [
                {
                  text: `Filtrez sur ${b(F.rc.bench.filter.needs)}. Pour chaque ligne : ${b(F.rc.bench.actions.accept)}, ${b(F.rc.bench.actions.link)}, ${b(F.rc.bench.actions.create)}, ${b(F.rc.bench.actions.fee)}, ${b(F.rc.bench.actions.flag)} ou ${b(F.rc.bench.actions.ignore)}.`,
                },
                {
                  text: `${b(F.rc.link.title)} : choisissez le paiement et le ${b(F.rc.link.handling)} si les montants diffèrent, puis ${b(F.rc.link.confirm)}.`,
                },
                {
                  text: `Paiement en double ? ${b(F.rc.bench.actions.refund)} crée une proposition de remboursement à 100 %.`,
                },
                {
                  text: `Regardez aussi la colonne de droite : ${F.rc.bench.platformHint}`,
                },
              ],
            },
            {
              id: "close",
              title: "Clôturer le jour ou le mois",
              steps: [
                {
                  text: `Sur ${b(F.n.reconciliation)}, choisissez le jour, cliquez ${b(F.rc.home.close)} puis ${b(F.rc.close.confirm)}. En fin de mois : ${b(F.rc.home.closeMonth)}.`,
                },
                {
                  text: `Un changement plus tard ? ${b(F.rc.home.reopen)} demande un motif. Préférez ${b(F.rc.reopen.altAction)}.`,
                },
              ],
              warn: F.rc.close.body,
            },
          ],
        },
        rw: {
          title: "Kwinjiza raporo ya banki, guhuza no gufunga umunsi",
          summary:
            "Injiza raporo ya MTN, Airtel, ikarita cyangwa banki, ukemure buri murongo, hanyuma ufunge umunsi kugira ngo ntihagire igihinduka.",
          keywords:
            "guhuza konti raporo ya banki csv kwinjiza gufunga umunsi ukwezi",
          facts: {
            who: "Itsinda ry'imari",
            time: "Iminota 7",
            need: ["Raporo ya CSV y'ikigo"],
          },
          sections: [
            {
              id: "home",
              title: "Tangirira ahabanza ho guhuza",
              steps: [
                {
                  text: `Fungura ${b(R.n.reconciliation)}. Iminsi 7 ishize yerekana imirongo igukeneye.`,
                  shot: "finance-recon",
                  marks: [
                    "Ongera ubaze ibigo",
                    "Injiza raporo",
                    "Funga umunsi",
                  ],
                },
                {
                  text: `${b(R.rc.home.verify)} ibanza kubaza ibigo ku bwishyu butegereje.`,
                },
              ],
            },
            {
              id: "import",
              title: "Injiza raporo",
              steps: [
                {
                  text: `Kanda ${b(R.rc.home.import)}.`,
                  shot: "finance-recon-import",
                  marks: ["Intambwe"],
                },
                {
                  text: `${b(R.rc.wizard.steps.upload)}: hitamo ${b(R.rc.wizard.provider)} na ${b(R.rc.wizard.file)}. ${R.rc.wizard.fileHint} Kanda ${b(R.rc.wizard.next)}.`,
                },
                {
                  text: `${b(R.rc.wizard.steps.map)}: erekana inkingi za ${b(R.rc.wizard.fields.external_ref)}, ${b(R.rc.wizard.fields.amount)}, ${b(R.rc.wizard.fields.fee)} na ${b(R.rc.wizard.fields.occurred_at)}.`,
                },
                {
                  text: `${b(R.rc.wizard.steps.review)}: kosora cyangwa uhitemo ${b(R.rc.wizard.skip)}, hanyuma ${b(R.rc.wizard.run)}.`,
                },
                {
                  text: `${b(R.rc.wizard.steps.results)}: kanda ${b(R.rc.wizard.openWorkbench)}.`,
                },
              ],
              warn: R.rc.wizard.duplicate,
            },
            {
              id: "match",
              title: "Kemura imirongo",
              steps: [
                {
                  text: `Shungura kuri ${b(R.rc.bench.filter.needs)}. Kuri buri murongo hitamo: ${b(R.rc.bench.actions.accept)}, ${b(R.rc.bench.actions.link)}, ${b(R.rc.bench.actions.create)}, ${b(R.rc.bench.actions.fee)}, ${b(R.rc.bench.actions.flag)} cyangwa ${b(R.rc.bench.actions.ignore)}.`,
                },
                {
                  text: `${b(R.rc.link.title)}: hitamo ubwishyu na ${b(R.rc.link.handling)} niba amafaranga atandukanye, hanyuma ${b(R.rc.link.confirm)}.`,
                },
                {
                  text: `Ubwishyu bwishyuwe kabiri? ${b(R.rc.bench.actions.refund)} ikora icyifuzo cyo gusubiza 100%.`,
                },
                { text: `Reba n'inkingi y'iburyo: ${R.rc.bench.platformHint}` },
              ],
            },
            {
              id: "close",
              title: "Gufunga umunsi cyangwa ukwezi",
              steps: [
                {
                  text: `Kuri ${b(R.n.reconciliation)}, hitamo umunsi ukande ${b(R.rc.home.close)} hanyuma ${b(R.rc.close.confirm)}. Mu mpera z'ukwezi: ${b(R.rc.home.closeMonth)}.`,
                },
                {
                  text: `Ukeneye guhindura nyuma? ${b(R.rc.home.reopen)} isaba impamvu. Ahubwo koresha ${b(R.rc.reopen.altAction)}.`,
                },
              ],
              warn: R.rc.close.body,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ receivables
    {
      slug: "finance-receivables",
      cat: "collect",
      minutes: 4,
      updated: U,
      pages: ["/finance/receivables"],
      t: {
        en: {
          title: "Chase what clients owe (ageing and reminders)",
          summary:
            "See balances by age, open a client, send a polite reminder and note a promise to pay.",
          keywords:
            "receivables ageing overdue debtors reminder promise to pay",
          facts: { who: "Finance team", time: "4 minutes" },
          sections: [
            {
              id: "ageing",
              title: "Read the ageing",
              steps: [
                {
                  text: `Open ${b(E.n.receivables)}. The tiles show ${b(E.ar.tiles.total)}, ${b(E.ar.tiles.overdue)} and ${b(E.ar.tiles.over90)}.`,
                  shot: "finance-receivables",
                  marks: ["Ageing and clients"],
                },
                {
                  text: `Click a bucket in ${b(E.ar.ageing)} to filter ${b(E.ar.clients)}; ${b(E.ar.clear)} resets it.`,
                },
              ],
            },
            {
              id: "remind",
              title: "Send a reminder",
              steps: [
                {
                  text: `Click a client row. The drawer has ${b(E.ar.drawer.tabs.overview)}, ${b(E.ar.drawer.tabs.invoices)}, ${b(E.ar.drawer.tabs.payments)}, ${b(E.ar.drawer.tabs.credits)} and ${b(E.ar.drawer.tabs.notes)}.`,
                  shot: "finance-receivables-client",
                  marks: ["Client tabs", "Send reminder"],
                },
                {
                  text: `Click ${b(E.ar.drawer.remind)}. Choose ${b(E.ar.rem.lang)}, ${b(E.ar.rem.template)} (${E.ar.rem.templates.standard}, ${E.ar.rem.templates.firm}, ${E.ar.rem.templates.final}) and ${b(E.ar.rem.channel)}.`,
                },
                {
                  text: `Adjust the ${b(E.ar.rem.message)}, check ${b(E.ar.rem.preview)}, then click ${b(E.ar.rem.send)}.`,
                },
              ],
              tips: [
                E.ar.rem.quiet,
                `A channel shows ${E.ar.rem.noConsent.toLowerCase()} when the client hasn't agreed to it.`,
              ],
            },
            {
              id: "notes",
              title: "Record a promise to pay",
              steps: [
                {
                  text: `In ${b(E.ar.drawer.tabs.notes)}, write the ${b(E.ar.notes.text)}, optionally set ${b(E.ar.notes.promise)}, and click ${b(E.ar.notes.save)}.`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Relancer les clients (ancienneté et rappels)",
          summary:
            "Voyez les soldes par ancienneté, ouvrez un client, envoyez un rappel poli et notez une promesse de paiement.",
          keywords: "créances ancienneté retard relance promesse de paiement",
          facts: { who: "Équipe finance", time: "4 minutes" },
          sections: [
            {
              id: "ageing",
              title: "Lire l'ancienneté",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.receivables)}. Les tuiles montrent ${b(F.ar.tiles.total)}, ${b(F.ar.tiles.overdue)} et ${b(F.ar.tiles.over90)}.`,
                  shot: "finance-receivables",
                  marks: ["Ancienneté et clients"],
                },
                {
                  text: `Cliquez une tranche dans ${b(F.ar.ageing)} pour filtrer ${b(F.ar.clients)} ; ${b(F.ar.clear)} réinitialise.`,
                },
              ],
            },
            {
              id: "remind",
              title: "Envoyer un rappel",
              steps: [
                {
                  text: `Cliquez un client. Le panneau a ${b(F.ar.drawer.tabs.overview)}, ${b(F.ar.drawer.tabs.invoices)}, ${b(F.ar.drawer.tabs.payments)}, ${b(F.ar.drawer.tabs.credits)} et ${b(F.ar.drawer.tabs.notes)}.`,
                  shot: "finance-receivables-client",
                  marks: ["Onglets client", "Envoyer un rappel"],
                },
                {
                  text: `Cliquez ${b(F.ar.drawer.remind)}. Choisissez ${b(F.ar.rem.lang)}, ${b(F.ar.rem.template)} et ${b(F.ar.rem.channel)}.`,
                },
                {
                  text: `Ajustez le ${b(F.ar.rem.message)}, vérifiez ${b(F.ar.rem.preview)}, puis ${b(F.ar.rem.send)}.`,
                },
              ],
              tips: [F.ar.rem.quiet],
            },
            {
              id: "notes",
              title: "Noter une promesse de paiement",
              steps: [
                {
                  text: `Dans ${b(F.ar.drawer.tabs.notes)}, écrivez la ${b(F.ar.notes.text)}, indiquez éventuellement ${b(F.ar.notes.promise)}, puis ${b(F.ar.notes.save)}.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kwishyuza abakiriya (igihe n'ibyibutsa)",
          summary:
            "Reba amafaranga asigaye ukurikije igihe, ufungure umukiriya, umwoherereze kwibutsa kandi wandike isezerano ryo kwishyura.",
          keywords:
            "ibyo tugomba kwishyurwa ibyarengeje igihe kwibutsa isezerano",
          facts: { who: "Itsinda ry'imari", time: "Iminota 4" },
          sections: [
            {
              id: "ageing",
              title: "Soma igihe amafaranga amaze",
              steps: [
                {
                  text: `Fungura ${b(R.n.receivables)}. Udusanduku twerekana ${b(R.ar.tiles.total)}, ${b(R.ar.tiles.overdue)} na ${b(R.ar.tiles.over90)}.`,
                  shot: "finance-receivables",
                  marks: ["Igihe n'abakiriya"],
                },
                {
                  text: `Kanda igice muri ${b(R.ar.ageing)} ushungure ${b(R.ar.clients)}; ${b(R.ar.clear)} bisubiza byose.`,
                },
              ],
            },
            {
              id: "remind",
              title: "Ohereza kwibutsa",
              steps: [
                {
                  text: `Kanda umukiriya. Hagaragara ${b(R.ar.drawer.tabs.overview)}, ${b(R.ar.drawer.tabs.invoices)}, ${b(R.ar.drawer.tabs.payments)}, ${b(R.ar.drawer.tabs.credits)} na ${b(R.ar.drawer.tabs.notes)}.`,
                  shot: "finance-receivables-client",
                  marks: ["Ibice by'umukiriya", "Ohereza kwibutsa"],
                },
                {
                  text: `Kanda ${b(R.ar.drawer.remind)}. Hitamo ${b(R.ar.rem.lang)}, ${b(R.ar.rem.template)} na ${b(R.ar.rem.channel)}.`,
                },
                {
                  text: `Hindura ${b(R.ar.rem.message)}, urebe ${b(R.ar.rem.preview)}, hanyuma ${b(R.ar.rem.send)}.`,
                },
              ],
              tips: [R.ar.rem.quiet],
            },
            {
              id: "notes",
              title: "Andika isezerano ryo kwishyura",
              steps: [
                {
                  text: `Muri ${b(R.ar.drawer.tabs.notes)}, andika ${b(R.ar.notes.text)}, ushobora gushyiraho ${b(R.ar.notes.promise)}, ukande ${b(R.ar.notes.save)}.`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ refunds
    {
      slug: "finance-refunds",
      cat: "collect",
      minutes: 6,
      updated: U,
      pages: ["/finance/refunds", "/finance/credit-notes"],
      t: {
        en: {
          title: "Approve and pay out refunds and credit notes",
          summary:
            "Follow a refund from request to payout. Approval issues the credit note; a different finance user pays it out.",
          keywords: "refund money back credit note chargeback reimbursement",
          facts: {
            who: "Finance team; executive over the limit",
            time: "6 minutes",
          },
          sections: [
            {
              id: "queue",
              title: "Find the refund",
              steps: [
                {
                  text: `Open ${b(E.n.refunds)}.`,
                  shot: "finance-refunds",
                  marks: ["Create on behalf", "Refund stages", "Refunds"],
                },
                {
                  text: `The tabs follow the flow: ${b(E.rf.tabs.awaiting_me)}, ${b(E.rf.tabs.requested)}, ${b(E.rf.tabs.in_review)}, ${b(E.rf.tabs.awaiting_executive)}, ${b(E.rf.tabs.executing)}, ${b(E.rf.tabs.completed)}, ${b(E.rf.tabs.rejected)}, ${b(E.rf.tabs.credit_notes)}.`,
                },
                {
                  text: `To start one for a client, click ${b(E.rf.create.open)}, choose the ${b(E.rf.create.invoice)}, the ${b(E.rf.create.reason)}, explain ${b(E.rf.create.note)} and click ${b(E.rf.create.submit)}. ${E.rf.create.noteHint}`,
                },
              ],
            },
            {
              id: "approve",
              title: "Review and approve",
              steps: [
                {
                  text: `Open a refund in ${b(E.rf.tabs.awaiting_me)}. Check ${b(E.rf.request.title)}, ${b(E.rf.sm.title)} and the ${b(E.rf.calc.title)}.`,
                },
                {
                  text: `Read ${b(E.rf.impact.title)} to see the agent share that will be reversed.`,
                },
                {
                  text: `Click ${b(E.rf.approve)}, or ${b(E.rf.adjust)} to change amount, method or destination, or ${b(E.rf.reject)}.`,
                },
              ],
              warn: E.rf.adjustDlg.notice,
              tips: [E.rf.request.changed],
            },
            {
              id: "pay",
              title: "Pay it out",
              steps: [
                {
                  text: `Approved cash refunds wait in ${b(E.rf.tabs.executing)}. ${E.rf.exec.who}`,
                },
                {
                  text: `Open it, check ${b(E.rf.exec.method)}, then click ${b(E.rf.exec.start)} for mobile money, or attach the ${b(E.rf.exec.proof)} and click ${b(E.rf.exec.markPaid)} for a bank transfer.`,
                },
                {
                  text: `If it shows ${b(E.rf.exec.failed)}, use ${b(E.rf.exec.retry)} or ${b(E.rf.exec.change)}.`,
                },
              ],
              warn: "Paying out sends real money and can't be undone.",
            },
            {
              id: "cn",
              title: "Credit notes",
              intro: `${E.rf.empty.credit_notes[1]} Open them in ${b(E.rf.tabs.credit_notes)}; each one has ${b(E.rf.cn.pdf)} and ${b(E.rf.cn.print)}.`,
            },
          ],
        },
        fr: {
          title: "Approuver et verser les remboursements et avoirs",
          summary:
            "Suivez un remboursement de la demande au versement. L'approbation émet l'avoir ; un autre utilisateur finance le verse.",
          keywords: "remboursement avoir rétrofacturation",
          facts: {
            who: "Équipe finance ; dirigeant au-delà du plafond",
            time: "6 minutes",
          },
          sections: [
            {
              id: "queue",
              title: "Trouver le remboursement",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.refunds)}.`,
                  shot: "finance-refunds",
                  marks: ["Créer pour un client", "Étapes", "Remboursements"],
                },
                {
                  text: `Les onglets suivent le parcours : ${b(F.rf.tabs.awaiting_me)}, ${b(F.rf.tabs.requested)}, ${b(F.rf.tabs.in_review)}, ${b(F.rf.tabs.awaiting_executive)}, ${b(F.rf.tabs.executing)}, ${b(F.rf.tabs.completed)}, ${b(F.rf.tabs.rejected)}, ${b(F.rf.tabs.credit_notes)}.`,
                },
                {
                  text: `Pour en créer un : ${b(F.rf.create.open)}, choisissez la ${b(F.rf.create.invoice)}, le ${b(F.rf.create.reason)}, expliquez ${b(F.rf.create.note)} et cliquez ${b(F.rf.create.submit)}. ${F.rf.create.noteHint}`,
                },
              ],
            },
            {
              id: "approve",
              title: "Examiner et approuver",
              steps: [
                {
                  text: `Ouvrez un remboursement dans ${b(F.rf.tabs.awaiting_me)}. Vérifiez ${b(F.rf.request.title)}, ${b(F.rf.sm.title)} et le ${b(F.rf.calc.title)}.`,
                },
                {
                  text: `Lisez ${b(F.rf.impact.title)} pour voir la part d'agent annulée.`,
                },
                {
                  text: `Cliquez ${b(F.rf.approve)}, ou ${b(F.rf.adjust)} pour changer montant, mode ou destination, ou ${b(F.rf.reject)}.`,
                },
              ],
              warn: F.rf.adjustDlg.notice,
              tips: [F.rf.request.changed],
            },
            {
              id: "pay",
              title: "Le verser",
              steps: [
                {
                  text: `Les remboursements approuvés attendent dans ${b(F.rf.tabs.executing)}. ${F.rf.exec.who}`,
                },
                {
                  text: `Ouvrez-le, vérifiez ${b(F.rf.exec.method)}, puis ${b(F.rf.exec.start)} pour le mobile money, ou joignez la ${b(F.rf.exec.proof)} et ${b(F.rf.exec.markPaid)} pour un virement.`,
                },
                {
                  text: `En cas de ${b(F.rf.exec.failed)}, utilisez ${b(F.rf.exec.retry)} ou ${b(F.rf.exec.change)}.`,
                },
              ],
              warn: "Le versement envoie de l'argent réel et ne peut pas être annulé.",
            },
            {
              id: "cn",
              title: "Avoirs",
              intro: `${F.rf.empty.credit_notes[1]} Retrouvez-les dans ${b(F.rf.tabs.credit_notes)} ; chacun a ${b(F.rf.cn.pdf)} et ${b(F.rf.cn.print)}.`,
            },
          ],
        },
        rw: {
          title:
            "Kwemeza no kwishyura amafaranga asubizwa n'inyandiko z'inguzanyo",
          summary:
            "Kurikira gusubiza amafaranga kuva ku busabe kugeza yishyuwe. Kwemeza bisohora inyandiko y'inguzanyo; undi mukozi w'imari ni we wishyura.",
          keywords: "gusubiza amafaranga inyandiko y'inguzanyo",
          facts: {
            who: "Itsinda ry'imari; umuyobozi hejuru y'urugero",
            time: "Iminota 6",
          },
          sections: [
            {
              id: "queue",
              title: "Shaka ibisubizwa",
              steps: [
                {
                  text: `Fungura ${b(R.n.refunds)}.`,
                  shot: "finance-refunds",
                  marks: [
                    "Saba mu izina ry'umukiriya",
                    "Intambwe",
                    "Ibisubizwa",
                  ],
                },
                {
                  text: `Ibice bikurikiza inzira: ${b(R.rf.tabs.awaiting_me)}, ${b(R.rf.tabs.requested)}, ${b(R.rf.tabs.in_review)}, ${b(R.rf.tabs.awaiting_executive)}, ${b(R.rf.tabs.executing)}, ${b(R.rf.tabs.completed)}, ${b(R.rf.tabs.rejected)}, ${b(R.rf.tabs.credit_notes)}.`,
                },
                {
                  text: `Gutangira mu izina ry'umukiriya: ${b(R.rf.create.open)}, hitamo ${b(R.rf.create.invoice)}, ${b(R.rf.create.reason)}, sobanura ${b(R.rf.create.note)} ukande ${b(R.rf.create.submit)}. ${R.rf.create.noteHint}`,
                },
              ],
            },
            {
              id: "approve",
              title: "Suzuma kandi wemeze",
              steps: [
                {
                  text: `Fungura ikiri muri ${b(R.rf.tabs.awaiting_me)}. Reba ${b(R.rf.request.title)}, ${b(R.rf.sm.title)} na ${b(R.rf.calc.title)}.`,
                },
                {
                  text: `Soma ${b(R.rf.impact.title)} urebe umugabane w'umukozi uzasubizwa inyuma.`,
                },
                {
                  text: `Kanda ${b(R.rf.approve)}, cyangwa ${b(R.rf.adjust)} uhindure amafaranga, uburyo cyangwa aho ajya, cyangwa ${b(R.rf.reject)}.`,
                },
              ],
              warn: R.rf.adjustDlg.notice,
              tips: [R.rf.request.changed],
            },
            {
              id: "pay",
              title: "Yishyure",
              steps: [
                {
                  text: `Ibyemejwe bitegereza muri ${b(R.rf.tabs.executing)}. ${R.rf.exec.who}`,
                },
                {
                  text: `Fungura, urebe ${b(R.rf.exec.method)}, hanyuma ${b(R.rf.exec.start)} kuri mobile money, cyangwa wongereho ${b(R.rf.exec.proof)} ukande ${b(R.rf.exec.markPaid)} kuri banki.`,
                },
                {
                  text: `Niba bigaragaza ${b(R.rf.exec.failed)}, koresha ${b(R.rf.exec.retry)} cyangwa ${b(R.rf.exec.change)}.`,
                },
              ],
              warn: "Kwishyura byohereza amafaranga nyayo kandi ntibisubirwamo.",
            },
            {
              id: "cn",
              title: "Inyandiko z'inguzanyo",
              intro: `${R.rf.empty.credit_notes[1]} Uzisanga muri ${b(R.rf.tabs.credit_notes)}; buri imwe ifite ${b(R.rf.cn.pdf)} na ${b(R.rf.cn.print)}.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ field
    {
      slug: "finance-field",
      cat: "payout",
      minutes: 3,
      updated: U,
      pages: ["/finance/field"],
      t: {
        en: {
          title: "Approve field expense claims and confirm cash",
          summary:
            "Second-level approval of agents' field expenses, and confirmation of cash agents collected and deposited.",
          keywords: "field expense claim cash deposit custody L2",
          facts: { who: "Finance team", time: "3 minutes" },
          sections: [
            {
              id: "exp",
              title: "Expense claims",
              steps: [
                {
                  text: `Open ${b(E.n.field)}, tab ${b(E.fd.finance.tabs.expenses)}.`,
                  shot: "finance-field",
                  marks: ["Tabs", "Claims"],
                },
                {
                  text: `Check the receipt and the visit, then click ${b(E.fd.exp.approve)}, or ${b(E.fd.exp.reject)} with a reason. Tick several rows and use ${b(E.fd.exp.bulk)}. ${E.fd.exp.bulkMax}`,
                },
              ],
              warn: E.fd.exp.sod,
            },
            {
              id: "cash",
              title: "Cash to confirm",
              steps: [
                {
                  text: `Open the tab ${b(E.fd.finance.tabs.cash)}. Rows marked ${b(E.fd.cash.escalated)} are oldest.`,
                },
                {
                  text: `Click ${b(E.fd.cash.confirm)}, enter the ${b(E.fd.cash.depositRef)}, the ${b(E.fd.cash.evidence)} and the ${b(E.fd.cash.reason)}, then confirm.`,
                },
              ],
              tips: [E.fd.cash.same],
            },
          ],
        },
        fr: {
          title: "Approuver les dépenses terrain et confirmer les espèces",
          summary:
            "Approbation de second niveau des dépenses des agents, et confirmation des espèces encaissées puis déposées.",
          keywords: "terrain dépense espèces dépôt N2",
          facts: { who: "Équipe finance", time: "3 minutes" },
          sections: [
            {
              id: "exp",
              title: "Notes de frais",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.field)}, onglet ${b(F.fd.finance.tabs.expenses)}.`,
                  shot: "finance-field",
                  marks: ["Onglets", "Dépenses"],
                },
                {
                  text: `Vérifiez le reçu et la visite, puis ${b(F.fd.exp.approve)}, ou ${b(F.fd.exp.reject)} avec un motif. Cochez plusieurs lignes et utilisez ${b(F.fd.exp.bulk)}. ${F.fd.exp.bulkMax}`,
                },
              ],
              warn: F.fd.exp.sod,
            },
            {
              id: "cash",
              title: "Espèces à confirmer",
              steps: [
                {
                  text: `Ouvrez l'onglet ${b(F.fd.finance.tabs.cash)}. Les lignes ${b(F.fd.cash.escalated)} sont les plus anciennes.`,
                },
                {
                  text: `Cliquez ${b(F.fd.cash.confirm)}, saisissez la ${b(F.fd.cash.depositRef)}, la ${b(F.fd.cash.evidence)} et le ${b(F.fd.cash.reason)}, puis confirmez.`,
                },
              ],
              tips: [F.fd.cash.same],
            },
          ],
        },
        rw: {
          title:
            "Kwemeza amafaranga yasabwe mu murima no kwemeza amafaranga yakiriwe",
          summary:
            "Kwemeza ku rwego rwa kabiri amafaranga abakozi basabye mu murima, no kwemeza amafaranga bakiriye bakayashyira kuri banki.",
          keywords: "umurima amafaranga yasabwe banki L2",
          facts: { who: "Itsinda ry'imari", time: "Iminota 3" },
          sections: [
            {
              id: "exp",
              title: "Amafaranga yasabwe",
              steps: [
                {
                  text: `Fungura ${b(R.n.field)}, igice ${b(R.fd.finance.tabs.expenses)}.`,
                  shot: "finance-field",
                  marks: ["Ibice", "Ibyasabwe"],
                },
                {
                  text: `Reba inyemezabwishyu n'uruzinduko, hanyuma ${b(R.fd.exp.approve)}, cyangwa ${b(R.fd.exp.reject)} ufite impamvu. Hitamo imirongo myinshi ukoreshe ${b(R.fd.exp.bulk)}. ${R.fd.exp.bulkMax}`,
                },
              ],
              warn: R.fd.exp.sod,
            },
            {
              id: "cash",
              title: "Amafaranga yo kwemeza",
              steps: [
                {
                  text: `Fungura ${b(R.fd.finance.tabs.cash)}. Imirongo ifite ${b(R.fd.cash.escalated)} ni yo imaze igihe.`,
                },
                {
                  text: `Kanda ${b(R.fd.cash.confirm)}, andika ${b(R.fd.cash.depositRef)}, ${b(R.fd.cash.evidence)} na ${b(R.fd.cash.reason)}, wemeze.`,
                },
              ],
              tips: [R.fd.cash.same],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ revenue
    {
      slug: "finance-revenue",
      cat: "payout",
      minutes: 5,
      updated: U,
      pages: ["/finance/revenue"],
      t: {
        en: {
          title: "Approve agent shares, rules and adjustments",
          summary:
            "Each delivered and paid case gives agents a share. Approve it for payout, keep the rate rules right and propose corrections.",
          keywords:
            "revenue share allocation commission rate rule adjustment bonus clawback agent fee",
          facts: { who: "Finance team", time: "5 minutes" },
          sections: [
            {
              id: "alloc",
              title: "Approve allocations",
              steps: [
                {
                  text: `Open ${b(E.n.revenue)}, tab ${b(E.rv.tabs.allocations)}.`,
                  shot: "finance-revenue",
                  marks: ["Revenue tabs", "Allocations"],
                },
                {
                  text: `Rows in ${b(E.rv.tiles.reviewed)} were checked by the service manager. Click one to see ${b(E.rv.drawer.breakdown)}.`,
                },
                {
                  text: `Click ${b(E.rv.act.approve)}. Or ${b(E.rv.act.query)}, ${b(E.rv.act.hold)} or ${b(E.rv.act.void)} with a reason. Tick rows to approve several at once.`,
                },
              ],
              tips: [E.rv.drawer.contribNote],
            },
            {
              id: "rules",
              title: "Add a rate rule",
              steps: [
                {
                  text: `Open the tab ${b(E.rv.tabs.rules)} and click ${b(E.rv.rules.add)}.`,
                  shot: "finance-revenue-rules",
                  marks: ["Add rule"],
                },
                {
                  text: `${b(E.rv.wizard.steps[0])}: choose what the rule covers. ${b(E.rv.wizard.steps[1])}: set ${b(E.rv.wizard.pct)}, ${b(E.rv.wizard.applies)}, ${b(E.rv.wizard.from)} and a ${b(E.rv.wizard.reason)}.`,
                },
                {
                  text: `${b(E.rv.wizard.steps[2])}: check the example, then click ${b(E.rv.wizard.submit)}.`,
                },
              ],
              tips: [E.rv.rules.precedenceBody, E.rv.wizard.needsExec],
            },
            {
              id: "adj",
              title: "Adjustments and agent fees",
              steps: [
                {
                  text: `Tab ${b(E.rv.tabs.adjustments)} › ${b(E.rv.adj.new)}: choose the ${b(E.rv.adj.worker)}, ${b(E.rv.adj.amount)}, ${b(E.rv.adj.direction)} and ${b(E.rv.adj.note)}, then ${b(E.rv.adj.submit)}. ${E.rv.adj.created}.`,
                },
                {
                  text: `Tab ${b(E.rv.tabs.fees)} › ${b(E.rv.fees.add)} records a licence or platform fee; ${b(E.rv.fees.waive)} cancels one.`,
                },
              ],
            },
          ],
        },
        fr: {
          title:
            "Approuver les parts des agents, les règles et les ajustements",
          summary:
            "Chaque dossier livré et payé donne une part aux agents. Approuvez-la pour versement, tenez les règles de taux à jour et proposez des corrections.",
          keywords:
            "partage revenus répartition commission règle taux ajustement bonus frais agent",
          facts: { who: "Équipe finance", time: "5 minutes" },
          sections: [
            {
              id: "alloc",
              title: "Approuver les répartitions",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.revenue)}, onglet ${b(F.rv.tabs.allocations)}.`,
                  shot: "finance-revenue",
                  marks: ["Onglets", "Répartitions"],
                },
                {
                  text: `Les lignes ${b(F.rv.tiles.reviewed)} ont été vérifiées par le responsable de service. Cliquez-en une pour voir ${b(F.rv.drawer.breakdown)}.`,
                },
                {
                  text: `Cliquez ${b(F.rv.act.approve)}. Ou ${b(F.rv.act.query)}, ${b(F.rv.act.hold)} ou ${b(F.rv.act.void)} avec un motif. Cochez plusieurs lignes pour les approuver ensemble.`,
                },
              ],
              tips: [F.rv.drawer.contribNote],
            },
            {
              id: "rules",
              title: "Ajouter une règle de taux",
              steps: [
                {
                  text: `Onglet ${b(F.rv.tabs.rules)}, cliquez ${b(F.rv.rules.add)}.`,
                  shot: "finance-revenue-rules",
                  marks: ["Ajouter une règle"],
                },
                {
                  text: `${b(F.rv.wizard.steps[0])} : choisissez la portée. ${b(F.rv.wizard.steps[1])} : ${b(F.rv.wizard.pct)}, ${b(F.rv.wizard.applies)}, ${b(F.rv.wizard.from)} et ${b(F.rv.wizard.reason)}.`,
                },
                {
                  text: `${b(F.rv.wizard.steps[2])} : vérifiez l'exemple, puis ${b(F.rv.wizard.submit)}.`,
                },
              ],
              tips: [F.rv.rules.precedenceBody, F.rv.wizard.needsExec],
            },
            {
              id: "adj",
              title: "Ajustements et frais d'agent",
              steps: [
                {
                  text: `Onglet ${b(F.rv.tabs.adjustments)} › ${b(F.rv.adj.new)} : ${b(F.rv.adj.worker)}, ${b(F.rv.adj.amount)}, ${b(F.rv.adj.direction)} et ${b(F.rv.adj.note)}, puis ${b(F.rv.adj.submit)}.`,
                },
                {
                  text: `Onglet ${b(F.rv.tabs.fees)} › ${b(F.rv.fees.add)} enregistre un frais ; ${b(F.rv.fees.waive)} l'annule.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kwemeza imigabane y'abakozi, amategeko n'ihinduka",
          summary:
            "Buri dosiye yarangiye ikishyurwa iha abakozi umugabane. Wemeze kugira ngo wishyurwe, ugenzure amategeko y'ijanisha kandi usabe gukosora.",
          keywords:
            "kugabana inyungu umugabane ijanisha itegeko guhindura agahimbazamusyi",
          facts: { who: "Itsinda ry'imari", time: "Iminota 5" },
          sections: [
            {
              id: "alloc",
              title: "Kwemeza imigabane",
              steps: [
                {
                  text: `Fungura ${b(R.n.revenue)}, igice ${b(R.rv.tabs.allocations)}.`,
                  shot: "finance-revenue",
                  marks: ["Ibice", "Imigabane"],
                },
                {
                  text: `Imirongo iri muri ${b(R.rv.tiles.reviewed)} yasuzumwe n'umuyobozi wa serivisi. Kanda umwe urebe ${b(R.rv.drawer.breakdown)}.`,
                },
                {
                  text: `Kanda ${b(R.rv.act.approve)}. Cyangwa ${b(R.rv.act.query)}, ${b(R.rv.act.hold)} cyangwa ${b(R.rv.act.void)} ufite impamvu. Hitamo imirongo myinshi uyemeze icyarimwe.`,
                },
              ],
              tips: [R.rv.drawer.contribNote],
            },
            {
              id: "rules",
              title: "Ongeraho itegeko ry'ijanisha",
              steps: [
                {
                  text: `Fungura ${b(R.rv.tabs.rules)} ukande ${b(R.rv.rules.add)}.`,
                  shot: "finance-revenue-rules",
                  marks: ["Ongeraho itegeko"],
                },
                {
                  text: `${b(R.rv.wizard.steps[0])}: hitamo icyo rireba. ${b(R.rv.wizard.steps[1])}: ${b(R.rv.wizard.pct)}, ${b(R.rv.wizard.applies)}, ${b(R.rv.wizard.from)} na ${b(R.rv.wizard.reason)}.`,
                },
                {
                  text: `${b(R.rv.wizard.steps[2])}: reba urugero, ukande ${b(R.rv.wizard.submit)}.`,
                },
              ],
              tips: [R.rv.rules.precedenceBody, R.rv.wizard.needsExec],
            },
            {
              id: "adj",
              title: "Ihinduka n'amafaranga y'abakozi",
              steps: [
                {
                  text: `${b(R.rv.tabs.adjustments)} › ${b(R.rv.adj.new)}: ${b(R.rv.adj.worker)}, ${b(R.rv.adj.amount)}, ${b(R.rv.adj.direction)} na ${b(R.rv.adj.note)}, hanyuma ${b(R.rv.adj.submit)}.`,
                },
                {
                  text: `${b(R.rv.tabs.fees)} › ${b(R.rv.fees.add)} yandika amafaranga y'uruhushya cyangwa y'urubuga; ${b(R.rv.fees.waive)} irayakuraho.`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ payouts
    {
      slug: "finance-payouts",
      cat: "payout",
      minutes: 7,
      updated: U,
      pages: ["/finance/payouts"],
      t: {
        en: {
          title: "Build, authorise and pay a payout batch",
          summary:
            "Once a month: build the batch from approved allocations, get a second signature, export the files, mark lines paid and close.",
          keywords:
            "payout batch agents salary commission wht bank file momo bulk close",
          facts: {
            who: "Two finance users (or finance + executive)",
            time: "7 minutes",
          },
          sections: [
            {
              id: "build",
              title: "Build the batch",
              steps: [
                {
                  text: `Open ${b(E.n.payouts)} and click ${b(E.po.create)}.`,
                  shot: "finance-payouts",
                  marks: ["Build batch", "Batch states", "Batches"],
                },
                {
                  text: `${b(E.po.builder.steps[0])}: choose ${b(E.po.builder.period)} (tick ${b(E.po.builder.midMonth)} for a second run). Click ${b(E.po.builder.next)}.`,
                  shot: "finance-payout-new",
                  marks: ["Batch builder"],
                },
                {
                  text: `${b(E.po.builder.steps[1])}: check each agent's net. A line with no verified account blocks the batch: ${b(E.po.builder.exclude)} it or wait.`,
                },
                {
                  text: `${b(E.po.builder.steps[2])}: click ${b(E.po.builder.submit)}.`,
                },
              ],
              tips: [E.po.builder.w13],
            },
            {
              id: "auth",
              title: "Authorise (second person)",
              steps: [
                {
                  text: `Another finance user or an executive opens the batch from ${b(E.n.approvals)} › ${b(E.ap.tabs.batch)}.`,
                },
                {
                  text: `They review ${b(E.po.batch.tabs.lines)} and click ${b(E.po.batch.authorise)}, or ${b(E.po.batch.reject)} with a note (it returns to draft).`,
                },
              ],
              warn: E.po.batch.preparerCant,
            },
            {
              id: "pay",
              title: "Export, pay and close",
              steps: [
                {
                  text: `Tab ${b(E.po.batch.tabs.export)}: click ${b(E.po.batch.generate)} for ${E.po.batch.files.bank}, ${E.po.batch.files.momo}, ${E.po.batch.files.wht} and ${E.po.batch.files.summary}. Upload the files to the bank or MoMo portal.`,
                },
                {
                  text: `Click ${b(E.po.batch.execute)}. ${E.po.batch.executeBody}`,
                },
                {
                  text: `For each line click ${b(E.po.batch.markPaid)} with the ${b(E.po.batch.ref)}, or ${b(E.po.batch.markFailed)}.`,
                },
                {
                  text: `When all lines are settled click ${b(E.po.batch.close)}. ${E.po.batch.closeBody}`,
                },
              ],
              warn: "Real money leaves when you upload the files to the bank or MoMo. Mark a line paid only after the provider confirms it.",
            },
            {
              id: "dest",
              title: "Verify payout accounts",
              intro: `${b(E.po.dests.title)} lists new agent accounts. ${E.po.dests.sub} Then click ${b(E.po.dests.verify)} or ${b(E.po.dests.fail)}.`,
            },
          ],
        },
        fr: {
          title: "Préparer, autoriser et payer un lot de versements",
          summary:
            "Une fois par mois : préparez le lot à partir des répartitions approuvées, obtenez une seconde signature, exportez les fichiers, marquez les lignes payées et clôturez.",
          keywords:
            "versement lot agents commission retenue fichier banque momo clôturer",
          facts: {
            who: "Deux utilisateurs finance (ou finance + dirigeant)",
            time: "7 minutes",
          },
          sections: [
            {
              id: "build",
              title: "Préparer le lot",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.payouts)} et cliquez ${b(F.po.create)}.`,
                  shot: "finance-payouts",
                  marks: ["Préparer un lot", "États", "Lots"],
                },
                {
                  text: `${b(F.po.builder.steps[0])} : choisissez ${b(F.po.builder.period)} (${b(F.po.builder.midMonth)} pour un second passage). Cliquez ${b(F.po.builder.next)}.`,
                  shot: "finance-payout-new",
                  marks: ["Préparation du lot"],
                },
                {
                  text: `${b(F.po.builder.steps[1])} : vérifiez le net de chaque agent. Une ligne sans compte vérifié bloque le lot : ${b(F.po.builder.exclude)} ou attendez.`,
                },
                {
                  text: `${b(F.po.builder.steps[2])} : cliquez ${b(F.po.builder.submit)}.`,
                },
              ],
              tips: [F.po.builder.w13],
            },
            {
              id: "auth",
              title: "Autoriser (seconde personne)",
              steps: [
                {
                  text: `Un autre utilisateur finance ou un dirigeant ouvre le lot depuis ${b(F.n.approvals)} › ${b(F.ap.tabs.batch)}.`,
                },
                {
                  text: `Il vérifie ${b(F.po.batch.tabs.lines)} et clique ${b(F.po.batch.authorise)}, ou ${b(F.po.batch.reject)} avec une note.`,
                },
              ],
              warn: F.po.batch.preparerCant,
            },
            {
              id: "pay",
              title: "Exporter, payer et clôturer",
              steps: [
                {
                  text: `Onglet ${b(F.po.batch.tabs.export)} : ${b(F.po.batch.generate)} pour chaque fichier, puis chargez-les sur le portail banque ou MoMo.`,
                },
                {
                  text: `Cliquez ${b(F.po.batch.execute)}. ${F.po.batch.executeBody}`,
                },
                {
                  text: `Pour chaque ligne : ${b(F.po.batch.markPaid)} avec la ${b(F.po.batch.ref)}, ou ${b(F.po.batch.markFailed)}.`,
                },
                {
                  text: `Quand tout est réglé : ${b(F.po.batch.close)}. ${F.po.batch.closeBody}`,
                },
              ],
              warn: "L'argent part quand vous chargez les fichiers chez la banque ou MoMo. Marquez une ligne payée seulement après confirmation.",
            },
            {
              id: "dest",
              title: "Vérifier les comptes de versement",
              intro: `${b(F.po.dests.title)} liste les nouveaux comptes. ${F.po.dests.sub} Puis ${b(F.po.dests.verify)} ou ${b(F.po.dests.fail)}.`,
            },
          ],
        },
        rw: {
          title: "Gutegura, kwemeza no kwishyura icyiciro cy'abakozi",
          summary:
            "Rimwe mu kwezi: tegura icyiciro uhereye ku migabane yemejwe, ubone umukono wa kabiri, ukure amadosiye, wandike imirongo yishyuwe hanyuma ufunge.",
          keywords:
            "kwishyura abakozi icyiciro komisiyo umusoro dosiye ya banki momo gufunga",
          facts: {
            who: "Abakozi babiri b'imari (cyangwa imari + umuyobozi)",
            time: "Iminota 7",
          },
          sections: [
            {
              id: "build",
              title: "Tegura icyiciro",
              steps: [
                {
                  text: `Fungura ${b(R.n.payouts)} ukande ${b(R.po.create)}.`,
                  shot: "finance-payouts",
                  marks: ["Tegura icyiciro", "Uko bihagaze", "Ibyiciro"],
                },
                {
                  text: `${b(R.po.builder.steps[0])}: hitamo ${b(R.po.builder.period)} (${b(R.po.builder.midMonth)} ku cyiciro cya kabiri). Kanda ${b(R.po.builder.next)}.`,
                  shot: "finance-payout-new",
                  marks: ["Gutegura icyiciro"],
                },
                {
                  text: `${b(R.po.builder.steps[1])}: reba amafaranga ya buri mukozi. Umurongo udafite konti yemejwe uhagarika icyiciro: ${b(R.po.builder.exclude)} cyangwa utegereze.`,
                },
                {
                  text: `${b(R.po.builder.steps[2])}: kanda ${b(R.po.builder.submit)}.`,
                },
              ],
              tips: [R.po.builder.w13],
            },
            {
              id: "auth",
              title: "Kwemeza (undi muntu)",
              steps: [
                {
                  text: `Undi mukozi w'imari cyangwa umuyobozi afungura icyiciro muri ${b(R.n.approvals)} › ${b(R.ap.tabs.batch)}.`,
                },
                {
                  text: `Areba ${b(R.po.batch.tabs.lines)} agakanda ${b(R.po.batch.authorise)}, cyangwa ${b(R.po.batch.reject)} afite ubutumwa.`,
                },
              ],
              warn: R.po.batch.preparerCant,
            },
            {
              id: "pay",
              title: "Gukura amadosiye, kwishyura no gufunga",
              steps: [
                {
                  text: `${b(R.po.batch.tabs.export)}: kanda ${b(R.po.batch.generate)} kuri buri dosiye, uzishyire ku rubuga rwa banki cyangwa MoMo.`,
                },
                {
                  text: `Kanda ${b(R.po.batch.execute)}. ${R.po.batch.executeBody}`,
                },
                {
                  text: `Kuri buri murongo: ${b(R.po.batch.markPaid)} ufite ${b(R.po.batch.ref)}, cyangwa ${b(R.po.batch.markFailed)}.`,
                },
                {
                  text: `Byose birangiye: ${b(R.po.batch.close)}. ${R.po.batch.closeBody}`,
                },
              ],
              warn: "Amafaranga agenda iyo ushyize amadosiye kuri banki cyangwa MoMo. Andika ko umurongo wishyuwe nyuma yo kwemezwa gusa.",
            },
            {
              id: "dest",
              title: "Kugenzura konti zo kwishyuriraho",
              intro: `${b(R.po.dests.title)} yerekana konti nshya. ${R.po.dests.sub} Hanyuma ${b(R.po.dests.verify)} cyangwa ${b(R.po.dests.fail)}.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ subscriptions
    {
      slug: "finance-subscriptions",
      cat: "billing",
      minutes: 3,
      updated: U,
      pages: ["/finance/subscriptions"],
      t: {
        en: {
          title: "Manage subscriptions and plans",
          summary:
            "Pause a client's plan, and create or edit the plans clients can subscribe to.",
          keywords: "subscription plan pause renewal pricing retainer",
          facts: { who: "Finance team", time: "3 minutes" },
          sections: [
            {
              id: "pause",
              title: "Pause a plan",
              steps: [
                {
                  text: `Open ${b(E.n.finSubscriptions)}, tab ${b(E.sb.tabs.subs)}.`,
                  shot: "finance-subscriptions",
                  marks: ["Subscriptions / Plans"],
                },
                {
                  text: `On an ${E.sb.status.active.toLowerCase()} row click ${b(E.sb.pause)}, enter ${b(E.sb.days)} and click ${b(E.sb.confirm)}.`,
                },
              ],
              tips: [E.sb.sub],
            },
            {
              id: "plans",
              title: "Create or edit a plan",
              steps: [
                {
                  text: `Open the tab ${b(E.sb.tabs.plans)} and click ${b(E.sb.plans.add)} (or ${b(E.sb.plans.edit)} on a plan).`,
                },
                {
                  text: `Fill ${b(E.sb.plans.name)}, ${b(E.sb.plans.interval)}, ${b(E.sb.plans.amount)}, ${b(E.sb.plans.cap)}, ${b(E.sb.plans.features)}; tick ${b(E.sb.plans.public)} and ${b(E.sb.plans.active)}.`,
                },
                { text: `Click ${b(E.sb.plans.save)}.` },
              ],
              tips: [
                `Renewal invoices appear in ${E.n.invoices} › ${E.i.views.renewals}.`,
              ],
            },
          ],
        },
        fr: {
          title: "Gérer les abonnements et les formules",
          summary:
            "Suspendre la formule d'un client, et créer ou modifier les formules proposées.",
          keywords: "abonnement formule suspendre renouvellement tarif",
          facts: { who: "Équipe finance", time: "3 minutes" },
          sections: [
            {
              id: "pause",
              title: "Suspendre une formule",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.finSubscriptions)}, onglet ${b(F.sb.tabs.subs)}.`,
                  shot: "finance-subscriptions",
                  marks: ["Abonnements / Formules"],
                },
                {
                  text: `Sur une ligne active, cliquez ${b(F.sb.pause)}, saisissez ${b(F.sb.days)} puis ${b(F.sb.confirm)}.`,
                },
              ],
              tips: [F.sb.sub],
            },
            {
              id: "plans",
              title: "Créer ou modifier une formule",
              steps: [
                {
                  text: `Onglet ${b(F.sb.tabs.plans)}, cliquez ${b(F.sb.plans.add)} (ou ${b(F.sb.plans.edit)}).`,
                },
                {
                  text: `Remplissez ${b(F.sb.plans.name)}, ${b(F.sb.plans.interval)}, ${b(F.sb.plans.amount)}, ${b(F.sb.plans.cap)}, ${b(F.sb.plans.features)} ; cochez ${b(F.sb.plans.public)} et ${b(F.sb.plans.active)}.`,
                },
                { text: `Cliquez ${b(F.sb.plans.save)}.` },
              ],
              tips: [
                `Les factures de renouvellement sont dans ${F.n.invoices} › ${F.i.views.renewals}.`,
              ],
            },
          ],
        },
        rw: {
          title: "Gucunga abiyandikishije n'amapaki",
          summary:
            "Hagarika by'agateganyo ipaki y'umukiriya, kandi ukore cyangwa uhindure amapaki abakiriya biyandikishaho.",
          keywords: "kwiyandikisha ipaki guhagarika kongera igiciro",
          facts: { who: "Itsinda ry'imari", time: "Iminota 3" },
          sections: [
            {
              id: "pause",
              title: "Hagarika ipaki by'agateganyo",
              steps: [
                {
                  text: `Fungura ${b(R.n.finSubscriptions)}, igice ${b(R.sb.tabs.subs)}.`,
                  shot: "finance-subscriptions",
                  marks: ["Abiyandikishije / Amapaki"],
                },
                {
                  text: `Ku murongo ukora, kanda ${b(R.sb.pause)}, andika ${b(R.sb.days)} ukande ${b(R.sb.confirm)}.`,
                },
              ],
              tips: [R.sb.sub],
            },
            {
              id: "plans",
              title: "Kora cyangwa uhindure ipaki",
              steps: [
                {
                  text: `Fungura ${b(R.sb.tabs.plans)} ukande ${b(R.sb.plans.add)} (cyangwa ${b(R.sb.plans.edit)}).`,
                },
                {
                  text: `Uzuza ${b(R.sb.plans.name)}, ${b(R.sb.plans.interval)}, ${b(R.sb.plans.amount)}, ${b(R.sb.plans.cap)}, ${b(R.sb.plans.features)}; hitamo ${b(R.sb.plans.public)} na ${b(R.sb.plans.active)}.`,
                },
                { text: `Kanda ${b(R.sb.plans.save)}.` },
              ],
              tips: [
                `Fagitire zo kongera ziri muri ${R.n.invoices} › ${R.i.views.renewals}.`,
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ payables
    {
      slug: "finance-payables",
      cat: "payout",
      minutes: 6,
      updated: U,
      pages: ["/finance/payables"],
      t: {
        en: {
          title: "Approve, authorise and pay supplier bills",
          summary:
            "Procurement prepares requests and bills; finance approves, authorises and pays them. Three different people sign every bill.",
          keywords:
            "payables supplier bill vendor payment purchase request approve authorise remittance bank change",
          facts: {
            who: "Finance team; executive above RWF 1,000,000",
            time: "6 minutes",
          },
          sections: [
            {
              id: "approve",
              title: "Approve and authorise",
              steps: [
                {
                  text: `Open ${b(E.n.payables)}. The tabs are ${b(E.pd.tabs.approve)}, ${b(E.pd.tabs.authorise)}, ${b(E.pd.tabs.pay)}, ${b(E.pd.tabs.bank)} and ${b(E.pd.tabs.settings)}.`,
                  shot: "finance-payables",
                  marks: ["Payables tabs"],
                },
                {
                  text: `In ${b(E.pd.tabs.approve)} click ${b(E.pd.open)} on a purchase request or bill. Check ${b(E.pd.prLines)}, ${b(E.pd.budgetImpact)} and ${b(E.pd.quotes)}.`,
                },
                {
                  text: `Click ${b(E.pd.approve)}, ${b(E.pd.askInfo)} or ${b(E.pd.reject)}. Requests you didn't prepare can be approved together with ${b(E.pd.bulk)}.`,
                },
                {
                  text: `In ${b(E.pd.tabs.authorise)}, a different person clicks ${b(E.pd.authorise)} on approved bills.`,
                },
              ],
              warn: E.pd.selfLock,
              tips: [E.pd.waitingExec],
            },
            {
              id: "pay",
              title: "Pay",
              steps: [
                {
                  text: `In ${b(E.pd.tabs.pay)}, bills are grouped by supplier. Click ${b(E.pd.select)}.`,
                },
                {
                  text: `Enter ${b(E.pd.amount)}, ${b(E.pd.method)}, ${b(E.pd.reference)} and attach the ${b(E.pd.proof)}. Click ${b(E.pd.markPaid)}.`,
                },
                {
                  text: `The remittance advice opens: click ${b(E.pd.send)} (or print it).`,
                },
              ],
              warn: `Make the transfer in the bank or MoMo first, then record it. ${E.pd.lockedRow}.`,
            },
            {
              id: "bank",
              title: "Verify a supplier's new bank details",
              steps: [
                {
                  text: `In ${b(E.pd.tabs.bank)} open the change. ${E.pd.bank.sub}`,
                },
                {
                  text: `Fill ${b(E.pd.bank.calledNumber)}, tick ${b(E.pd.bank.holder)} and ${b(E.pd.bank.last4.replace(/ \(\{masked\}\)/, ""))}, enter ${b(E.pd.bank.answeredBy)}, then ${b(E.pd.bank.verify)} or ${b(E.pd.bank.reject)}.`,
                },
              ],
            },
            {
              id: "limits",
              title: "Limits and budgets",
              intro: `${b(E.pd.tabs.settings)}: change a limit or a budget, give ${b(E.pd.settings.effective)} and ${b(E.pd.settings.reason)}, then ${b(E.pd.settings.propose)}. ${E.pd.settings.sub}`,
            },
          ],
        },
        fr: {
          title: "Approuver, autoriser et payer les factures fournisseurs",
          summary:
            "Les achats préparent demandes et factures ; la finance les approuve, les autorise et les paie. Trois personnes différentes signent chaque facture.",
          keywords:
            "fournisseurs facture paiement demande d'achat approuver autoriser avis de paiement banque",
          facts: {
            who: "Équipe finance ; dirigeant au-delà de 1 000 000 RWF",
            time: "6 minutes",
          },
          sections: [
            {
              id: "approve",
              title: "Approuver et autoriser",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.payables)}. Onglets : ${b(F.pd.tabs.approve)}, ${b(F.pd.tabs.authorise)}, ${b(F.pd.tabs.pay)}, ${b(F.pd.tabs.bank)} et ${b(F.pd.tabs.settings)}.`,
                  shot: "finance-payables",
                  marks: ["Onglets"],
                },
                {
                  text: `Dans ${b(F.pd.tabs.approve)}, cliquez ${b(F.pd.open)} sur une demande ou une facture. Vérifiez ${b(F.pd.prLines)}, ${b(F.pd.budgetImpact)} et ${b(F.pd.quotes)}.`,
                },
                {
                  text: `Cliquez ${b(F.pd.approve)}, ${b(F.pd.askInfo)} ou ${b(F.pd.reject)}. ${b(F.pd.bulk)} approuve plusieurs demandes d'un coup.`,
                },
                {
                  text: `Dans ${b(F.pd.tabs.authorise)}, une autre personne clique ${b(F.pd.authorise)}.`,
                },
              ],
              warn: F.pd.selfLock,
              tips: [F.pd.waitingExec],
            },
            {
              id: "pay",
              title: "Payer",
              steps: [
                {
                  text: `Dans ${b(F.pd.tabs.pay)}, les factures sont groupées par fournisseur. Cliquez ${b(F.pd.select)}.`,
                },
                {
                  text: `Saisissez ${b(F.pd.amount)}, ${b(F.pd.method)}, ${b(F.pd.reference)} et joignez la ${b(F.pd.proof)}. Cliquez ${b(F.pd.markPaid)}.`,
                },
                {
                  text: `L'avis de paiement s'ouvre : ${b(F.pd.send)} (ou imprimez-le).`,
                },
              ],
              warn: "Faites d'abord le virement à la banque ou sur MoMo, puis enregistrez-le.",
            },
            {
              id: "bank",
              title: "Vérifier les nouvelles coordonnées d'un fournisseur",
              steps: [
                {
                  text: `Dans ${b(F.pd.tabs.bank)}, ouvrez la demande. ${F.pd.bank.sub}`,
                },
                {
                  text: `Remplissez ${b(F.pd.bank.calledNumber)}, cochez les confirmations, saisissez ${b(F.pd.bank.answeredBy)}, puis ${b(F.pd.bank.verify)} ou ${b(F.pd.bank.reject)}.`,
                },
              ],
            },
            {
              id: "limits",
              title: "Plafonds et budgets",
              intro: `${b(F.pd.tabs.settings)} : modifiez un plafond ou un budget, indiquez ${b(F.pd.settings.effective)} et ${b(F.pd.settings.reason)}, puis ${b(F.pd.settings.propose)}. ${F.pd.settings.sub}`,
            },
          ],
        },
        rw: {
          title: "Kwemeza no kwishyura fagitire z'abatanga ibicuruzwa",
          summary:
            "Abashinzwe kugura bategura ubusabe na fagitire; imari irazemeza ikazishyura. Abantu batatu batandukanye basinya kuri buri fagitire.",
          keywords:
            "ibyishyurwa fagitire abatanga ubusabe bwo kugura kwemeza konti ya banki",
          facts: {
            who: "Itsinda ry'imari; umuyobozi hejuru ya RWF 1,000,000",
            time: "Iminota 6",
          },
          sections: [
            {
              id: "approve",
              title: "Kwemeza",
              steps: [
                {
                  text: `Fungura ${b(R.n.payables)}. Ibice: ${b(R.pd.tabs.approve)}, ${b(R.pd.tabs.authorise)}, ${b(R.pd.tabs.pay)}, ${b(R.pd.tabs.bank)} na ${b(R.pd.tabs.settings)}.`,
                  shot: "finance-payables",
                  marks: ["Ibice"],
                },
                {
                  text: `Muri ${b(R.pd.tabs.approve)} kanda ${b(R.pd.open)} ku busabe cyangwa fagitire. Reba ${b(R.pd.prLines)}, ${b(R.pd.budgetImpact)} na ${b(R.pd.quotes)}.`,
                },
                {
                  text: `Kanda ${b(R.pd.approve)}, ${b(R.pd.askInfo)} cyangwa ${b(R.pd.reject)}. ${b(R.pd.bulk)} yemeza ubusabe bwinshi icyarimwe.`,
                },
                {
                  text: `Muri ${b(R.pd.tabs.authorise)}, undi muntu akanda ${b(R.pd.authorise)}.`,
                },
              ],
              warn: R.pd.selfLock,
              tips: [R.pd.waitingExec],
            },
            {
              id: "pay",
              title: "Kwishyura",
              steps: [
                {
                  text: `Muri ${b(R.pd.tabs.pay)}, fagitire ziri mu matsinda y'abatanga. Kanda ${b(R.pd.select)}.`,
                },
                {
                  text: `Andika ${b(R.pd.amount)}, ${b(R.pd.method)}, ${b(R.pd.reference)} wongereho ${b(R.pd.proof)}. Kanda ${b(R.pd.markPaid)}.`,
                },
                {
                  text: `Inyandiko yo kumenyesha irafunguka: ${b(R.pd.send)} (cyangwa uyicape).`,
                },
              ],
              warn: "Banza wohereze amafaranga kuri banki cyangwa MoMo, hanyuma ubyandike.",
            },
            {
              id: "bank",
              title: "Kugenzura konti nshya y'utanga ibicuruzwa",
              steps: [
                {
                  text: `Muri ${b(R.pd.tabs.bank)} fungura impinduka. ${R.pd.bank.sub}`,
                },
                {
                  text: `Uzuza ${b(R.pd.bank.calledNumber)}, wemeze ibisabwa, wandike ${b(R.pd.bank.answeredBy)}, hanyuma ${b(R.pd.bank.verify)} cyangwa ${b(R.pd.bank.reject)}.`,
                },
              ],
            },
            {
              id: "limits",
              title: "Imbibi n'ingengo y'imari",
              intro: `${b(R.pd.tabs.settings)}: hindura urugero cyangwa ingengo, utange ${b(R.pd.settings.effective)} na ${b(R.pd.settings.reason)}, hanyuma ${b(R.pd.settings.propose)}. ${R.pd.settings.sub}`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ reports
    {
      slug: "finance-reports",
      cat: "admin",
      minutes: 4,
      updated: U,
      pages: ["/finance/reports"],
      t: {
        en: {
          title: "Run reports and the accounting export",
          summary:
            "Open a report, drill into any figure, export it, and build a balanced journal for QuickBooks, Xero, Odoo or CSV.",
          keywords:
            "report vat wht cash flow revenue export journal quickbooks xero odoo csv",
          facts: { who: "Finance team", time: "4 minutes" },
          sections: [
            {
              id: "run",
              title: "Open a report",
              steps: [
                {
                  text: `Open ${b(E.n.reports)}. Search or pick a card, for example ${b(E.rp.reports["fin.vat"].title)}.`,
                  shot: "finance-reports",
                  marks: ["Search reports", "Accounting export"],
                },
                {
                  text: `Set ${b(E.rp.from)}, ${b(E.rp.to)} (or ${E.rp.presets.month}, ${E.rp.presets.last}, ${E.rp.presets.year}) and ${b(E.rp.group)}.`,
                },
                {
                  text: `Click any figure to see the records behind it, then open a record.`,
                },
                { text: `Click ${b(E.c.export.label)}. ${E.c.export.logged}.` },
              ],
            },
            {
              id: "journal",
              title: "Accounting export",
              steps: [
                { text: `Click ${b(E.rp.exportCard.cta)}.` },
                {
                  text: `${b(E.rp.journal.steps.period)}: choose the ${b(E.rp.journal.period)} and the ${b(E.rp.journal.format)}. ${b(E.rp.journal.next)}.`,
                },
                {
                  text: `${b(E.rp.journal.steps.map)}: enter your ${b(E.rp.journal.code)} for each account. ${E.rp.journal.placeholder}`,
                },
                {
                  text: `${b(E.rp.journal.steps.preview)}: check ${b(E.rp.journal.balanced)}, then click ${b(E.rp.journal.export)} and download the file.`,
                },
              ],
              warn: E.rp.journal.unbalancedBody.replace(/ \(\{amount\}\)/, ""),
            },
          ],
        },
        fr: {
          title: "Lancer les rapports et l'export comptable",
          summary:
            "Ouvrez un rapport, descendez dans n'importe quel chiffre, exportez-le, et préparez un journal équilibré pour QuickBooks, Xero, Odoo ou CSV.",
          keywords:
            "rapport tva retenue trésorerie revenus export journal quickbooks xero odoo csv",
          facts: { who: "Équipe finance", time: "4 minutes" },
          sections: [
            {
              id: "run",
              title: "Ouvrir un rapport",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.reports)}. Cherchez ou choisissez une carte, par exemple ${b(F.rp.reports["fin.vat"].title)}.`,
                  shot: "finance-reports",
                  marks: ["Chercher", "Export comptable"],
                },
                {
                  text: `Réglez ${b(F.rp.from)}, ${b(F.rp.to)} et ${b(F.rp.group)}.`,
                },
                {
                  text: "Cliquez un chiffre pour voir les dossiers derrière, puis ouvrez-en un.",
                },
                {
                  text: `Cliquez ${b(F.c.export.label)}. ${F.c.export.logged}.`,
                },
              ],
            },
            {
              id: "journal",
              title: "Export comptable",
              steps: [
                { text: `Cliquez ${b(F.rp.exportCard.cta)}.` },
                {
                  text: `${b(F.rp.journal.steps.period)} : choisissez la ${b(F.rp.journal.period)} et le ${b(F.rp.journal.format)}. ${b(F.rp.journal.next)}.`,
                },
                {
                  text: `${b(F.rp.journal.steps.map)} : saisissez votre ${b(F.rp.journal.code)} pour chaque compte. ${F.rp.journal.placeholder}`,
                },
                {
                  text: `${b(F.rp.journal.steps.preview)} : vérifiez ${b(F.rp.journal.balanced)}, puis ${b(F.rp.journal.export)}.`,
                },
              ],
              warn: "Si débits et crédits diffèrent, l'export est bloqué jusqu'à correction des dossiers source.",
            },
          ],
        },
        rw: {
          title: "Gukoresha raporo no kohereza ibaruramari",
          summary:
            "Fungura raporo, ujye mu mubare uwo ari wo wose, uyikure, kandi utegure ibaruramari riringaniye rya QuickBooks, Xero, Odoo cyangwa CSV.",
          keywords:
            "raporo tva umusoro amafaranga yinjira gukura ibaruramari quickbooks xero odoo csv",
          facts: { who: "Itsinda ry'imari", time: "Iminota 4" },
          sections: [
            {
              id: "run",
              title: "Fungura raporo",
              steps: [
                {
                  text: `Fungura ${b(R.n.reports)}. Shakisha cyangwa uhitemo ikarita, urugero ${b(R.rp.reports["fin.vat"].title)}.`,
                  shot: "finance-reports",
                  marks: ["Shakisha", "Ibaruramari"],
                },
                {
                  text: `Shyiraho ${b(R.rp.from)}, ${b(R.rp.to)} na ${b(R.rp.group)}.`,
                },
                {
                  text: "Kanda umubare urebe dosiye ziwurimo, hanyuma ufungure imwe.",
                },
                { text: `Kanda ${b(R.c.export.label)}. ${R.c.export.logged}.` },
              ],
            },
            {
              id: "journal",
              title: "Kohereza ibaruramari",
              steps: [
                { text: `Kanda ${b(R.rp.exportCard.cta)}.` },
                {
                  text: `${b(R.rp.journal.steps.period)}: hitamo ${b(R.rp.journal.period)} na ${b(R.rp.journal.format)}. ${b(R.rp.journal.next)}.`,
                },
                {
                  text: `${b(R.rp.journal.steps.map)}: andika ${b(R.rp.journal.code)} kuri buri konti. ${R.rp.journal.placeholder}`,
                },
                {
                  text: `${b(R.rp.journal.steps.preview)}: reba ${b(R.rp.journal.balanced)}, hanyuma ${b(R.rp.journal.export)}.`,
                },
              ],
              warn: "Iyo debit na credit bidahuye, ntibishobora koherezwa kugeza dosiye zikosowe.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ settings
    {
      slug: "finance-settings",
      cat: "admin",
      minutes: 4,
      updated: U,
      pages: ["/finance/settings"],
      t: {
        en: {
          title: "Change finance settings and rules",
          summary:
            "VAT, terms, limits, numbering, payout accounts and the refund policy. Every change is proposed, approved by an executive and never applies backwards.",
          keywords:
            "settings vat limit threshold numbering prefix account call-back refund policy reminder schedule history",
          facts: {
            who: "Finance proposes; executive approves",
            time: "4 minutes",
          },
          sections: [
            {
              id: "propose",
              title: "Propose a change",
              steps: [
                {
                  text: `Open ${b(E.n.settings)}. Pick a section: ${b(E.st.sections.tax)}, ${b(E.st.sections.numbering)}, ${b(E.st.sections.accounts)}, ${b(E.st.sections.policies)} or ${b(E.st.sections.history)}.`,
                  shot: "finance-settings",
                  marks: ["Sections", "Propose change"],
                },
                {
                  text: `On a row click ${b(E.st.edit)}. Enter the ${b(E.st.propose.next)}, the ${b(E.st.propose.effective)} and a ${b(E.st.propose.reason)}.`,
                },
                {
                  text: `Click ${b(E.st.propose.submit)}. It appears under ${b(E.st.pending.title)} until an executive decides.`,
                },
              ],
              tips: [E.st.pending.youProposed],
            },
            {
              id: "accounts",
              title: "Add a payout account",
              steps: [
                {
                  text: `In ${b(E.st.sections.accounts)} click ${b(E.st.accounts.add)}. Fill ${b(E.st.accounts.form.name)}, ${b(E.st.accounts.form.method)} and ${b(E.st.accounts.form.number)}.`,
                },
                {
                  text: `Then click ${b(E.st.accounts.callback)}. ${E.st.accounts.callbackBody.replace(/ \{d\}/, "")}`,
                },
                {
                  text: `Tick ${b(E.st.accounts.callbackCheck)} and confirm. ${E.st.accounts.callbackDone}`,
                },
              ],
            },
            {
              id: "numbering",
              title: "Numbering",
              intro: `${E.st.numbering.banner} ${E.st.numbering.readOnly} Use ${b(E.st.numbering.request)} to change a prefix.`,
            },
          ],
        },
        fr: {
          title: "Modifier les paramètres et règles finance",
          summary:
            "TVA, délais, plafonds, numérotation, comptes de versement et politique de remboursement. Chaque changement est proposé, approuvé par un dirigeant et ne s'applique jamais en arrière.",
          keywords:
            "paramètres tva plafond seuil numérotation préfixe compte rappel politique historique",
          facts: {
            who: "La finance propose ; un dirigeant approuve",
            time: "4 minutes",
          },
          sections: [
            {
              id: "propose",
              title: "Proposer un changement",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.settings)}. Choisissez : ${b(F.st.sections.tax)}, ${b(F.st.sections.numbering)}, ${b(F.st.sections.accounts)}, ${b(F.st.sections.policies)} ou ${b(F.st.sections.history)}.`,
                  shot: "finance-settings",
                  marks: ["Sections", "Proposer"],
                },
                {
                  text: `Sur une ligne, cliquez ${b(F.st.edit)}. Saisissez la ${b(F.st.propose.next)}, la ${b(F.st.propose.effective)} et un ${b(F.st.propose.reason)}.`,
                },
                {
                  text: `Cliquez ${b(F.st.propose.submit)}. Il apparaît sous ${b(F.st.pending.title)} jusqu'à la décision.`,
                },
              ],
              tips: [F.st.pending.youProposed],
            },
            {
              id: "accounts",
              title: "Ajouter un compte de versement",
              steps: [
                {
                  text: `Dans ${b(F.st.sections.accounts)}, cliquez ${b(F.st.accounts.add)}. Remplissez ${b(F.st.accounts.form.name)}, ${b(F.st.accounts.form.method)} et ${b(F.st.accounts.form.number)}.`,
                },
                {
                  text: `Puis ${b(F.st.accounts.callback)} : appelez le fournisseur au numéro déjà enregistré et confirmez le titulaire et les quatre derniers chiffres.`,
                },
                {
                  text: `Cochez ${b(F.st.accounts.callbackCheck)} et confirmez. ${F.st.accounts.callbackDone}`,
                },
              ],
            },
            {
              id: "numbering",
              title: "Numérotation",
              intro: `${F.st.numbering.banner} ${F.st.numbering.readOnly} ${b(F.st.numbering.request)} pour changer un préfixe.`,
            },
          ],
        },
        rw: {
          title: "Guhindura igenamiterere n'amategeko by'imari",
          summary:
            "TVA, igihe, imbibi, nomero, konti zo kwishyuriraho n'amategeko yo gusubiza. Buri mpinduka irasabwa, ikemezwa n'umuyobozi kandi ntisubira inyuma.",
          keywords: "igenamiterere tva urugero nomero konti amategeko amateka",
          facts: { who: "Imari irasaba; umuyobozi aremeza", time: "Iminota 4" },
          sections: [
            {
              id: "propose",
              title: "Saba impinduka",
              steps: [
                {
                  text: `Fungura ${b(R.n.settings)}. Hitamo: ${b(R.st.sections.tax)}, ${b(R.st.sections.numbering)}, ${b(R.st.sections.accounts)}, ${b(R.st.sections.policies)} cyangwa ${b(R.st.sections.history)}.`,
                  shot: "finance-settings",
                  marks: ["Ibice", "Saba impinduka"],
                },
                {
                  text: `Ku murongo kanda ${b(R.st.edit)}. Andika ${b(R.st.propose.next)}, ${b(R.st.propose.effective)} na ${b(R.st.propose.reason)}.`,
                },
                {
                  text: `Kanda ${b(R.st.propose.submit)}. Igaragara muri ${b(R.st.pending.title)} kugeza umuyobozi afashe icyemezo.`,
                },
              ],
              tips: [R.st.pending.youProposed],
            },
            {
              id: "accounts",
              title: "Ongeraho konti yo kwishyuriraho",
              steps: [
                {
                  text: `Muri ${b(R.st.sections.accounts)} kanda ${b(R.st.accounts.add)}. Uzuza ${b(R.st.accounts.form.name)}, ${b(R.st.accounts.form.method)} na ${b(R.st.accounts.form.number)}.`,
                },
                {
                  text: `Hanyuma ${b(R.st.accounts.callback)}: hamagara ikigo kuri nomero isanzwe yanditswe, wemeze nyiri konti n'imibare ine ya nyuma.`,
                },
                {
                  text: `Hitamo ${b(R.st.accounts.callbackCheck)} wemeze. ${R.st.accounts.callbackDone}`,
                },
              ],
            },
            {
              id: "numbering",
              title: "Nomero",
              intro: `${R.st.numbering.banner} ${R.st.numbering.readOnly} ${b(R.st.numbering.request)} kugira ngo uhindure intangiriro.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ help
    {
      slug: "finance-help-button",
      cat: "start",
      minutes: 1,
      updated: U,
      pages: ["/finance"],
      start: true,
      t: {
        en: {
          title: "Get help on any finance screen",
          summary:
            "The Help button at the top opens the guides for the screen you are on.",
          keywords: "help guide question support",
          sections: [
            {
              id: "help",
              title: "Open help",
              steps: [
                {
                  text: `Click ${b(E.g.help)} at the top of the screen.`,
                  shot: "finance-help",
                  marks: ["Help"],
                },
                {
                  text: `${b(E.g.forThisPage)} lists the guides for this screen first. Open one to read it with screenshots.`,
                },
                {
                  text: `${b(E.n.guides)} in the side menu lists every finance guide.`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Obtenir de l'aide sur un écran finance",
          summary:
            "Le bouton Aide en haut ouvre les guides de l'écran où vous êtes.",
          keywords: "aide guide question",
          sections: [
            {
              id: "help",
              title: "Ouvrir l'aide",
              steps: [
                {
                  text: `Cliquez ${b(F.g.help)} en haut de l'écran.`,
                  shot: "finance-help",
                  marks: ["Aide"],
                },
                {
                  text: `${b(F.g.forThisPage)} liste d'abord les guides de cet écran. Ouvrez-en un pour le lire avec captures.`,
                },
                {
                  text: `${b(F.n.guides)} dans le menu latéral liste tous les guides finance.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kubona ubufasha kuri buri paji y'imari",
          summary:
            "Buto y'ubufasha hejuru ifungura amabwiriza y'iyo paji uriho.",
          keywords: "ubufasha amabwiriza ikibazo",
          sections: [
            {
              id: "help",
              title: "Fungura ubufasha",
              steps: [
                {
                  text: `Kanda ${b(R.g.help)} hejuru ku ipaji.`,
                  shot: "finance-help",
                  marks: ["Ubufasha"],
                },
                {
                  text: `${b(R.g.forThisPage)} ibanza kwerekana amabwiriza y'iyi paji. Fungura imwe uyisome ifite amafoto.`,
                },
                {
                  text: `${b(R.n.guides)} muri menu y'uruhande yerekana amabwiriza yose y'imari.`,
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

import type { Locale } from "@/shared/i18n/config";
import type { WsGuideSet } from "./index";
import en from "@/shared/i18n/dictionaries/en.json";
import fr from "@/shared/i18n/dictionaries/fr.json";
import rw from "@/shared/i18n/dictionaries/rw.json";
import { procurementCommon } from "@/content/pages/procurement-common";
import { procurementAb } from "@/content/pages/procurement-ab";
import { procurementC } from "@/content/pages/procurement-c";
import { procurementDe } from "@/content/pages/procurement-de";
import { guidesCopy } from "../copy";

// procurement dashboard guides. rw/fr are drafts for native review. Button/field names come from the screens' own copy.
const DICT = { en, fr, rw };
const L = (l: Locale) => ({
  n: DICT[l].wsnav,
  p: procurementCommon(l),
  ab: procurementAb(l),
  c: procurementC(l),
  de: procurementDe(l),
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

export const PROCUREMENT_WS: WsGuideSet = {
  workspace: "procurement",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "suppliers",
      t: {
        en: "Suppliers & contracts",
        fr: "Fournisseurs et contrats",
        rw: "Abatanga n'amasezerano",
      },
    },
    {
      key: "buying",
      t: {
        en: "Requests, orders & receipts",
        fr: "Demandes, commandes et réceptions",
        rw: "Ubusabe, amategeko n'ibyakiriwe",
      },
    },
    {
      key: "bills",
      t: {
        en: "Bills, payments & deposits",
        fr: "Factures, paiements et dépôts",
        rw: "Fagitire, ubwishyu n'ingwate",
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
      slug: "procurement-overview",
      cat: "start",
      minutes: 3,
      updated: U,
      pages: ["/procurement"],
      start: true,
      t: {
        en: {
          title: "Your procurement home",
          summary:
            "What the home screen shows: expiring contracts, bills due, requests waiting, budget used and the next obligations.",
          keywords: "home dashboard obligations budget lease checklist",
          facts: { who: "Procurement officer", time: "3 minutes" },
          sections: [
            {
              id: "read",
              title: "Read the home screen",
              steps: [
                {
                  text: `Open ${b(E.n.overview)} in the side menu.`,
                  shot: "procurement-home",
                  marks: ["Your day"],
                },
                {
                  text: `The tiles show ${b(E.ab.home.tiles.contracts)}, ${b(E.ab.home.tiles.billsWeek)}, ${b(E.ab.home.tiles.notInvoiced)}, ${b(E.ab.home.tiles.deposits)}, ${b(E.ab.home.tiles.budget)} and ${b(E.ab.home.tiles.awaiting)}. Click one to open its list.`,
                },
                {
                  text: `${b(E.ab.home.obligations)} lists what is coming: contract ends, notice deadlines, rent and bills due, deposit returns.`,
                },
                {
                  text: `${b(E.ab.home.balances)} shows who you owe the most.`,
                },
              ],
            },
            {
              id: "first",
              title: "First day: the setup checklist",
              intro: `${b(E.ab.home.checklist)}: ${E.ab.home.check.landlord}, ${E.ab.home.check.lease}, ${E.ab.home.check.budgets}, ${E.ab.home.check.limits}. Start with ${b(E.ab.home.addSupplier)}.`,
            },
          ],
        },
        fr: {
          title: "Votre accueil achats",
          summary:
            "Ce que montre l'accueil : contrats qui expirent, factures dues, demandes en attente, budget consommé et prochaines échéances.",
          keywords: "accueil tableau de bord échéances budget bail",
          facts: { who: "Responsable des achats", time: "3 minutes" },
          sections: [
            {
              id: "read",
              title: "Lire l'accueil",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.overview)} dans le menu latéral.`,
                  shot: "procurement-home",
                  marks: ["Votre journée"],
                },
                {
                  text: `Les tuiles montrent ${b(F.ab.home.tiles.contracts)}, ${b(F.ab.home.tiles.billsWeek)}, ${b(F.ab.home.tiles.notInvoiced)}, ${b(F.ab.home.tiles.deposits)}, ${b(F.ab.home.tiles.budget)} et ${b(F.ab.home.tiles.awaiting)}. Cliquez-en une pour ouvrir la liste.`,
                },
                {
                  text: `${b(F.ab.home.obligations)} liste ce qui arrive : fins de contrat, préavis, loyers et factures dus, retours de dépôt.`,
                },
                {
                  text: `${b(F.ab.home.balances)} montre à qui vous devez le plus.`,
                },
              ],
            },
            {
              id: "first",
              title: "Premier jour : la liste de démarrage",
              intro: `${b(F.ab.home.checklist)} : ${F.ab.home.check.landlord}, ${F.ab.home.check.lease}, ${F.ab.home.check.budgets}, ${F.ab.home.check.limits}. Commencez par ${b(F.ab.home.addSupplier)}.`,
            },
          ],
        },
        rw: {
          title: "Ahabanza h'ishami ryo kugura",
          summary:
            "Ibyo ahabanza herekana: amasezerano arangira, fagitire zigomba kwishyurwa, ubusabe butegereje, ingengo yakoreshejwe n'ibikurikira.",
          keywords: "ahabanza inshingano ingengo y'imari ubukode",
          facts: { who: "Ushinzwe kugura", time: "Iminota 3" },
          sections: [
            {
              id: "read",
              title: "Soma ahabanza",
              steps: [
                {
                  text: `Fungura ${b(R.n.overview)} muri menu y'uruhande.`,
                  shot: "procurement-home",
                  marks: ["Umunsi wawe"],
                },
                {
                  text: `Udusanduku twerekana ${b(R.ab.home.tiles.contracts)}, ${b(R.ab.home.tiles.billsWeek)}, ${b(R.ab.home.tiles.notInvoiced)}, ${b(R.ab.home.tiles.deposits)}, ${b(R.ab.home.tiles.budget)} na ${b(R.ab.home.tiles.awaiting)}. Kanda kamwe ubone urutonde.`,
                },
                {
                  text: `${b(R.ab.home.obligations)} yerekana ibiri imbere: amasezerano arangira, igihe cyo kumenyesha, ubukode na fagitire, gusubizwa ingwate.`,
                },
                {
                  text: `${b(R.ab.home.balances)} yerekana abo ufitiye amafaranga menshi.`,
                },
              ],
            },
            {
              id: "first",
              title: "Umunsi wa mbere: urutonde rwo gutangira",
              intro: `${b(R.ab.home.checklist)}: ${R.ab.home.check.landlord}, ${R.ab.home.check.lease}, ${R.ab.home.check.budgets}, ${R.ab.home.check.limits}. Tangirira kuri ${b(R.ab.home.addSupplier)}.`,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ suppliers
    {
      slug: "procurement-suppliers",
      cat: "suppliers",
      minutes: 5,
      updated: U,
      pages: ["/procurement/suppliers"],
      start: true,
      t: {
        en: {
          title: "Add and manage a supplier",
          summary:
            "Create the supplier record, check its TIN, attach documents, and block or deactivate it when needed.",
          keywords: "supplier vendor landlord tin rdb documents block inactive",
          facts: {
            who: "Procurement officer",
            time: "5 minutes",
            need: ["Legal name and TIN", "Contact and payment details"],
          },
          sections: [
            {
              id: "add",
              title: "Add a supplier",
              steps: [
                {
                  text: `Open ${b(E.n.suppliers)} and click ${b(E.ab.vendors.add)}.`,
                  shot: "procurement-suppliers",
                  marks: ["Add supplier", "Suppliers"],
                },
                {
                  text: `Fill ${b(E.ab.vendors.form.legalName)}, ${b(E.ab.vendors.form.type)} and ${b(E.ab.vendors.form.tin)}, then click ${b(E.ab.vendors.form.tinCheck)}.`,
                  shot: "procurement-supplier-new",
                  marks: ["Supplier form"],
                },
                {
                  text: `Add ${b(E.ab.vendors.form.categories)}, ${b(E.ab.vendors.form.contacts)} (${b(E.ab.vendors.form.addContact)}), ${b(E.ab.vendors.form.address)}, ${b(E.ab.vendors.form.terms)} and ${b(E.ab.vendors.form.vat)}.`,
                },
                {
                  text: `Under ${b(E.ab.vendors.form.bank)} choose the ${b(E.ab.vendors.form.bankKind)} and the ${b(E.ab.vendors.form.bankNo)}. ${E.ab.vendors.form.bankNote}`,
                },
                { text: `Click ${b(E.p.common.save)}.` },
              ],
              warn: `${E.ab.vendors.form.dupWarn} The form names the similar supplier; open it before creating a second record.`,
            },
            {
              id: "profile",
              title: "Work on a supplier",
              steps: [
                {
                  text: `Click a supplier. Tabs: ${b(E.ab.vendors.tabs.overview)}, ${b(E.ab.vendors.tabs.contracts)}, ${b(E.ab.vendors.tabs.documents)}, ${b(E.ab.vendors.tabs.bills)}, ${b(E.ab.vendors.tabs.payments)}, ${b(E.ab.vendors.tabs.statement)}, ${b(E.ab.vendors.tabs.history)}.`,
                  shot: "procurement-supplier-profile",
                  marks: ["Supplier tabs"],
                },
                {
                  text: `Documents: ${b(E.ab.vendors.docs.add)}, give the ${b(E.ab.vendors.docs.name)} and ${b(E.ab.vendors.docs.expires)}. Expiring documents show on the home screen.`,
                },
                {
                  text: `${b(E.ab.vendors.actions.label)} › ${b(E.ab.vendors.actions.edit)}, ${b(E.ab.vendors.actions.inactive)} or ${b(E.ab.vendors.actions.block)}.`,
                },
              ],
              warn: E.ab.vendors.block.effects,
            },
          ],
        },
        fr: {
          title: "Ajouter et gérer un fournisseur",
          summary:
            "Créez la fiche, vérifiez le NIF, joignez les documents, et bloquez ou désactivez le fournisseur si besoin.",
          keywords: "fournisseur bailleur nif rdb documents bloquer inactif",
          facts: {
            who: "Responsable des achats",
            time: "5 minutes",
            need: [
              "Raison sociale et NIF",
              "Contact et coordonnées de paiement",
            ],
          },
          sections: [
            {
              id: "add",
              title: "Ajouter un fournisseur",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.suppliers)} et cliquez ${b(F.ab.vendors.add)}.`,
                  shot: "procurement-suppliers",
                  marks: ["Ajouter", "Fournisseurs"],
                },
                {
                  text: `Remplissez ${b(F.ab.vendors.form.legalName)}, ${b(F.ab.vendors.form.type)} et ${b(F.ab.vendors.form.tin)}, puis ${b(F.ab.vendors.form.tinCheck)}.`,
                  shot: "procurement-supplier-new",
                  marks: ["Fiche fournisseur"],
                },
                {
                  text: `Ajoutez ${b(F.ab.vendors.form.categories)}, ${b(F.ab.vendors.form.contacts)} (${b(F.ab.vendors.form.addContact)}), ${b(F.ab.vendors.form.address)}, ${b(F.ab.vendors.form.terms)} et ${b(F.ab.vendors.form.vat)}.`,
                },
                {
                  text: `Sous ${b(F.ab.vendors.form.bank)}, choisissez le ${b(F.ab.vendors.form.bankKind)} et le ${b(F.ab.vendors.form.bankNo)}. ${F.ab.vendors.form.bankNote}`,
                },
                { text: `Cliquez ${b(F.p.common.save)}.` },
              ],
              warn: `${F.ab.vendors.form.dupWarn} Le formulaire nomme le fournisseur similaire ; ouvrez-le avant d'en créer un second.`,
            },
            {
              id: "profile",
              title: "Travailler sur un fournisseur",
              steps: [
                {
                  text: `Cliquez un fournisseur. Onglets : ${b(F.ab.vendors.tabs.overview)}, ${b(F.ab.vendors.tabs.contracts)}, ${b(F.ab.vendors.tabs.documents)}, ${b(F.ab.vendors.tabs.bills)}, ${b(F.ab.vendors.tabs.payments)}, ${b(F.ab.vendors.tabs.statement)}, ${b(F.ab.vendors.tabs.history)}.`,
                  shot: "procurement-supplier-profile",
                  marks: ["Onglets"],
                },
                {
                  text: `Documents : ${b(F.ab.vendors.docs.add)}, indiquez ${b(F.ab.vendors.docs.name)} et ${b(F.ab.vendors.docs.expires)}.`,
                },
                {
                  text: `${b(F.ab.vendors.actions.label)} › ${b(F.ab.vendors.actions.edit)}, ${b(F.ab.vendors.actions.inactive)} ou ${b(F.ab.vendors.actions.block)}.`,
                },
              ],
              warn: F.ab.vendors.block.effects,
            },
          ],
        },
        rw: {
          title: "Kongeramo no gucunga utanga ibicuruzwa",
          summary:
            "Kora dosiye ye, ugenzure TIN, wongereho inyandiko, kandi umuhagarike cyangwa umukure ku rutonde igihe bibaye ngombwa.",
          keywords: "utanga ibicuruzwa nyir'inzu tin rdb inyandiko guhagarika",
          facts: {
            who: "Ushinzwe kugura",
            time: "Iminota 5",
            need: [
              "Izina ryemewe na TIN",
              "Uwo kuvugisha n'uburyo bwo kwishyura",
            ],
          },
          sections: [
            {
              id: "add",
              title: "Ongeramo utanga ibicuruzwa",
              steps: [
                {
                  text: `Fungura ${b(R.n.suppliers)} ukande ${b(R.ab.vendors.add)}.`,
                  shot: "procurement-suppliers",
                  marks: ["Ongeramo", "Abatanga"],
                },
                {
                  text: `Uzuza ${b(R.ab.vendors.form.legalName)}, ${b(R.ab.vendors.form.type)} na ${b(R.ab.vendors.form.tin)}, hanyuma ${b(R.ab.vendors.form.tinCheck)}.`,
                  shot: "procurement-supplier-new",
                  marks: ["Ifishi"],
                },
                {
                  text: `Ongeraho ${b(R.ab.vendors.form.categories)}, ${b(R.ab.vendors.form.contacts)} (${b(R.ab.vendors.form.addContact)}), ${b(R.ab.vendors.form.address)}, ${b(R.ab.vendors.form.terms)} na ${b(R.ab.vendors.form.vat)}.`,
                },
                {
                  text: `Muri ${b(R.ab.vendors.form.bank)} hitamo ${b(R.ab.vendors.form.bankKind)} na ${b(R.ab.vendors.form.bankNo)}. ${R.ab.vendors.form.bankNote}`,
                },
                { text: `Kanda ${b(R.p.common.save)}.` },
              ],
              warn: `${R.ab.vendors.form.dupWarn} Ifishi yerekana usa na we; banza umufungure mbere yo gukora undi.`,
            },
            {
              id: "profile",
              title: "Gukora kuri utanga ibicuruzwa",
              steps: [
                {
                  text: `Kanda utanga ibicuruzwa. Ibice: ${b(R.ab.vendors.tabs.overview)}, ${b(R.ab.vendors.tabs.contracts)}, ${b(R.ab.vendors.tabs.documents)}, ${b(R.ab.vendors.tabs.bills)}, ${b(R.ab.vendors.tabs.payments)}, ${b(R.ab.vendors.tabs.statement)}, ${b(R.ab.vendors.tabs.history)}.`,
                  shot: "procurement-supplier-profile",
                  marks: ["Ibice"],
                },
                {
                  text: `Inyandiko: ${b(R.ab.vendors.docs.add)}, andika ${b(R.ab.vendors.docs.name)} na ${b(R.ab.vendors.docs.expires)}.`,
                },
                {
                  text: `${b(R.ab.vendors.actions.label)} › ${b(R.ab.vendors.actions.edit)}, ${b(R.ab.vendors.actions.inactive)} cyangwa ${b(R.ab.vendors.actions.block)}.`,
                },
              ],
              warn: R.ab.vendors.block.effects,
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ bank change
    {
      slug: "procurement-supplier-bank",
      cat: "suppliers",
      minutes: 2,
      updated: U,
      pages: ["/procurement/suppliers"],
      t: {
        en: {
          title: "Change a supplier's bank details",
          summary:
            "New bank details are locked until finance verifies them by phone. This protects HEBUZA from payment fraud.",
          keywords: "bank details account change fraud verify lock",
          facts: {
            who: "Procurement requests; finance verifies",
            time: "2 minutes",
            need: ["The supplier's bank letter"],
          },
          sections: [
            {
              id: "req",
              title: "Request the change",
              steps: [
                {
                  text: `Open the supplier, then ${b(E.ab.vendors.actions.label)} › ${b(E.ab.vendors.actions.bank)}.`,
                },
                {
                  text: `Enter the new details, the ${b(E.ab.vendors.bankSheet.reason)} and attach the ${b(E.ab.vendors.bankSheet.doc)}.`,
                },
                {
                  text: `Click ${b(E.ab.vendors.bankSheet.submit)}. ${E.ab.vendors.bankSheet.done}.`,
                },
              ],
              warn: E.ab.vendors.bankSheet.body.replace("{h}", "24"),
              tips: [
                "Never accept new bank details by email or phone alone. Fraudsters often pose as suppliers.",
              ],
            },
          ],
        },
        fr: {
          title: "Changer les coordonnées bancaires d'un fournisseur",
          summary:
            "Les nouvelles coordonnées restent bloquées jusqu'à ce que la finance les vérifie par téléphone. Cela protège HEBUZA de la fraude.",
          keywords: "coordonnées bancaires compte changement fraude vérifier",
          facts: {
            who: "Les achats demandent ; la finance vérifie",
            time: "2 minutes",
            need: ["La lettre de la banque"],
          },
          sections: [
            {
              id: "req",
              title: "Demander le changement",
              steps: [
                {
                  text: `Ouvrez le fournisseur, puis ${b(F.ab.vendors.actions.label)} › ${b(F.ab.vendors.actions.bank)}.`,
                },
                {
                  text: `Saisissez les nouvelles coordonnées, le ${b(F.ab.vendors.bankSheet.reason)} et joignez la ${b(F.ab.vendors.bankSheet.doc)}.`,
                },
                {
                  text: `Cliquez ${b(F.ab.vendors.bankSheet.submit)}. ${F.ab.vendors.bankSheet.done}.`,
                },
              ],
              warn: F.ab.vendors.bankSheet.body.replace("{h}", "24"),
              tips: [
                "N'acceptez jamais de nouvelles coordonnées par simple email ou appel. Les fraudeurs se font souvent passer pour des fournisseurs.",
              ],
            },
          ],
        },
        rw: {
          title: "Guhindura konti ya banki y'utanga ibicuruzwa",
          summary:
            "Konti nshya iba ifunze kugeza imari iyigenzuye kuri telefoni. Ibi birinda HEBUZA ubujura.",
          keywords: "konti ya banki guhindura ubujura kugenzura",
          facts: {
            who: "Ishami ryo kugura risaba; imari igenzura",
            time: "Iminota 2",
            need: ["Ibaruwa ya banki"],
          },
          sections: [
            {
              id: "req",
              title: "Saba impinduka",
              steps: [
                {
                  text: `Fungura utanga ibicuruzwa, hanyuma ${b(R.ab.vendors.actions.label)} › ${b(R.ab.vendors.actions.bank)}.`,
                },
                {
                  text: `Andika konti nshya, ${b(R.ab.vendors.bankSheet.reason)} wongereho ${b(R.ab.vendors.bankSheet.doc)}.`,
                },
                {
                  text: `Kanda ${b(R.ab.vendors.bankSheet.submit)}. ${R.ab.vendors.bankSheet.done}.`,
                },
              ],
              warn: R.ab.vendors.bankSheet.body.replace("{h}", "24"),
              tips: [
                "Ntukemere konti nshya ivuzwe kuri imeyili cyangwa telefoni gusa. Abajura bakunze kwiyitirira abatanga ibicuruzwa.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ contracts
    {
      slug: "procurement-contracts",
      cat: "suppliers",
      minutes: 5,
      updated: U,
      pages: ["/procurement/contracts"],
      t: {
        en: {
          title: "Add, renew or end a contract or lease",
          summary:
            "Record a contract once and HEBUZA reminds you before the notice deadline, drafts its monthly bills and tracks its deposit.",
          keywords: "contract lease rent renewal notice escalation termination",
          facts: {
            who: "Procurement officer; executive approves renewals",
            time: "5 minutes",
          },
          sections: [
            {
              id: "add",
              title: "Add a contract",
              steps: [
                {
                  text: `Open ${b(E.n.contracts)} and click ${b(E.ab.contracts.add)}.`,
                  shot: "procurement-contracts",
                  marks: ["Add contract", "By status", "Contracts"],
                },
                {
                  text: `Fill ${b(E.ab.contracts.form.supplier)}, ${b(E.ab.contracts.form.kind)}, ${b(E.ab.contracts.form.title)}, ${b(E.ab.contracts.form.start)}, ${b(E.ab.contracts.form.end)}, ${b(E.ab.contracts.form.amount)} and ${b(E.ab.contracts.form.frequency)}.`,
                },
                {
                  text: `Add ${b(E.ab.contracts.form.dueDay)}, ${b(E.ab.contracts.form.escalation)}, ${b(E.ab.contracts.form.notice)}, ${b(E.ab.contracts.form.autoRenew)}, ${b(E.ab.contracts.form.deposit)} and ${b(E.ab.contracts.form.category)}. Click ${b(E.p.common.save)}.`,
                },
              ],
            },
            {
              id: "renew",
              title: "Renew, snooze or terminate",
              steps: [
                {
                  text: `Open the contract. Tabs: ${b(E.ab.contracts.tabs.overview)}, ${b(E.ab.contracts.tabs.documents)}, ${b(E.ab.contracts.tabs.reminders)}, ${b(E.ab.contracts.tabs.bills)}, ${b(E.ab.contracts.tabs.versions)}, ${b(E.ab.contracts.tabs.history)}.`,
                  shot: "procurement-contract-detail",
                  marks: ["Contract tabs"],
                },
                {
                  text: `Near the end a banner offers ${b(E.ab.contracts.alert.renew)}, ${b(E.ab.contracts.alert.terminate)} and ${b(E.ab.contracts.alert.snooze)}.`,
                },
                {
                  text: `${b(E.ab.contracts.alert.renew)}: on ${b(E.ab.contracts.wizard.steps[0])} set ${b(E.ab.contracts.wizard.amount)}, ${b(E.ab.contracts.wizard.end)} and ${b(E.ab.contracts.wizard.notice)}, then ${b(E.ab.contracts.wizard.submit)}. Once approved, upload the ${b(E.ab.contracts.wizard.addendum)}.`,
                },
                {
                  text: `${b(E.ab.contracts.alert.terminate)}: set ${b(E.ab.contracts.term.effective)} and ${b(E.ab.contracts.term.reason)}, work through the ${b(E.ab.contracts.term.checklist)}, then ${b(E.ab.contracts.term.confirm)}.`,
                },
              ],
              warn: "Terminating a contract can't be undone. Send the notice letter before the notice deadline.",
              tips: [E.ab.contracts.alert.snoozed.replace(/ \{date\}/, "")],
            },
          ],
        },
        fr: {
          title: "Ajouter, renouveler ou résilier un contrat ou un bail",
          summary:
            "Saisissez un contrat une fois : HEBUZA vous prévient avant le préavis, prépare ses factures mensuelles et suit son dépôt.",
          keywords:
            "contrat bail loyer renouvellement préavis indexation résiliation",
          facts: {
            who: "Responsable des achats ; le dirigeant approuve les renouvellements",
            time: "5 minutes",
          },
          sections: [
            {
              id: "add",
              title: "Ajouter un contrat",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.contracts)} et cliquez ${b(F.ab.contracts.add)}.`,
                  shot: "procurement-contracts",
                  marks: ["Ajouter", "Par état", "Contrats"],
                },
                {
                  text: `Remplissez ${b(F.ab.contracts.form.supplier)}, ${b(F.ab.contracts.form.kind)}, ${b(F.ab.contracts.form.title)}, ${b(F.ab.contracts.form.start)}, ${b(F.ab.contracts.form.end)}, ${b(F.ab.contracts.form.amount)} et ${b(F.ab.contracts.form.frequency)}.`,
                },
                {
                  text: `Ajoutez ${b(F.ab.contracts.form.dueDay)}, ${b(F.ab.contracts.form.escalation)}, ${b(F.ab.contracts.form.notice)}, ${b(F.ab.contracts.form.autoRenew)}, ${b(F.ab.contracts.form.deposit)} et ${b(F.ab.contracts.form.category)}. Cliquez ${b(F.p.common.save)}.`,
                },
              ],
            },
            {
              id: "renew",
              title: "Renouveler, reporter ou résilier",
              steps: [
                {
                  text: `Ouvrez le contrat. Onglets : ${b(F.ab.contracts.tabs.overview)}, ${b(F.ab.contracts.tabs.documents)}, ${b(F.ab.contracts.tabs.reminders)}, ${b(F.ab.contracts.tabs.bills)}, ${b(F.ab.contracts.tabs.versions)}, ${b(F.ab.contracts.tabs.history)}.`,
                  shot: "procurement-contract-detail",
                  marks: ["Onglets"],
                },
                {
                  text: `Près de l'échéance, un bandeau propose ${b(F.ab.contracts.alert.renew)}, ${b(F.ab.contracts.alert.terminate)} et ${b(F.ab.contracts.alert.snooze)}.`,
                },
                {
                  text: `${b(F.ab.contracts.alert.renew)} : sur ${b(F.ab.contracts.wizard.steps[0])}, indiquez ${b(F.ab.contracts.wizard.amount)}, ${b(F.ab.contracts.wizard.end)} et ${b(F.ab.contracts.wizard.notice)}, puis ${b(F.ab.contracts.wizard.submit)}. Après approbation, chargez l'${b(F.ab.contracts.wizard.addendum)}.`,
                },
                {
                  text: `${b(F.ab.contracts.alert.terminate)} : ${b(F.ab.contracts.term.effective)} et ${b(F.ab.contracts.term.reason)}, suivez la ${b(F.ab.contracts.term.checklist)}, puis ${b(F.ab.contracts.term.confirm)}.`,
                },
              ],
              warn: "La résiliation est définitive. Envoyez la lettre avant la date de préavis.",
            },
          ],
        },
        rw: {
          title: "Kongeramo, kuvugurura cyangwa guhagarika amasezerano",
          summary:
            "Andika amasezerano rimwe: HEBUZA ikwibutsa mbere y'igihe cyo kumenyesha, igategura fagitire za buri kwezi kandi igakurikirana ingwate.",
          keywords:
            "amasezerano ubukode kuvugurura kumenyesha kuzamura guhagarika",
          facts: {
            who: "Ushinzwe kugura; umuyobozi yemeza ivugururwa",
            time: "Iminota 5",
          },
          sections: [
            {
              id: "add",
              title: "Ongeramo amasezerano",
              steps: [
                {
                  text: `Fungura ${b(R.n.contracts)} ukande ${b(R.ab.contracts.add)}.`,
                  shot: "procurement-contracts",
                  marks: ["Ongeramo", "Uko bihagaze", "Amasezerano"],
                },
                {
                  text: `Uzuza ${b(R.ab.contracts.form.supplier)}, ${b(R.ab.contracts.form.kind)}, ${b(R.ab.contracts.form.title)}, ${b(R.ab.contracts.form.start)}, ${b(R.ab.contracts.form.end)}, ${b(R.ab.contracts.form.amount)} na ${b(R.ab.contracts.form.frequency)}.`,
                },
                {
                  text: `Ongeraho ${b(R.ab.contracts.form.dueDay)}, ${b(R.ab.contracts.form.escalation)}, ${b(R.ab.contracts.form.notice)}, ${b(R.ab.contracts.form.autoRenew)}, ${b(R.ab.contracts.form.deposit)} na ${b(R.ab.contracts.form.category)}. Kanda ${b(R.p.common.save)}.`,
                },
              ],
            },
            {
              id: "renew",
              title: "Kuvugurura, gusubika cyangwa guhagarika",
              steps: [
                {
                  text: `Fungura amasezerano. Ibice: ${b(R.ab.contracts.tabs.overview)}, ${b(R.ab.contracts.tabs.documents)}, ${b(R.ab.contracts.tabs.reminders)}, ${b(R.ab.contracts.tabs.bills)}, ${b(R.ab.contracts.tabs.versions)}, ${b(R.ab.contracts.tabs.history)}.`,
                  shot: "procurement-contract-detail",
                  marks: ["Ibice"],
                },
                {
                  text: `Iyo ageze ku musozo, hagaragara ${b(R.ab.contracts.alert.renew)}, ${b(R.ab.contracts.alert.terminate)} na ${b(R.ab.contracts.alert.snooze)}.`,
                },
                {
                  text: `${b(R.ab.contracts.alert.renew)}: kuri ${b(R.ab.contracts.wizard.steps[0])} shyiraho ${b(R.ab.contracts.wizard.amount)}, ${b(R.ab.contracts.wizard.end)} na ${b(R.ab.contracts.wizard.notice)}, hanyuma ${b(R.ab.contracts.wizard.submit)}. Byemejwe, ohereza ${b(R.ab.contracts.wizard.addendum)}.`,
                },
                {
                  text: `${b(R.ab.contracts.alert.terminate)}: ${b(R.ab.contracts.term.effective)} na ${b(R.ab.contracts.term.reason)}, ukurikize ${b(R.ab.contracts.term.checklist)}, hanyuma ${b(R.ab.contracts.term.confirm)}.`,
                },
              ],
              warn: "Guhagarika amasezerano ntibisubirwamo. Ohereza ibaruwa mbere y'igihe cyo kumenyesha.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ raise a PR (any staff)
    {
      slug: "procurement-raise-request",
      cat: "start",
      minutes: 3,
      updated: U,
      pages: ["/procurement/requests"],
      start: true,
      t: {
        en: {
          title: "Raise a purchase request (any team member)",
          summary:
            "Anyone on the team can ask to buy something from any staff dashboard. Finance or an executive approves, then procurement orders it.",
          keywords: "purchase request buy order requisition my requests quotes",
          facts: {
            who: "Every staff member",
            time: "3 minutes",
            need: [
              "What you need and an estimated price",
              "Supplier quotes for bigger amounts",
            ],
          },
          sections: [
            {
              id: "open",
              title: "Open the request form",
              steps: [
                {
                  text: `In ${b(E.n.purchaseRequests)} click ${b(E.p.shell.requestPurchase)}. From any other dashboard press R then P, or add ?pr=new to the page address.`,
                  shot: "procurement-requests",
                  marks: ["Request a purchase", "Requests"],
                },
                {
                  text: `Fill ${b(E.c.sheet.what)} and the ${b(E.c.sheet.lines)}: ${b(E.c.sheet.item)}, ${b(E.c.sheet.qty)}, ${b(E.c.sheet.price)}. ${b(E.c.sheet.addLine)} adds a line.`,
                  shot: "procurement-pr-sheet",
                  marks: ["Request form"],
                },
                {
                  text: `Choose the ${b(E.c.sheet.category)}, ${b(E.c.sheet.neededBy)} and explain ${b(E.c.sheet.justification)} ${E.c.sheet.justificationHint}`,
                },
                {
                  text: `Optionally pick a ${b(E.c.sheet.supplier)}. Attach ${b(E.c.sheet.quotes)} with the ${b(E.c.sheet.quoteVendor)} and ${b(E.c.sheet.quoteAmount)}. If you can't, tick ${b(E.c.sheet.waive)} and say why.`,
                },
                {
                  text: `Click ${b(E.c.sheet.submit)}, or ${b(E.c.sheet.saveDraft)}.`,
                },
              ],
              tips: [
                E.p.route.limits.replace(/ \{limit\}/, " the finance limit"),
              ],
            },
            {
              id: "mine",
              title: "Follow your requests",
              steps: [
                {
                  text: `Open ${b(E.p.shell.myRequests)} (command menu, or ?pr=mine). Tabs ${b(E.c.mine.active)} and ${b(E.c.mine.history)} show each step: ${E.c.mine.steps.join(" → ")}.`,
                },
                {
                  text: `If an approver asked a question, type ${b(E.c.mine.reply)} and click ${b(E.c.mine.resubmit)}.`,
                },
                {
                  text: `${b(E.c.mine.withdraw)} cancels a request you no longer need.`,
                },
              ],
              warn: "Withdrawing can't be undone.",
            },
          ],
        },
        fr: {
          title: "Faire une demande d'achat (tout membre de l'équipe)",
          summary:
            "Chacun peut demander un achat depuis n'importe quel tableau de bord. La finance ou un dirigeant approuve, puis les achats commandent.",
          keywords: "demande d'achat acheter commande devis mes demandes",
          facts: {
            who: "Tout le personnel",
            time: "3 minutes",
            need: [
              "Le besoin et un prix estimé",
              "Des devis pour les montants importants",
            ],
          },
          sections: [
            {
              id: "open",
              title: "Ouvrir le formulaire",
              steps: [
                {
                  text: `Dans ${b(F.n.purchaseRequests)}, cliquez ${b(F.p.shell.requestPurchase)}. Depuis un autre tableau de bord, tapez R puis P, ou ajoutez ?pr=new à l'adresse.`,
                  shot: "procurement-requests",
                  marks: ["Demander un achat", "Demandes"],
                },
                {
                  text: `Remplissez ${b(F.c.sheet.what)} et ${b(F.c.sheet.lines)} : ${b(F.c.sheet.item)}, ${b(F.c.sheet.qty)}, ${b(F.c.sheet.price)}. ${b(F.c.sheet.addLine)} ajoute une ligne.`,
                  shot: "procurement-pr-sheet",
                  marks: ["Formulaire"],
                },
                {
                  text: `Choisissez ${b(F.c.sheet.category)}, ${b(F.c.sheet.neededBy)} et expliquez ${b(F.c.sheet.justification)} ${F.c.sheet.justificationHint}`,
                },
                {
                  text: `Facultatif : ${b(F.c.sheet.supplier)}. Joignez ${b(F.c.sheet.quotes)} avec ${b(F.c.sheet.quoteVendor)} et ${b(F.c.sheet.quoteAmount)}. Sinon cochez ${b(F.c.sheet.waive)} et expliquez.`,
                },
                {
                  text: `Cliquez ${b(F.c.sheet.submit)}, ou ${b(F.c.sheet.saveDraft)}.`,
                },
              ],
            },
            {
              id: "mine",
              title: "Suivre vos demandes",
              steps: [
                {
                  text: `Ouvrez ${b(F.p.shell.myRequests)} (menu de commandes, ou ?pr=mine). ${b(F.c.mine.active)} et ${b(F.c.mine.history)} montrent chaque étape : ${F.c.mine.steps.join(" → ")}.`,
                },
                {
                  text: `Si un approbateur pose une question, saisissez ${b(F.c.mine.reply)} puis ${b(F.c.mine.resubmit)}.`,
                },
                {
                  text: `${b(F.c.mine.withdraw)} annule une demande devenue inutile.`,
                },
              ],
              warn: "Le retrait est définitif.",
            },
          ],
        },
        rw: {
          title: "Gusaba kugura (umukozi wese)",
          summary:
            "Umukozi wese ashobora gusaba kugura ari ku rubuga urwo ari rwo rwose. Imari cyangwa umuyobozi aremeza, hanyuma ishami ryo kugura rikagura.",
          keywords: "ubusabe bwo kugura kugura igiciro ubusabe bwanjye",
          facts: {
            who: "Abakozi bose",
            time: "Iminota 3",
            need: [
              "Icyo ukeneye n'igiciro giteganyijwe",
              "Ibiciro by'abatanga ku mafaranga menshi",
            ],
          },
          sections: [
            {
              id: "open",
              title: "Fungura ifishi",
              steps: [
                {
                  text: `Muri ${b(R.n.purchaseRequests)} kanda ${b(R.p.shell.requestPurchase)}. Ku zindi mbuga, kanda R hanyuma P, cyangwa wongere ?pr=new ku murongo w'aderesi.`,
                  shot: "procurement-requests",
                  marks: ["Saba kugura", "Ubusabe"],
                },
                {
                  text: `Uzuza ${b(R.c.sheet.what)} na ${b(R.c.sheet.lines)}: ${b(R.c.sheet.item)}, ${b(R.c.sheet.qty)}, ${b(R.c.sheet.price)}. ${b(R.c.sheet.addLine)} yongeraho umurongo.`,
                  shot: "procurement-pr-sheet",
                  marks: ["Ifishi"],
                },
                {
                  text: `Hitamo ${b(R.c.sheet.category)}, ${b(R.c.sheet.neededBy)} usobanure ${b(R.c.sheet.justification)} ${R.c.sheet.justificationHint}`,
                },
                {
                  text: `Ushobora guhitamo ${b(R.c.sheet.supplier)}. Ongeraho ${b(R.c.sheet.quotes)} na ${b(R.c.sheet.quoteVendor)} na ${b(R.c.sheet.quoteAmount)}. Bitashoboka, hitamo ${b(R.c.sheet.waive)} usobanure.`,
                },
                {
                  text: `Kanda ${b(R.c.sheet.submit)}, cyangwa ${b(R.c.sheet.saveDraft)}.`,
                },
              ],
            },
            {
              id: "mine",
              title: "Kurikirana ubusabe bwawe",
              steps: [
                {
                  text: `Fungura ${b(R.p.shell.myRequests)} (menu y'amabwiriza, cyangwa ?pr=mine). ${b(R.c.mine.active)} na ${b(R.c.mine.history)} byerekana buri ntambwe: ${R.c.mine.steps.join(" → ")}.`,
                },
                {
                  text: `Niba uwemeza yabajije ikibazo, andika ${b(R.c.mine.reply)} ukande ${b(R.c.mine.resubmit)}.`,
                },
                {
                  text: `${b(R.c.mine.withdraw)} ihagarika ubusabe utagikeneye.`,
                },
              ],
              warn: "Gukuraho ubusabe ntibisubirwamo.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ PR board
    {
      slug: "procurement-requests-board",
      cat: "buying",
      minutes: 3,
      updated: U,
      pages: ["/procurement/requests"],
      t: {
        en: {
          title: "Follow purchase requests through approval",
          summary:
            "The board shows every request by status. Approval happens in finance (or with the executive); you follow up and create the order.",
          keywords: "purchase request board approval route quotes budget",
          facts: { who: "Procurement officer", time: "3 minutes" },
          sections: [
            {
              id: "board",
              title: "Read the board",
              steps: [
                {
                  text: `Open ${b(E.n.purchaseRequests)}. Switch between ${b(E.c.board.board)} and ${b(E.c.board.list)}; search with ${b(E.c.board.search)}.`,
                },
                {
                  text: `Each card shows the estimate and the approval route: ${E.p.route.limits.replace(/\{limit\}/, "the limit")}`,
                },
                {
                  text: `Click a request number to open it: ${b(E.c.detail.lines)}, ${b(E.c.detail.quotes)}, ${b(E.c.detail.budget)}, ${b(E.c.detail.chain)} and ${b(E.c.detail.timeline)}.`,
                },
                {
                  text: `To ask the requester something, write in ${b(E.c.detail.ask)} and click ${b(E.c.detail.note)}.`,
                },
                {
                  text: `When the status is ${b(E.p.status.approved)}, click ${b(E.c.board.createPo)} (see the purchase order guide).`,
                },
              ],
              tips: [
                `${E.p.status.info_requested}: the requester must reply before it moves again.`,
              ],
            },
          ],
        },
        fr: {
          title: "Suivre les demandes d'achat jusqu'à l'approbation",
          summary:
            "Le tableau montre chaque demande par état. L'approbation se fait en finance (ou chez le dirigeant) ; vous suivez et créez la commande.",
          keywords: "demande d'achat tableau approbation circuit devis budget",
          facts: { who: "Responsable des achats", time: "3 minutes" },
          sections: [
            {
              id: "board",
              title: "Lire le tableau",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.purchaseRequests)}. Basculez entre ${b(F.c.board.board)} et ${b(F.c.board.list)} ; cherchez avec ${b(F.c.board.search)}.`,
                },
                {
                  text: `Chaque carte montre l'estimation et le circuit d'approbation.`,
                },
                {
                  text: `Cliquez un numéro pour l'ouvrir : ${b(F.c.detail.lines)}, ${b(F.c.detail.quotes)}, ${b(F.c.detail.budget)}, ${b(F.c.detail.chain)} et ${b(F.c.detail.timeline)}.`,
                },
                {
                  text: `Pour interroger le demandeur, écrivez dans ${b(F.c.detail.ask)} et cliquez ${b(F.c.detail.note)}.`,
                },
                {
                  text: `À l'état ${b(F.p.status.approved)}, cliquez ${b(F.c.board.createPo)}.`,
                },
              ],
              tips: [
                `${F.p.status.info_requested} : le demandeur doit répondre avant que la demande avance.`,
              ],
            },
          ],
        },
        rw: {
          title: "Gukurikirana ubusabe bwo kugura kugeza bwemejwe",
          summary:
            "Ikibaho cyerekana ubusabe bwose ukurikije uko buhagaze. Bwemezwa n'imari (cyangwa umuyobozi); wowe urakurikirana kandi ugakora itegeko ryo kugura.",
          keywords: "ubusabe bwo kugura ikibaho kwemeza ibiciro ingengo",
          facts: { who: "Ushinzwe kugura", time: "Iminota 3" },
          sections: [
            {
              id: "board",
              title: "Soma ikibaho",
              steps: [
                {
                  text: `Fungura ${b(R.n.purchaseRequests)}. Hinduranya ${b(R.c.board.board)} na ${b(R.c.board.list)}; shakisha ukoresheje ${b(R.c.board.search)}.`,
                },
                {
                  text: "Buri karita yerekana igiciro giteganyijwe n'inzira yo kwemezwa.",
                },
                {
                  text: `Kanda nomero y'ubusabe ubufungure: ${b(R.c.detail.lines)}, ${b(R.c.detail.quotes)}, ${b(R.c.detail.budget)}, ${b(R.c.detail.chain)} na ${b(R.c.detail.timeline)}.`,
                },
                {
                  text: `Kubaza uwasabye, andika muri ${b(R.c.detail.ask)} ukande ${b(R.c.detail.note)}.`,
                },
                {
                  text: `Iyo buri ${b(R.p.status.approved)}, kanda ${b(R.c.board.createPo)}.`,
                },
              ],
              tips: [
                `${R.p.status.info_requested}: uwasabye agomba gusubiza mbere y'uko bukomeza.`,
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ orders
    {
      slug: "procurement-purchase-orders",
      cat: "buying",
      minutes: 4,
      updated: U,
      pages: ["/procurement/orders"],
      t: {
        en: {
          title: "Issue and manage a purchase order",
          summary:
            "Turn an approved request into a purchase order, send it to the supplier, and cancel or short-close it if plans change.",
          keywords: "purchase order po issue send supplier cancel close",
          facts: {
            who: "Procurement officer",
            time: "4 minutes",
            need: ["An approved purchase request"],
          },
          sections: [
            {
              id: "issue",
              title: "Issue the PO",
              steps: [
                {
                  text: `Open ${b(E.n.purchaseOrders)} and click ${b(E.c.po.newFrom)}.`,
                  shot: "procurement-orders",
                  marks: ["New PO", "By status", "Orders"],
                },
                {
                  text: `Choose the ${b(E.c.po.pickPr)}, the ${b(E.c.po.supplier)}, the ${b(E.c.po.address)}, ${b(E.c.po.terms)} and ${b(E.c.po.needed)}.`,
                },
                {
                  text: `Keep ${b(E.c.po.send)} ticked, then click ${b(E.c.po.create)}.`,
                },
              ],
              warn: E.c.po.overPr.replace(/ \(\{amount\}\)/, ""),
            },
            {
              id: "manage",
              title: "On the PO page",
              steps: [
                {
                  text: `Open the PO. ${b(E.c.po.detail.lines)} shows ${E.c.po.detail.ordered}, ${E.c.po.detail.got} and ${E.c.po.detail.outstanding}.`,
                  shot: "procurement-order-detail",
                  marks: ["The order"],
                },
                {
                  text: `Use ${b(E.c.po.detail.record)}, ${b(E.c.po.detail.print)} or ${b(E.c.po.detail.resend)}.`,
                },
                {
                  text: `${b(E.c.po.detail.cancel)}: ${E.c.po.detail.cancelBody} ${b(E.c.po.detail.close)}: ${E.c.po.detail.closeBody}`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Émettre et gérer un bon de commande",
          summary:
            "Transformez une demande approuvée en bon de commande, envoyez-le au fournisseur, et annulez-le ou soldez-le si les plans changent.",
          keywords:
            "bon de commande émettre envoyer fournisseur annuler solder",
          facts: {
            who: "Responsable des achats",
            time: "4 minutes",
            need: ["Une demande d'achat approuvée"],
          },
          sections: [
            {
              id: "issue",
              title: "Émettre le bon",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.purchaseOrders)} et cliquez ${b(F.c.po.newFrom)}.`,
                  shot: "procurement-orders",
                  marks: ["Nouveau bon", "Par état", "Commandes"],
                },
                {
                  text: `Choisissez ${b(F.c.po.pickPr)}, ${b(F.c.po.supplier)}, ${b(F.c.po.address)}, ${b(F.c.po.terms)} et ${b(F.c.po.needed)}.`,
                },
                {
                  text: `Laissez ${b(F.c.po.send)} coché, puis ${b(F.c.po.create)}.`,
                },
              ],
              warn: "Si le bon dépasse la demande approuvée, demandez d'abord une nouvelle approbation.",
            },
            {
              id: "manage",
              title: "Sur la page du bon",
              steps: [
                {
                  text: `Ouvrez le bon. ${b(F.c.po.detail.lines)} montre ${F.c.po.detail.ordered}, ${F.c.po.detail.got} et ${F.c.po.detail.outstanding}.`,
                  shot: "procurement-order-detail",
                  marks: ["La commande"],
                },
                {
                  text: `Utilisez ${b(F.c.po.detail.record)}, ${b(F.c.po.detail.print)} ou ${b(F.c.po.detail.resend)}.`,
                },
                {
                  text: `${b(F.c.po.detail.cancel)} : ${F.c.po.detail.cancelBody} ${b(F.c.po.detail.close)} : ${F.c.po.detail.closeBody}`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Gusohora no gucunga itegeko ryo kugura",
          summary:
            "Hindura ubusabe bwemejwe itegeko ryo kugura, urwohereze ku utanga ibicuruzwa, kandi urihagarike cyangwa urifunge iyo gahunda ihindutse.",
          keywords: "itegeko ryo kugura po kohereza guhagarika gufunga",
          facts: {
            who: "Ushinzwe kugura",
            time: "Iminota 4",
            need: ["Ubusabe bwo kugura bwemejwe"],
          },
          sections: [
            {
              id: "issue",
              title: "Sohora itegeko",
              steps: [
                {
                  text: `Fungura ${b(R.n.purchaseOrders)} ukande ${b(R.c.po.newFrom)}.`,
                  shot: "procurement-orders",
                  marks: ["Itegeko rishya", "Uko bihagaze", "Amategeko"],
                },
                {
                  text: `Hitamo ${b(R.c.po.pickPr)}, ${b(R.c.po.supplier)}, ${b(R.c.po.address)}, ${b(R.c.po.terms)} na ${b(R.c.po.needed)}.`,
                },
                {
                  text: `Siga ${b(R.c.po.send)} yatoranyijwe, ukande ${b(R.c.po.create)}.`,
                },
              ],
              warn: "Niba itegeko rirenze ubusabe bwemejwe, banza usabe kwemezwa bushya.",
            },
            {
              id: "manage",
              title: "Ku ipaji y'itegeko",
              steps: [
                {
                  text: `Fungura itegeko. ${b(R.c.po.detail.lines)} yerekana ${R.c.po.detail.ordered}, ${R.c.po.detail.got} na ${R.c.po.detail.outstanding}.`,
                  shot: "procurement-order-detail",
                  marks: ["Itegeko"],
                },
                {
                  text: `Koresha ${b(R.c.po.detail.record)}, ${b(R.c.po.detail.print)} cyangwa ${b(R.c.po.detail.resend)}.`,
                },
                {
                  text: `${b(R.c.po.detail.cancel)}: ${R.c.po.detail.cancelBody} ${b(R.c.po.detail.close)}: ${R.c.po.detail.closeBody}`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ receipts
    {
      slug: "procurement-goods-received",
      cat: "buying",
      minutes: 4,
      updated: U,
      pages: ["/procurement/receipts"],
      t: {
        en: {
          title: "Record goods received",
          summary:
            "Confirm what arrived against the PO, with a delivery-note photo, and chase suppliers who haven't invoiced yet.",
          keywords:
            "goods received note grn delivery receipt damaged chase invoice correction",
          facts: {
            who: "Procurement officer or the requester",
            time: "4 minutes",
            need: ["The delivery note"],
          },
          sections: [
            {
              id: "record",
              title: "Record a delivery",
              steps: [
                {
                  text: `Open ${b(E.n.receipts)} and click ${b(E.c.grn.record)}.`,
                  shot: "procurement-receipts",
                  marks: ["Record goods received", "Views"],
                },
                {
                  text: `Choose the ${b(E.c.grn.pickPo)}. For each line enter ${b(E.c.grn.qty)} and the ${b(E.c.grn.condition)} (${E.c.grn.conditions.good}, ${E.c.grn.conditions.damaged}, ${E.c.grn.conditions.rejected}).`,
                  shot: "procurement-grn-sheet",
                  marks: ["Receipt form"],
                },
                {
                  text: `Set ${b(E.c.grn.by)} and ${b(E.c.grn.at)}, add the ${b(E.c.grn.photo)} (or tick ${b(E.c.grn.service)}).`,
                },
                {
                  text: `Click ${b(E.c.grn.save)}. The PO becomes partly received or received.`,
                },
              ],
            },
            {
              id: "follow",
              title: "Chase and correct",
              steps: [
                {
                  text: `Tab ${b(E.c.grn.ni)}: click ${b(E.c.grn.chase)} to email the supplier for their invoice.`,
                },
                {
                  text: `Wrong quantity? Click ${b(E.c.grn.correct)} on the receipt. ${E.c.grn.correctionHint}`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Enregistrer une réception",
          summary:
            "Confirmez ce qui est arrivé par rapport au bon, avec une photo du bon de livraison, et relancez les fournisseurs qui n'ont pas encore facturé.",
          keywords:
            "réception livraison bon de livraison endommagé relance correction",
          facts: {
            who: "Responsable des achats ou le demandeur",
            time: "4 minutes",
            need: ["Le bon de livraison"],
          },
          sections: [
            {
              id: "record",
              title: "Enregistrer une livraison",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.receipts)} et cliquez ${b(F.c.grn.record)}.`,
                  shot: "procurement-receipts",
                  marks: ["Enregistrer", "Vues"],
                },
                {
                  text: `Choisissez le ${b(F.c.grn.pickPo)}. Pour chaque ligne : ${b(F.c.grn.qty)} et ${b(F.c.grn.condition)}.`,
                  shot: "procurement-grn-sheet",
                  marks: ["Formulaire"],
                },
                {
                  text: `Indiquez ${b(F.c.grn.by)} et ${b(F.c.grn.at)}, ajoutez la ${b(F.c.grn.photo)} (ou cochez ${b(F.c.grn.service)}).`,
                },
                {
                  text: `Cliquez ${b(F.c.grn.save)}. Le bon passe en partiellement reçu ou reçu.`,
                },
              ],
            },
            {
              id: "follow",
              title: "Relancer et corriger",
              steps: [
                {
                  text: `Onglet ${b(F.c.grn.ni)} : ${b(F.c.grn.chase)} envoie un email au fournisseur.`,
                },
                {
                  text: `Quantité erronée ? ${b(F.c.grn.correct)} sur la réception. ${F.c.grn.correctionHint}`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kwandika ibyakiriwe",
          summary:
            "Emeza ibyageze ugereranyije n'itegeko, ufite ifoto y'urupapuro rw'itangwa, kandi wibutse abatanga batarohereza fagitire.",
          keywords: "ibyakiriwe itangwa byangiritse kwibutsa gukosora",
          facts: {
            who: "Ushinzwe kugura cyangwa uwasabye",
            time: "Iminota 4",
            need: ["Urupapuro rw'itangwa"],
          },
          sections: [
            {
              id: "record",
              title: "Andika ibyageze",
              steps: [
                {
                  text: `Fungura ${b(R.n.receipts)} ukande ${b(R.c.grn.record)}.`,
                  shot: "procurement-receipts",
                  marks: ["Andika ibyakiriwe", "Uburyo bwo kureba"],
                },
                {
                  text: `Hitamo ${b(R.c.grn.pickPo)}. Kuri buri murongo andika ${b(R.c.grn.qty)} na ${b(R.c.grn.condition)}.`,
                  shot: "procurement-grn-sheet",
                  marks: ["Ifishi"],
                },
                {
                  text: `Shyiraho ${b(R.c.grn.by)} na ${b(R.c.grn.at)}, wongereho ${b(R.c.grn.photo)} (cyangwa uhitemo ${b(R.c.grn.service)}).`,
                },
                {
                  text: `Kanda ${b(R.c.grn.save)}. Itegeko rihinduka ryakiriwe igice cyangwa ryose.`,
                },
              ],
            },
            {
              id: "follow",
              title: "Kwibutsa no gukosora",
              steps: [
                {
                  text: `${b(R.c.grn.ni)}: ${b(R.c.grn.chase)} yoherereza utanga imeyili isaba fagitire.`,
                },
                {
                  text: `Umubare utari wo? Kanda ${b(R.c.grn.correct)} ku byakiriwe. ${R.c.grn.correctionHint}`,
                },
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ bills
    {
      slug: "procurement-bills",
      cat: "bills",
      minutes: 6,
      updated: U,
      pages: ["/procurement/bills"],
      start: true,
      t: {
        en: {
          title: "Enter a supplier bill and match it",
          summary:
            "Upload the supplier's invoice, link it to a PO or contract, let HEBUZA match it against the order and receipt, then send it for approval.",
          keywords:
            "bill supplier invoice match three-way po grn contract no po dispute void advance",
          facts: {
            who: "Procurement prepares; finance approves, authorises and pays",
            time: "6 minutes",
            need: ["The supplier's invoice (PDF or photo)"],
          },
          sections: [
            {
              id: "enter",
              title: "Enter the bill",
              steps: [
                {
                  text: `Open ${b(E.n.bills)} and click ${b(E.de.bills.enter)}.`,
                  shot: "procurement-bills",
                  marks: ["Enter bill", "Bill views", "Bills"],
                },
                {
                  text: `Attach the ${b(E.de.form.file)}. Choose the ${b(E.de.form.supplier)} and type the ${b(E.de.form.invoiceNo)}, ${b(E.de.form.invoiceDate)} and ${b(E.de.form.dueOn)}.`,
                  shot: "procurement-bill-new",
                  marks: ["Bill form"],
                },
                {
                  text: `Under ${b(E.de.form.link)} choose ${b(E.de.form.linkPo)}, ${b(E.de.form.linkContract)} or ${b(E.de.form.linkNone)}. ${E.de.form.justHint}`,
                },
                {
                  text: `Check the ${b(E.de.form.lines)}, then click ${b(E.de.form.submit)} (or ${b(E.de.form.saveDraft)}).`,
                },
              ],
              warn: "The form warns if this invoice number is already recorded for the supplier. Never enter it twice.",
            },
            {
              id: "match",
              title: "Read the match",
              steps: [
                {
                  text: `Open the bill. Tabs: ${b(E.de.detail.tabs.lines)}, ${b(E.de.detail.tabs.match)}, ${b(E.de.detail.tabs.approvals)}, ${b(E.de.detail.tabs.payments)}, ${b(E.de.detail.tabs.files)}, ${b(E.de.detail.tabs.history)}.`,
                  shot: "procurement-bill-detail",
                  marks: ["Bill tabs"],
                },
                {
                  text: `${b(E.de.detail.tabs.match)} compares bill, PO and goods received: ${E.p.match.matched}, ${E.p.match.tolerance}, ${E.p.match.exception}.`,
                },
                {
                  text: `On a ${E.p.match.exception.toLowerCase()}: ${b(E.de.detail.actions.edit)} if the supplier corrected it, ${b(E.de.detail.actions.credit)}, or ${b(E.de.detail.actions.exception)}.`,
                },
                {
                  text: `Other actions: ${b(E.de.detail.actions.advance)}, ${b(E.de.detail.actions.dispute)} / ${b(E.de.detail.actions.resolve)}, ${b(E.de.detail.actions.void)}.`,
                },
              ],
              warn: `${E.de.detail.disputeHint} ${E.de.detail.voidHint}`,
              tips: [
                E.de.bills.sub,
                `${E.de.bills.recurring.title}: click ${E.de.bills.recurring.draft} to draft next month's rent and utility bills.`,
              ],
            },
          ],
        },
        fr: {
          title: "Saisir une facture fournisseur et la rapprocher",
          summary:
            "Chargez la facture, liez-la à un bon de commande ou un contrat, laissez HEBUZA la comparer à la commande et à la réception, puis envoyez-la en approbation.",
          keywords:
            "facture fournisseur rapprochement bon de commande réception contrat litige annuler avance",
          facts: {
            who: "Les achats préparent ; la finance approuve, autorise et paie",
            time: "6 minutes",
            need: ["La facture du fournisseur (PDF ou photo)"],
          },
          sections: [
            {
              id: "enter",
              title: "Saisir la facture",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.bills)} et cliquez ${b(F.de.bills.enter)}.`,
                  shot: "procurement-bills",
                  marks: ["Saisir", "Vues", "Factures"],
                },
                {
                  text: `Joignez la ${b(F.de.form.file)}. Choisissez le ${b(F.de.form.supplier)} et saisissez ${b(F.de.form.invoiceNo)}, ${b(F.de.form.invoiceDate)} et ${b(F.de.form.dueOn)}.`,
                  shot: "procurement-bill-new",
                  marks: ["Formulaire"],
                },
                {
                  text: `Sous ${b(F.de.form.link)}, choisissez ${b(F.de.form.linkPo)}, ${b(F.de.form.linkContract)} ou ${b(F.de.form.linkNone)}. ${F.de.form.justHint}`,
                },
                {
                  text: `Vérifiez les ${b(F.de.form.lines)}, puis ${b(F.de.form.submit)} (ou ${b(F.de.form.saveDraft)}).`,
                },
              ],
              warn: "Le formulaire avertit si ce numéro est déjà saisi pour ce fournisseur. Ne le saisissez jamais deux fois.",
            },
            {
              id: "match",
              title: "Lire le rapprochement",
              steps: [
                {
                  text: `Ouvrez la facture. Onglets : ${b(F.de.detail.tabs.lines)}, ${b(F.de.detail.tabs.match)}, ${b(F.de.detail.tabs.approvals)}, ${b(F.de.detail.tabs.payments)}, ${b(F.de.detail.tabs.files)}, ${b(F.de.detail.tabs.history)}.`,
                  shot: "procurement-bill-detail",
                  marks: ["Onglets"],
                },
                {
                  text: `${b(F.de.detail.tabs.match)} compare facture, bon et réception : ${F.p.match.matched}, ${F.p.match.tolerance}, ${F.p.match.exception}.`,
                },
                {
                  text: `En cas d'écart : ${b(F.de.detail.actions.edit)}, ${b(F.de.detail.actions.credit)} ou ${b(F.de.detail.actions.exception)}.`,
                },
                {
                  text: `Autres actions : ${b(F.de.detail.actions.advance)}, ${b(F.de.detail.actions.dispute)} / ${b(F.de.detail.actions.resolve)}, ${b(F.de.detail.actions.void)}.`,
                },
              ],
              warn: `${F.de.detail.disputeHint} ${F.de.detail.voidHint}`,
              tips: [F.de.bills.sub],
            },
          ],
        },
        rw: {
          title: "Kwandika fagitire y'utanga ibicuruzwa no kuyihuza",
          summary:
            "Ohereza fagitire y'utanga, uyihuze n'itegeko cyangwa amasezerano, HEBUZA iyigereranye n'itegeko n'ibyakiriwe, hanyuma uyohereze kwemezwa.",
          keywords:
            "fagitire utanga guhuza itegeko ibyakiriwe amasezerano impaka guhagarika avansi",
          facts: {
            who: "Ishami ryo kugura ritegura; imari iremeza ikishyura",
            time: "Iminota 6",
            need: ["Fagitire y'utanga (PDF cyangwa ifoto)"],
          },
          sections: [
            {
              id: "enter",
              title: "Andika fagitire",
              steps: [
                {
                  text: `Fungura ${b(R.n.bills)} ukande ${b(R.de.bills.enter)}.`,
                  shot: "procurement-bills",
                  marks: ["Andika fagitire", "Uburyo bwo kureba", "Fagitire"],
                },
                {
                  text: `Ongeraho ${b(R.de.form.file)}. Hitamo ${b(R.de.form.supplier)} wandike ${b(R.de.form.invoiceNo)}, ${b(R.de.form.invoiceDate)} na ${b(R.de.form.dueOn)}.`,
                  shot: "procurement-bill-new",
                  marks: ["Ifishi"],
                },
                {
                  text: `Muri ${b(R.de.form.link)} hitamo ${b(R.de.form.linkPo)}, ${b(R.de.form.linkContract)} cyangwa ${b(R.de.form.linkNone)}. ${R.de.form.justHint}`,
                },
                {
                  text: `Reba ${b(R.de.form.lines)}, hanyuma ${b(R.de.form.submit)} (cyangwa ${b(R.de.form.saveDraft)}).`,
                },
              ],
              warn: "Ifishi ikuburira niba iyi nomero ya fagitire isanzwe yanditswe. Ntukayandike kabiri.",
            },
            {
              id: "match",
              title: "Soma uko ihuye",
              steps: [
                {
                  text: `Fungura fagitire. Ibice: ${b(R.de.detail.tabs.lines)}, ${b(R.de.detail.tabs.match)}, ${b(R.de.detail.tabs.approvals)}, ${b(R.de.detail.tabs.payments)}, ${b(R.de.detail.tabs.files)}, ${b(R.de.detail.tabs.history)}.`,
                  shot: "procurement-bill-detail",
                  marks: ["Ibice"],
                },
                {
                  text: `${b(R.de.detail.tabs.match)} igereranya fagitire, itegeko n'ibyakiriwe: ${R.p.match.matched}, ${R.p.match.tolerance}, ${R.p.match.exception}.`,
                },
                {
                  text: `Bidahuye: ${b(R.de.detail.actions.edit)}, ${b(R.de.detail.actions.credit)} cyangwa ${b(R.de.detail.actions.exception)}.`,
                },
                {
                  text: `Ibindi: ${b(R.de.detail.actions.advance)}, ${b(R.de.detail.actions.dispute)} / ${b(R.de.detail.actions.resolve)}, ${b(R.de.detail.actions.void)}.`,
                },
              ],
              warn: `${R.de.detail.disputeHint} ${R.de.detail.voidHint}`,
              tips: [R.de.bills.sub],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ payments
    {
      slug: "procurement-payments",
      cat: "bills",
      minutes: 2,
      updated: U,
      pages: ["/procurement/payments"],
      t: {
        en: {
          title: "See which bills are paid",
          summary:
            "Authorised bills wait here for finance. Finance pays them from its own workspace; you see the reference and the remittance advice.",
          keywords: "payments paid remittance supplier waiting finance",
          facts: { who: "Procurement officer", time: "2 minutes" },
          sections: [
            {
              id: "track",
              title: "Track payments",
              steps: [
                {
                  text: `Open ${b(E.n.payments)}.`,
                  shot: "procurement-payments",
                  marks: ["Payments"],
                },
                {
                  text: `${b(E.de.pay.waiting)} lists authorised bills. A ${b(E.de.pay.locked)} row is blocked after a bank change.`,
                },
                {
                  text: `${b(E.de.pay.history)} shows ${b(E.de.pay.cols.ref)}, ${b(E.de.pay.cols.method)} and the ${b(E.de.pay.cols.remit)}.`,
                },
              ],
              tips: [
                "Procurement never pays: the person who prepares a bill can't also approve or pay it.",
              ],
            },
          ],
        },
        fr: {
          title: "Voir quelles factures sont payées",
          summary:
            "Les factures autorisées attendent ici la finance, qui les paie depuis son propre espace ; vous voyez la référence et l'avis de paiement.",
          keywords: "paiements payé avis de paiement fournisseur",
          facts: { who: "Responsable des achats", time: "2 minutes" },
          sections: [
            {
              id: "track",
              title: "Suivre les paiements",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.payments)}.`,
                  shot: "procurement-payments",
                  marks: ["Paiements"],
                },
                {
                  text: `${b(F.de.pay.waiting)} liste les factures autorisées. Une ligne ${b(F.de.pay.locked)} est bloquée après un changement bancaire.`,
                },
                {
                  text: `${b(F.de.pay.history)} montre ${b(F.de.pay.cols.ref)}, ${b(F.de.pay.cols.method)} et l'${b(F.de.pay.cols.remit)}.`,
                },
              ],
              tips: [
                "Les achats ne paient jamais : qui prépare une facture ne peut ni l'approuver ni la payer.",
              ],
            },
          ],
        },
        rw: {
          title: "Kureba fagitire zishyuwe",
          summary:
            "Fagitire zemerewe kwishyurwa zitegereza imari hano. Imari izishyura iri ku rubuga rwayo; wowe ubona nomero n'inyandiko yo kumenyesha.",
          keywords: "ubwishyu byishyuwe kumenyesha utanga",
          facts: { who: "Ushinzwe kugura", time: "Iminota 2" },
          sections: [
            {
              id: "track",
              title: "Kurikirana ubwishyu",
              steps: [
                {
                  text: `Fungura ${b(R.n.payments)}.`,
                  shot: "procurement-payments",
                  marks: ["Ubwishyu"],
                },
                {
                  text: `${b(R.de.pay.waiting)} yerekana fagitire zemewe. Umurongo ${b(R.de.pay.locked)} urafunze nyuma yo guhindura konti.`,
                },
                {
                  text: `${b(R.de.pay.history)} yerekana ${b(R.de.pay.cols.ref)}, ${b(R.de.pay.cols.method)} na ${b(R.de.pay.cols.remit)}.`,
                },
              ],
              tips: [
                "Ishami ryo kugura ntiryishyura: uteguye fagitire ntashobora no kuyemeza cyangwa kuyishyura.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ deposits
    {
      slug: "procurement-deposits",
      cat: "bills",
      minutes: 4,
      updated: U,
      pages: ["/procurement/deposits"],
      t: {
        en: {
          title: "Track deposits and advances",
          summary:
            "Record money paid ahead to suppliers, then record its return, offset it against a bill, or ask the executive to forfeit it.",
          keywords:
            "deposit advance prepayment return offset forfeit lease deposit",
          facts: {
            who: "Procurement officer; executive approves forfeits",
            time: "4 minutes",
          },
          sections: [
            {
              id: "add",
              title: "Record a deposit or advance",
              steps: [
                {
                  text: `Open ${b(E.n.deposits)} and click ${b(E.ab.deposits.add)}.`,
                  shot: "procurement-deposits",
                  marks: ["Record", "Types"],
                },
                {
                  text: `Choose ${b(E.ab.deposits.form.kind)}, ${b(E.ab.deposits.form.supplier)}, ${b(E.ab.deposits.form.amount)}, optionally ${b(E.ab.deposits.form.contract)} and ${b(E.ab.deposits.form.returnDue)}. Save.`,
                },
              ],
              tips: [E.ab.deposits.form.financeNote],
            },
            {
              id: "settle",
              title: "Settle it",
              steps: [
                { text: `On the row open ${b(E.p.shell.actions)}.` },
                {
                  text: `${b(E.ab.deposits.actions.ret)}: enter ${b(E.ab.deposits.ret.received)}, ${b(E.ab.deposits.ret.bankRef)}, ${b(E.ab.deposits.ret.date)}, any ${b(E.ab.deposits.ret.deductions)} and the ${b(E.ab.deposits.ret.proof)}.`,
                },
                {
                  text: `${b(E.ab.deposits.actions.offset)}: pick the ${b(E.ab.deposits.offset.bill)} and the ${b(E.ab.deposits.offset.amount)}.`,
                },
                {
                  text: `${b(E.ab.deposits.actions.forfeit)}: give a ${b(E.ab.deposits.forfeit.reason)} and click ${b(E.ab.deposits.forfeit.submit)}.`,
                },
              ],
              warn: "Forfeiting writes the money off. It needs the executive's approval.",
            },
          ],
        },
        fr: {
          title: "Suivre les dépôts et avances",
          summary:
            "Enregistrez l'argent versé d'avance aux fournisseurs, puis son retour, son imputation sur une facture, ou demandez au dirigeant de le passer en perte.",
          keywords: "dépôt avance acompte retour imputation perte caution",
          facts: {
            who: "Responsable des achats ; le dirigeant approuve les pertes",
            time: "4 minutes",
          },
          sections: [
            {
              id: "add",
              title: "Enregistrer un dépôt ou une avance",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.deposits)} et cliquez ${b(F.ab.deposits.add)}.`,
                  shot: "procurement-deposits",
                  marks: ["Enregistrer", "Types"],
                },
                {
                  text: `Choisissez ${b(F.ab.deposits.form.kind)}, ${b(F.ab.deposits.form.supplier)}, ${b(F.ab.deposits.form.amount)}, éventuellement ${b(F.ab.deposits.form.contract)} et ${b(F.ab.deposits.form.returnDue)}. Enregistrez.`,
                },
              ],
              tips: [F.ab.deposits.form.financeNote],
            },
            {
              id: "settle",
              title: "Le solder",
              steps: [
                { text: `Sur la ligne, ouvrez ${b(F.p.shell.actions)}.` },
                {
                  text: `${b(F.ab.deposits.actions.ret)} : ${b(F.ab.deposits.ret.received)}, ${b(F.ab.deposits.ret.bankRef)}, ${b(F.ab.deposits.ret.date)}, les ${b(F.ab.deposits.ret.deductions)} et la ${b(F.ab.deposits.ret.proof)}.`,
                },
                {
                  text: `${b(F.ab.deposits.actions.offset)} : choisissez la ${b(F.ab.deposits.offset.bill)} et le ${b(F.ab.deposits.offset.amount)}.`,
                },
                {
                  text: `${b(F.ab.deposits.actions.forfeit)} : donnez un ${b(F.ab.deposits.forfeit.reason)} et cliquez ${b(F.ab.deposits.forfeit.submit)}.`,
                },
              ],
              warn: "Passer en perte efface la somme. Le dirigeant doit l'approuver.",
            },
          ],
        },
        rw: {
          title: "Gukurikirana ingwate na avansi",
          summary:
            "Andika amafaranga yahawe abatanga mbere, hanyuma wandike ko yagarutse, uyakure kuri fagitire, cyangwa usabe umuyobozi kuyareka.",
          keywords: "ingwate avansi kwishyura mbere kugaruka gukura kureka",
          facts: {
            who: "Ushinzwe kugura; umuyobozi yemeza kureka",
            time: "Iminota 4",
          },
          sections: [
            {
              id: "add",
              title: "Andika ingwate cyangwa avansi",
              steps: [
                {
                  text: `Fungura ${b(R.n.deposits)} ukande ${b(R.ab.deposits.add)}.`,
                  shot: "procurement-deposits",
                  marks: ["Andika", "Ubwoko"],
                },
                {
                  text: `Hitamo ${b(R.ab.deposits.form.kind)}, ${b(R.ab.deposits.form.supplier)}, ${b(R.ab.deposits.form.amount)}, niba bihari ${b(R.ab.deposits.form.contract)} na ${b(R.ab.deposits.form.returnDue)}. Bika.`,
                },
              ],
              tips: [R.ab.deposits.form.financeNote],
            },
            {
              id: "settle",
              title: "Kuyirangiza",
              steps: [
                { text: `Ku murongo fungura ${b(R.p.shell.actions)}.` },
                {
                  text: `${b(R.ab.deposits.actions.ret)}: andika ${b(R.ab.deposits.ret.received)}, ${b(R.ab.deposits.ret.bankRef)}, ${b(R.ab.deposits.ret.date)}, ${b(R.ab.deposits.ret.deductions)} na ${b(R.ab.deposits.ret.proof)}.`,
                },
                {
                  text: `${b(R.ab.deposits.actions.offset)}: hitamo ${b(R.ab.deposits.offset.bill)} na ${b(R.ab.deposits.offset.amount)}.`,
                },
                {
                  text: `${b(R.ab.deposits.actions.forfeit)}: tanga ${b(R.ab.deposits.forfeit.reason)} ukande ${b(R.ab.deposits.forfeit.submit)}.`,
                },
              ],
              warn: "Kureka bisiba ayo mafaranga. Bisaba kwemezwa n'umuyobozi.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ reports (ageing)
    {
      slug: "procurement-reports",
      cat: "admin",
      minutes: 4,
      updated: U,
      pages: ["/procurement/reports"],
      t: {
        en: {
          title: "Payables ageing, statements and spend",
          summary:
            "See what HEBUZA owes by age, send a supplier statement, compare spend with budget and list upcoming obligations.",
          keywords:
            "ageing payables statement spend budget obligations export csv",
          facts: { who: "Procurement officer", time: "4 minutes" },
          sections: [
            {
              id: "tabs",
              title: "Use the report tabs",
              steps: [
                {
                  text: `Open ${b(E.n.reports)}. Tabs: ${b(E.ab.reports.tabs.ageing)}, ${b(E.ab.reports.tabs.statement)}, ${b(E.ab.reports.tabs.spend)}, ${b(E.ab.reports.tabs.obligations)}.`,
                  shot: "procurement-reports",
                  marks: ["Report tabs"],
                },
                {
                  text: `${b(E.ab.reports.tabs.ageing)}: set ${b(E.ab.reports.asOf)}; buckets go from ${E.ab.reports.buckets.not_due} to ${E.ab.reports.buckets["90_plus"]} days.`,
                },
                {
                  text: `${b(E.ab.reports.tabs.statement)}: ${b(E.ab.reports.chooseSupplier)}, ${b(E.ab.reports.from)} and ${b(E.ab.reports.to)}, then ${b(E.ab.reports.send)}.`,
                },
                {
                  text: `${b(E.ab.reports.tabs.spend)} compares spend and committed amounts with each budget; ${b(E.ab.reports.tabs.obligations)} lists the next deadlines.`,
                },
                {
                  text: `Click ${b(E.p.common.export)} to download a tab. ${E.ab.reports.exported}.`,
                },
              ],
              tips: [E.ab.reports.defs.ageing],
            },
          ],
        },
        fr: {
          title: "Ancienneté, relevés et dépenses",
          summary:
            "Voyez ce que HEBUZA doit par ancienneté, envoyez un relevé fournisseur, comparez dépenses et budget et listez les échéances.",
          keywords:
            "ancienneté dettes relevé dépenses budget échéances export csv",
          facts: { who: "Responsable des achats", time: "4 minutes" },
          sections: [
            {
              id: "tabs",
              title: "Utiliser les onglets",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.reports)}. Onglets : ${b(F.ab.reports.tabs.ageing)}, ${b(F.ab.reports.tabs.statement)}, ${b(F.ab.reports.tabs.spend)}, ${b(F.ab.reports.tabs.obligations)}.`,
                  shot: "procurement-reports",
                  marks: ["Onglets"],
                },
                {
                  text: `${b(F.ab.reports.tabs.ageing)} : réglez ${b(F.ab.reports.asOf)}.`,
                },
                {
                  text: `${b(F.ab.reports.tabs.statement)} : ${b(F.ab.reports.chooseSupplier)}, ${b(F.ab.reports.from)} et ${b(F.ab.reports.to)}, puis ${b(F.ab.reports.send)}.`,
                },
                {
                  text: `${b(F.ab.reports.tabs.spend)} compare dépenses et engagements au budget ; ${b(F.ab.reports.tabs.obligations)} liste les échéances.`,
                },
                {
                  text: `Cliquez ${b(F.p.common.export)} pour télécharger. ${F.ab.reports.exported}.`,
                },
              ],
              tips: [F.ab.reports.defs.ageing],
            },
          ],
        },
        rw: {
          title: "Igihe imyenda imaze, raporo z'abatanga n'ibyakoreshejwe",
          summary:
            "Reba ibyo HEBUZA ibereyemo ukurikije igihe, wohereze raporo ku utanga, ugereranye ibyakoreshejwe n'ingengo kandi urebe inshingano zizaza.",
          keywords:
            "igihe imyenda raporo ibyakoreshejwe ingengo inshingano csv",
          facts: { who: "Ushinzwe kugura", time: "Iminota 4" },
          sections: [
            {
              id: "tabs",
              title: "Koresha ibice bya raporo",
              steps: [
                {
                  text: `Fungura ${b(R.n.reports)}. Ibice: ${b(R.ab.reports.tabs.ageing)}, ${b(R.ab.reports.tabs.statement)}, ${b(R.ab.reports.tabs.spend)}, ${b(R.ab.reports.tabs.obligations)}.`,
                  shot: "procurement-reports",
                  marks: ["Ibice"],
                },
                {
                  text: `${b(R.ab.reports.tabs.ageing)}: shyiraho ${b(R.ab.reports.asOf)}.`,
                },
                {
                  text: `${b(R.ab.reports.tabs.statement)}: ${b(R.ab.reports.chooseSupplier)}, ${b(R.ab.reports.from)} na ${b(R.ab.reports.to)}, hanyuma ${b(R.ab.reports.send)}.`,
                },
                {
                  text: `${b(R.ab.reports.tabs.spend)} igereranya ibyakoreshejwe n'ingengo; ${b(R.ab.reports.tabs.obligations)} yerekana ibiri imbere.`,
                },
                {
                  text: `Kanda ${b(R.p.common.export)} ukure raporo. ${R.ab.reports.exported}.`,
                },
              ],
              tips: [R.ab.reports.defs.ageing],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ settings
    {
      slug: "procurement-settings",
      cat: "admin",
      minutes: 2,
      updated: U,
      pages: ["/procurement/settings"],
      t: {
        en: {
          title: "Approval limits and budgets",
          summary:
            "See the limits that decide who approves, how many quotes you need, the match tolerance and each budget. They are read-only here.",
          keywords: "limits budget quotes tolerance approval route settings",
          facts: {
            who: "Procurement reads; finance proposes; executive approves",
            time: "2 minutes",
          },
          sections: [
            {
              id: "read",
              title: "Read the limits",
              steps: [
                {
                  text: `Open ${b(E.n.settings)}.`,
                  shot: "procurement-settings",
                  marks: ["Limits"],
                },
                {
                  text: `Check ${b(E.ab.settings.limits.financeMax)}, ${b(E.ab.settings.limits.quoteThreshold)}, ${b(E.ab.settings.limits.tolerance)}, ${b(E.ab.settings.limits.lockHours)} and ${b(E.ab.settings.limits.reminderOffsets)}.`,
                },
                {
                  text: `${b(E.ab.settings.budgets)} shows how much of each budget is used.`,
                },
              ],
              tips: [E.ab.settings.sub],
            },
          ],
        },
        fr: {
          title: "Plafonds d'approbation et budgets",
          summary:
            "Voyez les plafonds qui décident qui approuve, combien de devis il faut, la tolérance de rapprochement et chaque budget. Lecture seule ici.",
          keywords: "plafonds budget devis tolérance circuit paramètres",
          facts: {
            who: "Les achats consultent ; la finance propose ; le dirigeant approuve",
            time: "2 minutes",
          },
          sections: [
            {
              id: "read",
              title: "Lire les plafonds",
              steps: [
                {
                  text: `Ouvrez ${b(F.n.settings)}.`,
                  shot: "procurement-settings",
                  marks: ["Plafonds"],
                },
                {
                  text: `Vérifiez ${b(F.ab.settings.limits.financeMax)}, ${b(F.ab.settings.limits.quoteThreshold)}, ${b(F.ab.settings.limits.tolerance)}, ${b(F.ab.settings.limits.lockHours)} et ${b(F.ab.settings.limits.reminderOffsets)}.`,
                },
                {
                  text: `${b(F.ab.settings.budgets)} montre la part consommée de chaque budget.`,
                },
              ],
              tips: [F.ab.settings.sub],
            },
          ],
        },
        rw: {
          title: "Imbibi zo kwemeza n'ingengo y'imari",
          summary:
            "Reba imbibi zigena uwemeza, umubare w'ibiciro ukenewe, ubworoherane bwo guhuza n'ingengo zose. Hano ni ugusoma gusa.",
          keywords: "imbibi ingengo ibiciro guhuza igenamiterere",
          facts: {
            who: "Ishami ryo kugura rirasoma; imari irasaba; umuyobozi aremeza",
            time: "Iminota 2",
          },
          sections: [
            {
              id: "read",
              title: "Soma imbibi",
              steps: [
                {
                  text: `Fungura ${b(R.n.settings)}.`,
                  shot: "procurement-settings",
                  marks: ["Imbibi"],
                },
                {
                  text: `Reba ${b(R.ab.settings.limits.financeMax)}, ${b(R.ab.settings.limits.quoteThreshold)}, ${b(R.ab.settings.limits.tolerance)}, ${b(R.ab.settings.limits.lockHours)} na ${b(R.ab.settings.limits.reminderOffsets)}.`,
                },
                {
                  text: `${b(R.ab.settings.budgets)} yerekana ingano yakoreshejwe muri buri ngengo.`,
                },
              ],
              tips: [R.ab.settings.sub],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ help
    {
      slug: "procurement-help-button",
      cat: "start",
      minutes: 1,
      updated: U,
      pages: ["/procurement"],
      t: {
        en: {
          title: "Get help on any procurement screen",
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
                  shot: "procurement-help",
                  marks: ["Help"],
                },
                {
                  text: `${b(E.g.forThisPage)} lists this screen's guides first.`,
                },
                {
                  text: `${b(E.n.guides)} in the side menu lists every procurement guide.`,
                },
              ],
            },
          ],
        },
        fr: {
          title: "Obtenir de l'aide sur un écran achats",
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
                  shot: "procurement-help",
                  marks: ["Aide"],
                },
                {
                  text: `${b(F.g.forThisPage)} liste d'abord les guides de cet écran.`,
                },
                {
                  text: `${b(F.n.guides)} dans le menu latéral liste tous les guides achats.`,
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kubona ubufasha kuri buri paji yo kugura",
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
                  shot: "procurement-help",
                  marks: ["Ubufasha"],
                },
                {
                  text: `${b(R.g.forThisPage)} ibanza kwerekana amabwiriza y'iyi paji.`,
                },
                {
                  text: `${b(R.n.guides)} muri menu y'uruhande yerekana amabwiriza yose yo kugura.`,
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

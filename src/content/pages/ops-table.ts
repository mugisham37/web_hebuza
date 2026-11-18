// Copy for the reusable OpsTable organism (lane A, src/components/molecules/ops/ops-table.tsx).
import type { Locale } from "@/shared/i18n/config";

const en = {
  selectAll: "Select all rows on this page",
  selectRow: "Select {label}",
  expand: "Show details for {label}",
  collapse: "Hide details for {label}",
  sortBy: "Sort by {col}",
  showMore: "Show {n} more",
  pageSelected: "All {n} rows on this page are selected.",
  allSelected: "All {n} matching rows are selected.",
  open: "Open",
  focusHint: "J/K to move · Enter to open · X to select",
};
export type OpsTableCopy = typeof en;
const fr: OpsTableCopy = {
  selectAll: "Sélectionner toutes les lignes de la page",
  selectRow: "Sélectionner {label}",
  expand: "Afficher les détails de {label}",
  collapse: "Masquer les détails de {label}",
  sortBy: "Trier par {col}",
  showMore: "Afficher {n} de plus",
  pageSelected: "Les {n} lignes de cette page sont sélectionnées.",
  allSelected: "Les {n} résultats sont sélectionnés.",
  open: "Ouvrir",
  focusHint: "J/K pour naviguer · Entrée pour ouvrir · X pour sélectionner",
};
const rw: OpsTableCopy = {
  selectAll: "Hitamo imirongo yose iri kuri iyi paji",
  selectRow: "Hitamo {label}",
  expand: "Erekana ibisobanuro bya {label}",
  collapse: "Hisha ibisobanuro bya {label}",
  sortBy: "Tondeka ukurikije {col}",
  showMore: "Erekana {n} zindi",
  pageSelected: "Imirongo {n} yose iri kuri iyi paji yatoranyijwe.",
  allSelected: "Ibisubizo {n} byose byatoranyijwe.",
  open: "Fungura",
  focusHint: "J/K kugenda · Enter gufungura · X guhitamo",
};
export const opsTableCopy = (l: Locale): OpsTableCopy => ({ en, fr, rw })[l];

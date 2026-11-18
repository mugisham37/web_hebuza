// Executive overview copy (/exec). rw/fr are first drafts for native review. No feature IDs in UI.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Overview",
  sub: "Last 30 days to {date}. Figures refresh every minute.",
  revenue: "Revenue invoiced",
  revenueAll: "{amount} all time",
  collections: "Collections",
  receivables: "Receivables",
  ageing: "Receivables ageing",
  cases: "Cases by status",
  casesTotal: "{n} cases",
  sla: "SLA breaches",
  slaHint: "Open cases past their deadline",
  bookings: "Bookings",
  bookingsHint: "{n} completed",
  conversion: "Lead conversion",
  conversionHint: "{won} of {leads} leads won",
  ai: "AI assistant cost",
  aiHint: "{n} calls, last 30 days",
  failed: "Executive overview",
  approvals: "Open my approvals",
};
type Copy = typeof en;

const rw: Copy = {
  title: "Incamake",
  sub: "Iminsi 30 ishize kugeza {date}. Imibare ivugururwa buri munota.",
  revenue: "Amafaranga yanditswe ku nyemezabuguzi",
  revenueAll: "{amount} kuva mbere",
  collections: "Amafaranga yinjiye",
  receivables: "Amafaranga ataraboneka",
  ageing: "Igihe amafaranga ataraboneka amaze",
  cases: "Dosiye ukurikije uko zihagaze",
  casesTotal: "Dosiye {n}",
  sla: "Dosiye zarenze igihe",
  slaHint: "Dosiye zifunguye zarenze itariki ntarengwa",
  bookings: "Gahunda zafashwe",
  bookingsHint: "{n} zarangiye",
  conversion: "Abakiriya bashya babonetse",
  conversionHint: "{won} kuri {leads} babaye abakiriya",
  ai: "Ikiguzi cy'umufasha wa AI",
  aiHint: "Inshuro {n}, iminsi 30 ishize",
  failed: "Incamake y'ubuyobozi",
  approvals: "Fungura ibyo ngomba kwemeza",
};

const fr: Copy = {
  title: "Vue d'ensemble",
  sub: "30 derniers jours jusqu'au {date}. Chiffres actualisés chaque minute.",
  revenue: "Chiffre d'affaires facturé",
  revenueAll: "{amount} au total",
  collections: "Encaissements",
  receivables: "Créances",
  ageing: "Ancienneté des créances",
  cases: "Dossiers par statut",
  casesTotal: "{n} dossiers",
  sla: "Dépassements de SLA",
  slaHint: "Dossiers ouverts au-delà de l'échéance",
  bookings: "Rendez-vous",
  bookingsHint: "{n} terminés",
  conversion: "Conversion des prospects",
  conversionHint: "{won} prospects gagnés sur {leads}",
  ai: "Coût de l'assistant IA",
  aiHint: "{n} appels, 30 derniers jours",
  failed: "Vue direction",
  approvals: "Ouvrir mes approbations",
};

const ALL: Record<Locale, Copy> = { en, rw, fr };
export const execOverview = (l: Locale): Copy => ALL[l] ?? en;

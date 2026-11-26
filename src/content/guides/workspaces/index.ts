import "server-only";
import type { Locale } from "@/shared/i18n/config";
import { workspacesFor, type Role, type Workspace } from "@/shared/auth/roles";
import type { Guide, ShotData } from "../types";
import { CLIENT_WS } from "./client";
import { AGENT_WS } from "./agent";
import { WORK_WS } from "./work";
import { OPS_WS } from "./ops";
import { FINANCE_WS } from "./finance";
import { MARKETING_WS } from "./marketing";
import { PROCUREMENT_WS } from "./procurement";
import { PARTNERS_WS } from "./partners";
import { EXEC_WS } from "./exec";
import { SYSTEM_WS } from "./system";
import shotsJson from "../shots.json";
import clientShots from "../shots/client.json";
import agentShots from "../shots/agent.json";
import workShots from "../shots/work.json";
import opsShots from "../shots/ops.json";
import financeShots from "../shots/finance.json";
import marketingShots from "../shots/marketing.json";
import procurementShots from "../shots/procurement.json";
import partnersShots from "../shots/partners.json";
import execShots from "../shots/exec.json";
import systemShots from "../shots/system.json";

/**
 * Dashboard guides. One file per workspace (./<workspace>.ts) and its screenshots (../shots/<workspace>.json, written by
 * scripts/guides/ws-<workspace>.spec.ts). Server-only: a person receives only the sets for the dashboards they can open
 * (guidesFor). System administrators receive every set, so they can see what each role sees when granting access.
 */
export type WsCat = { key: string; t: Record<Locale, string> };
export type WsGuideSet = {
  workspace: Workspace;
  cats: WsCat[];
  guides: WsGuide[];
};
/** A dashboard guide: `cat` is one of its set's cats; `pages` are the routes it explains (the "?" panel lists these first); `start` marks first-visit guides. */
export type WsGuide = Omit<Guide, "cat" | "audience"> & { cat: string; pages: string[]; start?: boolean };

export const WS_SETS: Record<Workspace, WsGuideSet> = {
  client: CLIENT_WS,
  agent: AGENT_WS,
  work: WORK_WS,
  ops: OPS_WS,
  finance: FINANCE_WS,
  marketing: MARKETING_WS,
  procurement: PROCUREMENT_WS,
  partners: PARTNERS_WS,
  exec: EXEC_WS,
  system: SYSTEM_WS,
};
export const WS_ORDER: Workspace[] = [
  "client",
  "agent",
  "work",
  "ops",
  "finance",
  "marketing",
  "procurement",
  "partners",
  "exec",
  "system",
];

type ShotMap = Record<string, Partial<Record<Locale, ShotData>>>;
const SHOTS: ShotMap = Object.assign(
  {},
  shotsJson,
  clientShots,
  agentShots,
  workShots,
  opsShots,
  financeShots,
  marketingShots,
  procurementShots,
  partnersShots,
  execShots,
  systemShots,
) as ShotMap;

/** Dashboards whose guides a person may read. */
export function guideWorkspaces(roles: Role[]): Workspace[] {
  if (roles.includes("staff:sysadmin")) return WS_ORDER;
  const mine = workspacesFor(roles);
  return WS_ORDER.filter((w) => mine.includes(w));
}

export type ResolvedStep = {
  text: string;
  caption?: string;
  marks?: string[];
  shot?: ShotData & { src: string };
};
export type ResolvedGuide = {
  slug: string;
  workspace: Workspace;
  cat: string;
  catLabel: string;
  minutes: number;
  updated: string;
  start?: boolean;
  pages: string[];
  title: string;
  summary: string;
  keywords?: string;
  facts?: WsGuide["t"]["en"]["facts"];
  sections: {
    id: string;
    title: string;
    intro?: string;
    steps?: ResolvedStep[];
    tips?: string[];
    warn?: string;
    faq?: { q: string; a: string }[];
  }[];
};

function shot(id: string | undefined, l: Locale) {
  if (!id) return undefined;
  const by = SHOTS[id];
  const at = by?.[l] ? l : by?.en ? "en" : undefined;
  return at ? { ...by![at]!, src: `/guides/shots/${at}/${id}.jpg` } : undefined;
}

/** Guides for one dashboard, in a locale, with screenshots resolved (English capture when that locale's is missing). */
export function resolveSet(
  ws: Workspace,
  l: Locale,
): {
  workspace: Workspace;
  cats: { key: string; label: string }[];
  guides: ResolvedGuide[];
} {
  const set = WS_SETS[ws];
  const cats = set.cats.map((c) => ({ key: c.key, label: c.t[l] ?? c.t.en }));
  const label = (k: string) => cats.find((c) => c.key === k)?.label ?? k;
  return {
    workspace: ws,
    cats,
    guides: set.guides.map((g) => {
      const t = g.t[l] ?? g.t.en;
      return {
        slug: g.slug,
        workspace: ws,
        cat: g.cat,
        catLabel: label(g.cat),
        minutes: g.minutes,
        updated: g.updated,
        start: g.start,
        pages: g.pages,
        title: t.title,
        summary: t.summary,
        keywords: t.keywords,
        facts: t.facts,
        sections: t.sections.map((s) => ({
          ...s,
          steps: s.steps?.map((st) => ({
            text: st.text,
            caption: st.caption,
            marks: st.marks,
            shot: shot(st.shot, l),
          })),
        })),
      };
    }),
  };
}

/** Everything a person may read, per dashboard. */
export const guidesFor = (roles: Role[], l: Locale) =>
  guideWorkspaces(roles)
    .map((w) => resolveSet(w, l))
    .filter((s) => s.guides.length);

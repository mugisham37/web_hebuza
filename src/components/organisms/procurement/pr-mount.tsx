"use client";
// Shell-level purchase request sheet (PR0, BD-3): mounted in WorkspaceShell on every staff route; opens on ?pr=new|mine|<no>.
import dynamic from "next/dynamic";
import { useCan } from "@/lib/auth/session";
import { setUrlParams, useUrlParams } from "@/lib/url-state";
import { useShortcut } from "@/lib/ops/shortcuts";

// Lazy: the sheet only loads when ?pr is set (plan §12 risk "PR sheet bloats bundles").
const Sheet = dynamic(() => import("@/components/organisms/procurement/pr-sheet").then((m) => m.PurchaseRequestSheet), { ssr: false });
const Mine = dynamic(() => import("@/components/organisms/procurement/pr-sheet").then((m) => m.MyRequestsDrawer), { ssr: false });

export function PurchaseRequestMount() {
  const allowed = useCan("sup.purchase.request");
  const pr = useUrlParams().get("pr");
  useShortcut("r p", "Request a purchase", () => allowed && setUrlParams({ pr: "new" }));
  if (!allowed || !pr) return null;
  const close = () => setUrlParams({ pr: null });
  return pr === "new" ? <Sheet onClose={close} /> : <Mine no={pr === "mine" ? null : pr} onClose={close} />;
}

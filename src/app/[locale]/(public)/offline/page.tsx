import type { Metadata } from "next";
import { OfflineView } from "@/components/organisms/site/offline-view";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

// Static, trilingual on purpose (the visitor's locale may not be resolvable offline).
export default function OfflinePage() {
  return <OfflineView />;
}

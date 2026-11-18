import { Suspense } from "react";
import { DocumentsPage } from "@/components/organisms/client/vault";

// ?tab= is read on the client, so the shell prerenders and the tab streams in.
export default function Page() {
  return <Suspense><DocumentsPage /></Suspense>;
}

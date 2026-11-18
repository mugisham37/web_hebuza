import { notFound } from "next/navigation";

// Unknown /system/* paths 404 (replaces the Stage 0 optional catch-all, which conflicted with system/page.tsx).
export default function Page() {
  notFound();
}

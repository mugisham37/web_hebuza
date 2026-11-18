import { Suspense } from "react";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { mktContent } from "@/content/pages/mkt-content";
import { ContentEditor } from "@/components/organisms/marketing/editor";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await getI18n(params);
  return { title: mktContent(locale).titles.editor, robots: { index: false } };
}

// Stage 10 lane content (plan 10 §7). URL: ?locale&panel&view&compare
// Params are request-time here (no generateStaticParams): read them inside Suspense so the shell can prerender.
export default function Page({ params }: { params: Promise<{ entryId: string }> }) {
  return <Suspense><View params={params} /></Suspense>;
}

async function View({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  return <Suspense><ContentEditor id={entryId} /></Suspense>;
}

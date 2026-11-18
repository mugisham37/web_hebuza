import { notFound } from "next/navigation";
import { locales } from "@/shared/i18n/config";

// Anything under /procurement without its own route folder is a 404 (plan 12 §6: replaces the Stage 0 optional catch-all).
export const generateStaticParams = () => locales.map((locale) => ({ locale, rest: ["unknown"] }));

export default async function Page({ params }: { params: Promise<{ rest: string[] }> }) {
  await params;
  notFound();
}

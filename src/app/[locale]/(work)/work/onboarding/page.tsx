import { redirect } from "next/navigation";

// /work/onboarding → first step (WorkGate sends uncleared workers to their first open item).
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/work/onboarding/identity`);
}

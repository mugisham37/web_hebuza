import { redirect } from "next/navigation";
import { isAuthRole } from "@/content/pages/auth-roles";

export const metadata = { robots: { index: false } };

// Legacy staff sign-in → the role-aware /login (?role= maps to ?as=, other params such as next are kept).
export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string" && k !== "role") sp.set(k, v);
  const role = (await searchParams).role;
  sp.set("as", typeof role === "string" && isAuthRole(role) ? role : "ops");
  redirect(`/${locale}/login?${sp}`);
}

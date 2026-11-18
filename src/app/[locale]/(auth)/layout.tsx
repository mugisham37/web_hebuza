import { AuthShell } from "@/components/organisms/layout/auth-shell";
import { CopyrightYear } from "@/components/organisms/site/sections";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthShell year={<CopyrightYear />}>{children}</AuthShell>;
}

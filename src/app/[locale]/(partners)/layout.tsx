import { WorkspaceShell } from "@/components/organisms/layout/workspace-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell workspace="partners">{children}</WorkspaceShell>;
}

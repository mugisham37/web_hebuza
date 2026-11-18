import { FieldShell } from "@/components/organisms/layout/field-shell";

// Stage 9 Field tab (plan §7.2): engine, SyncPill, banners and the field-agent gate wrap every field page.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FieldShell>{children}</FieldShell>;
}

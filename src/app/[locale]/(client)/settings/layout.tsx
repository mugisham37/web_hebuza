import { SettingsFrame } from "@/components/molecules/client/client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}

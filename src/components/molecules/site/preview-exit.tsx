"use client";
import { usePathname } from "next/navigation";

/** Exit Draft Mode back to the page being previewed (not the locale home). */
export function PreviewExit({ label }: { label: string }) {
  const path = usePathname();
  return (
    <form action="/preview/exit" method="post">
      <input type="hidden" name="path" value={path} />
      <button className="bg-primary px-3 py-1 font-semibold text-on-gold hover:bg-primary-hover m-press">{label}</button>
    </form>
  );
}

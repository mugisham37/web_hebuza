"use client";
import { useState } from "react";
import { PERSONAS, currentPersona, setPersona } from "@/mocks/personas";
import { useI18n, localHref } from "@/lib/i18n/provider";
import { homeFor } from "@/shared/auth/roles";

/** Dev persona switcher (mock mode only). */
export function PersonaSwitcher() {
  const { locale } = useI18n();
  const [key, setKey] = useState(() => (typeof window === "undefined" ? null : currentPersona()?.key ?? null));
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "on") return <p className="text-small text-fg-subtle">Set NEXT_PUBLIC_API_MOCKING=on to use mock personas.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {PERSONAS.map((p) => (
        <button key={p.key} type="button" aria-pressed={key === p.key}
        className={`h-9 px-3 text-small ${key === p.key ? "bg-secondary text-on-secondary" : "bg-ink-100 text-ink-700 hover:bg-navy-50"}`}
          onClick={() => { setPersona(p.key); setKey(p.key); location.href = localHref(locale, homeFor(p.roles)); }}>
          {p.name}
        </button>
      ))}
      <button type="button" className="h-9 px-3 text-small underline" onClick={() => { setPersona(null); setKey(null); location.reload(); }}>Sign out persona</button>
    </div>
  );
}

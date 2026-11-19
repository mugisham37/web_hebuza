"use client";
import { useId, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { api, unwrap } from "@/lib/api/client";
import { cx } from "@/shared/format";
import { Icon, WhatsAppGlyph } from "@/components/atoms/icon";

// URL query state without useSearchParams (no Suspense boundary needed), same approach as catalogue-browser.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener("popstate", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("popstate", fn);
  };
};
export function useUrlParams() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}
export function setUrlParams(
  patch: Record<string, string | null>,
  push = false,
) {
  const p = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const qs = p.toString();
  window.history[push ? "pushState" : "replaceState"](
    null,
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}`,
  );
  listeners.forEach((fn) => fn());
}

/** Kigali is UTC+2 all year (no DST), so local → UTC is a fixed shift. */
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) =>
  s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Client-side .ics: timed (Kigali) event or all-day (deadline). */
export function buildIcs({
  uid,
  title,
  description,
  date,
  time,
  minutes = 30,
}: {
  uid: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  minutes?: number;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HEBUZA//Site//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@hebuza.rw`,
    `DTSTAMP:${utc(new Date())}`,
  ];
  if (time) {
    const start = new Date(`${date}T${time}:00+02:00`);
    const end = new Date(start.getTime() + minutes * 60_000);
    lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`);
  } else {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(
      `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`,
    );
  }
  lines.push(`SUMMARY:${esc(title)}`);
  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function IcsButton({
  label,
  file,
  className,
  ...ev
}: Parameters<typeof buildIcs>[0] & {
  label: string;
  file: string;
  className?: string;
}) {
  const save = () => {
    const url = URL.createObjectURL(
      new Blob([buildIcs(ev)], { type: "text/calendar" }),
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${file}.ics`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={save}
      className={cx(
        "inline-flex h-10 items-center gap-2 border-[1.5px] border-secondary bg-transparent px-4 text-button text-secondary transition-colors hover:bg-navy-50 active:bg-navy-100",
        className,
      )}
    >
      <Icon name="calendar" size={16} />
      {label}
    </button>
  );
}

/** Filter chip row (radio-like toggle buttons). */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "md" | "sm";
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cx(
            "border px-4 transition-colors",
            size === "sm" ? "h-8 text-small" : "h-10 text-label",
            value === o.v
              ? "border-secondary bg-secondary text-on-secondary"
              : "border-border-strong bg-surface text-fg hover:border-navy-300 hover:bg-navy-50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ShareBar({
  title,
  copy,
}: {
  title: string;
  copy: { share: string; copy: string; copied: string };
}) {
  const [done, setDone] = useState(false);
  const url = () => window.location.href;
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={copy.share}
      role="group"
    >
      <button
        type="button"
        onClick={() =>
          window.open(
            `https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`,
            "_blank",
            "noopener",
          )
        }
        className="inline-flex h-9 items-center gap-2 bg-whatsapp px-3.5 text-small font-medium text-ink-950"
      >
        <WhatsAppGlyph size={16} />
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() =>
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url())}`,
            "_blank",
            "noopener",
          )
        }
        className="inline-flex h-9 items-center gap-2 bg-linkedin px-3.5 text-small font-medium text-white"
      >
        in LinkedIn
      </button>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setDone(true);
          } catch {
            /* clipboard blocked: leave button as is */
          }
        }}
        className="inline-flex h-9 items-center gap-2 border border-border-strong bg-surface px-3.5 text-small font-medium text-fg hover:bg-bg-subtle"
      >
        <Icon name={done ? "check" : "file"} size={14} />
        {done ? copy.copied : copy.copy}
      </button>
      <span role="status" className="sr-only">
        {done ? copy.copied : ""}
      </span>
    </div>
  );
}

export function Helpful({
  copy,
  entry,
}: {
  copy: { helpful: string; yes: string; no: string; thanks: string };
  /** F-CMS-08: the CMS entry voted on (POST /api/content/feedback). */
  entry: { type: "guide" | "regulatory_update" | "article" | "faq"; key: string; locale: "rw" | "en" | "fr" };
}) {
  const [vote, setVoteState] = useState<null | boolean>(null);
  const setVote = (helpful: boolean) => {
    setVoteState(helpful); // thanks shows at once; a failed send is not worth bothering the reader about
    void fetch("/api/content/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...entry, helpful }) }).catch(() => null);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-label text-fg">{copy.helpful}</p>
      {vote === null ? (
        <>
          <button
            type="button"
            onClick={() => setVote(true)}
            className="h-9 border border-border-strong bg-surface px-4 text-small text-fg transition-colors hover:border-navy-300 hover:bg-navy-50"
            aria-label={copy.yes}
          >
            👍 {copy.yes}
          </button>
          <button
            type="button"
            onClick={() => setVote(false)}
            className="h-9 border border-border-strong bg-surface px-4 text-small text-fg transition-colors hover:border-navy-300 hover:bg-navy-50"
            aria-label={copy.no}
          >
            👎 {copy.no}
          </button>
        </>
      ) : (
        <p role="status" className="text-small text-fg-muted">
          {copy.thanks}
        </p>
      )}
    </div>
  );
}

/** Newsletter band form with optional language select. Own ids (the footer's NewsletterForm hard-codes id="nl").
 * Posts a consented lead (POST /api/leads), which also writes the consent ledger (F-CMS-08). */
export function SubscribeForm({ label, placeholder, done, error, lang }: { label: string; placeholder: string; done: string; error: string; lang?: { label: string; value: string } }) {
  const id = useId();
  const [v, setV] = useState("");
  const [l, setL] = useState(lang?.value ?? "rw");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="theme-dark flex items-center gap-2 text-body text-success"><Icon name="check" size={18} aria-hidden />{done}</p>;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const contact = v.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && (contact.replace(/\D/g, "").length < 9 || /[^\d\s+()-]/.test(contact))) return setState("error");
    setState("busy");
    try {
      const email = contact.includes("@");
      await unwrap(api.POST("/api/leads", { body: { ...(email ? { email: contact } : { phone: contact }), language: l as "rw" | "en" | "fr", source: "landing_form", landing: window.location.pathname, consent: { [email ? "email" : "sms"]: "in" } } }));
      setState("sent");
    } catch { setState("error"); }
  };
  return (
    <form onSubmit={submit} noValidate className="theme-dark grid w-full max-w-xl gap-2">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="flex items-center gap-1.5 border border-white/20 bg-white p-1.5 pl-5">
        <input id={id} value={v} onChange={(e) => { setV(e.target.value); if (state === "error") setState("idle"); }} placeholder={placeholder}
          aria-invalid={state === "error" || undefined} aria-describedby={state === "error" ? `${id}-err` : undefined}
          className="h-10 min-w-0 flex-1 bg-transparent text-body text-ink-900 placeholder:text-ink-500 focus:outline-none" />
        {lang && (
          <select aria-label={lang.label} value={l} onChange={(e) => setL(e.target.value)} className="h-10 border border-ink-300 bg-ink-50 px-3 text-small text-ink-900">
            <option value="rw">Kinyarwanda</option><option value="en">English</option><option value="fr">Français</option>
          </select>
        )}
        <button type="submit" aria-label={label} disabled={state === "busy"} className="flex size-10 shrink-0 items-center justify-center bg-primary text-on-gold transition-[background-color,transform] hover:-rotate-45 hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:text-fg-disabled"><Icon name="arrowRight" size={18} /></button>
      </div>
      {state === "error" && <p id={`${id}-err`} role="alert" className="flex items-center gap-2 pl-5 text-small text-danger"><Icon name="x" size={14} aria-hidden />{error}</p>}
    </form>
  );
}

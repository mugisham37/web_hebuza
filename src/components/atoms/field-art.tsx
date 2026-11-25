// Empty-state line art (plan §5.5): currentColor, 2-colour, aria-hidden, tiny.
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="relative flex size-28 items-center justify-center rounded-full bg-sky-100 text-navy-700">
      <svg viewBox="0 0 96 96" className="size-20">{children}</svg>
    </span>
  );
}
/** "No field tasks today." — clipboard with check. */
export const ArtClipboard = () => (
  <Frame>
    <rect x="22" y="16" width="44" height="58" rx="6" {...S} /><path d="M36 12h16v10H36zM32 36h22M32 46h16M32 56h12" {...S} />
    <circle cx="66" cy="66" r="14" fill="var(--color-navy-700)" /><path d="m59 66 5 5 9-10" {...S} stroke="white" />
  </Frame>
);
/** Not prepared — cloud with down arrow. */
export const ArtCloudDown = () => (
  <Frame>
    <path d="M28 62a14 14 0 0 1 2-28 20 20 0 0 1 38 4 12 12 0 0 1-2 24" {...S} /><path d="M48 46v28m-9-9 9 9 9-9" {...S} />
  </Frame>
);
/** Outbox empty — tray with check. */
export const ArtTray = () => (
  <Frame>
    <path d="M16 54 26 26h44l10 28v16H16z" {...S} /><path d="M16 54h20l4 8h16l4-8h20" {...S} /><path d="m38 38 7 7 13-13" {...S} />
  </Frame>
);
/** Revoked — phone with shield. */
export const ArtShieldPhone = () => (
  <Frame>
    <rect x="28" y="12" width="36" height="66" rx="6" {...S} /><path d="M44 70h4" {...S} />
    <path d="M46 30s12 4 12 4v8c0 8-12 14-12 14s-12-6-12-14v-8z" {...S} />
  </Frame>
);
/** Field access denied — map pin with lock. */
export const ArtPinLock = () => (
  <Frame>
    <path d="M70 40c0 18-22 36-22 36S26 58 26 40a22 22 0 0 1 44 0Z" {...S} /><rect x="39" y="38" width="18" height="14" rx="2" {...S} /><path d="M42 38v-4a6 6 0 0 1 12 0v4" {...S} />
  </Frame>
);

export function FieldEmpty({ art, title, body, action }: { art: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="m-rise flex flex-col items-center gap-3 rounded-md bg-white px-6 py-12 text-center">
      {art}
      <p className="mt-2 text-h3">{title}</p>
      {body && <p className="max-w-sm text-body text-fg-muted">{body}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

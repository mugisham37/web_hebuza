// Spreads Field's render-prop ids onto a control (label/hint/error wiring).
export const ctl = (a: { id: string; describedBy?: string; invalid: boolean }) => ({ id: a.id, "aria-describedby": a.describedBy, "aria-invalid": a.invalid || undefined });

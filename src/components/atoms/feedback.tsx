"use client";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { ApiError } from "@/lib/api/client";
import { cx } from "@/shared/format";
import { Button } from "@/components/atoms/button";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block m-shimmer rounded-md", className)} />;
}

export function Spinner({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <span role="status" className={cx("inline-flex items-center gap-2 text-small text-fg-subtle", className)}>
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label ?? t("common.loading")}
    </span>
  );
}

function StateBox({ icon, title, body, action, className }: { icon: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center gap-3 rounded-xl border border-border bg-grad-sky-wash px-6 py-12 text-center", className)}>
      <span aria-hidden className="flex size-12 items-center justify-center rounded-md border border-sky-200 bg-white text-xl text-sky-600">{icon}</span>
      <p className="text-card-title text-fg-heading">{title}</p>
      {body && <p className="max-w-md text-body text-fg-muted">{body}</p>}
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title?: ReactNode; body?: ReactNode; action?: ReactNode; className?: string }) {
  const { t } = useI18n();
  return <StateBox icon="○" title={title ?? t("state.emptyTitle")} body={body ?? t("state.emptyBody")} action={action} className={className} />;
}

/** Error state that understands ApiError (403 → forbidden copy, request id shown for support). */
export function ErrorState({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  const api = error instanceof ApiError ? error : null;
  if (api?.isForbidden) return <StateBox icon="⦸" title={t("state.forbiddenTitle")} body={t("state.forbiddenBody")} className={className} />;
  return (
    <StateBox
      icon="!"
      title={t("state.errorTitle")}
      body={<>{t("state.errorBody")}{api?.requestId && <span className="mt-1 block text-small text-fg-subtle">{t("state.requestId", { id: api.requestId })}</span>}</>}
      action={onRetry && <Button variant="outline" onClick={onRetry}>{t("common.retry")}</Button>}
      className={className}
    />
  );
}

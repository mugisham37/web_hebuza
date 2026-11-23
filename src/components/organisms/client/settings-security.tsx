"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, ApiError } from "@/lib/api/client";
import { formatRelative } from "@/shared/format";
import { Button } from "@/components/atoms/button";
import { Field, ErrorSummary } from "@/components/atoms/field";
import { ErrorState } from "@/components/atoms/feedback";
import { Badge } from "@/components/atoms/tag";
import { useToast } from "@/components/atoms/toast";
import {
  PasswordInput,
  PasswordRules,
  passwordOk,
} from "@/components/atoms/inputs";
import { authCopy } from "@/content/pages/client-auth";
import {
  ListSkeleton,
  Panel,
  useC4,
} from "@/components/molecules/client/client";
import { fill } from "@/content/pages/c4";
import { TwoStepCard } from "@/components/organisms/auth/two-step";

type Session = {
  id: string;
  device: string;
  place?: string | null;
  lastActive: string;
  current: boolean;
};

/** C13 Security: change password (PATCH /api/auth/change-password) + devices/sessions list with revoke. */
export function SecuritySettings() {
  const { c, locale } = useC4();
  const s = c.settings.security;
  const a = authCopy(locale);
  const toast = useToast();
  const qc = useQueryClient();
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const sessions = useQuery({
    queryKey: ["c4", "sessions"],
    queryFn: () => unwrap<{ sessions: Session[] }>(api.GET("/api/me/sessions")),
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/me/sessions/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      toast({ title: s.signedOut, tone: "success" });
      qc.invalidateQueries({ queryKey: ["c4", "sessions"] });
    },
    onError: () => toast({ title: c.generic, tone: "danger" }),
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("currentPassword") ?? "");
    const confirmPassword = String(f.get("confirmPassword") ?? "");
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = c.required;
    if (!passwordOk(pw)) errs.newPassword = a.weakPassword;
    if (confirmPassword !== pw) errs.confirmPassword = a.mismatch;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    try {
      await unwrap(
        api.PATCH("/api/auth/change-password", {
          body: { currentPassword, newPassword: pw, confirmPassword },
        }),
      );
      toast({ title: s.changed, tone: "success" });
      form.reset();
      setPw("");
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 400 || err.status === 401 || err.status === 403)
      )
        setErrors({ currentPassword: s.wrong });
      else toast({ title: c.generic, tone: "danger" });
    } finally {
      setPending(false);
    }
  }

  const others = sessions.data?.sessions.filter((x) => !x.current) ?? [];
  const pwField = (
    name: string,
    label: string,
    extra?: React.ReactNode,
    autoComplete = "new-password",
  ) => (
    <Field id={name} label={label} error={errors[name]}>
      {({ id, describedBy, invalid }) => (
        <>
          <PasswordInput id={id}
            name={name}
            autoComplete={autoComplete}
            showLabel={a.show}
            hideLabel={a.hide}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            {...(name === "newPassword"
              ? {
                  value: pw,
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    setPw(e.target.value),
                }
              : {})}
          />
          {extra}
        </>
      )}
    </Field>
  );

  return (
    <div className="grid gap-5">
      <TwoStepCard />
      <Panel icon="lock" title={s.password} body={s.passwordLede}>
        <form noValidate onSubmit={onSubmit} className="grid max-w-md gap-5">
          <ErrorSummary
            title={c.fixErrors}
            errors={Object.entries(errors).map(([field, message]) => ({
              field,
              message,
            }))}
          />
          {pwField("currentPassword", s.current, undefined, "current-password")}
          {pwField(
            "newPassword",
            s.new,
            <PasswordRules value={pw} labels={a.rules} />,
          )}
          {pwField("confirmPassword", s.confirm)}
          <div>
            <Button type="submit" dots loading={pending}>
              {s.change}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel
        icon="laptop"
        title={s.sessions}
        body={s.sessionsLede}
        action={
          others.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              loading={revoke.isPending && revoke.variables === "others"}
              onClick={() => revoke.mutate("others")}
            >
              {s.signOutAll}
            </Button>
          )
        }
      >
        {sessions.isPending ? (
          <ListSkeleton rows={2} />
        ) : sessions.isError ? (
          <ErrorState
            error={sessions.error}
            onRetry={() => sessions.refetch()}
          />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.data.sessions.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex flex-wrap items-center gap-2 text-label">
                    {x.device}
                    {x.current && <Badge tone="success">{s.thisDevice}</Badge>}
                  </p>
                  <p className="text-small text-fg-subtle">
                    {[
                      x.place,
                      fill(s.lastActive, {
                        when: formatRelative(x.lastActive, locale),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!x.current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revoke.isPending && revoke.variables === x.id}
                    onClick={() => revoke.mutate(x.id)}
                  >
                    {s.signOut}
                  </Button>
                )}
              </li>
            ))}
            {!others.length && (
              <li className="py-3 text-small text-fg-subtle">{s.noOthers}</li>
            )}
          </ul>
        )}
      </Panel>
    </div>
  );
}

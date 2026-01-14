"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ApprovalBadge } from "@/components/rag-badge";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type TranslationKey, useLocale } from "@/providers/locale-provider";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  applyChangeRequest,
  crStorageKey,
  createDefaultChangeRequest,
  createPlaceholderChangeRequest,
  getBaseChangeRequest,
  type PrototypeChangeRequest,
  useStoredEntity,
} from "@/lib/prototype-store";

export default function ApprovalDetailPage() {
  const params = useParams<{ requestId: string }>();
  const { locale, t } = useLocale();
  const { user } = useAuth();

  const base = getBaseChangeRequest(params.requestId);
  const { value: request, update, hydrated } = useStoredEntity<PrototypeChangeRequest>(
    crStorageKey(params.requestId),
    base ? createDefaultChangeRequest(base) : createPlaceholderChangeRequest(params.requestId),
  );

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("loadingRequest")}</p>
      </div>
    );
  }

  if (!request.entityType) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("changeRequestNotFound")}</p>
        <Link href={`/${locale}/approvals`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("backToApprovals")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${request.entityType}: ${request.entityName}`}
        subtitle={`${t("requestedBy")} ${request.requestedBy} • ${
          request.createdAt ? new Date(request.createdAt).toLocaleDateString() : `${request.ageDays}${t("daysShort")}`
        }`}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
        actions={<ApprovalBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:diff" className="h-4 w-4 text-foreground" />
                {t("changeDetailsDemo")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("changeDetailsDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("summary")}</p>
              <p className="mt-1 text-foreground">
                {t("phase1ApprovalPolicyDesc")}
              </p>
            </div>
            <Separator className="bg-muted/30" />
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("before")}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-foreground">
{JSON.stringify(request.before ?? { example: "previous value" }, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("after")}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-foreground">
{JSON.stringify(request.after ?? { example: "requested value" }, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("comments")}</p>
              <div className="mt-3 space-y-3">
                <ApprovalCommentBox
                  t={t}
                  onSubmit={(message) =>
                    update({
                      ...request,
                      comments: [
                        { id: `c-${Date.now()}`, at: new Date().toISOString(), author: user?.name ?? t("user"), message },
                        ...(request.comments ?? []),
                      ],
                    })
                  }
                />
                {(request.comments ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("noCommentsYet")}</p>
                ) : (
                  (request.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{c.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.author} • {new Date(c.at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:bolt" className="h-4 w-4 text-foreground" />
              {t("actions")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">{t("approveRejectWorkflowDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground">
            <Button
              variant="secondary"
              className="w-full"
              disabled={request.status !== "PENDING"}
              onClick={() => {
                const next = { ...request, status: "APPROVED" as const };
                update(next);
                applyChangeRequest(next);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:circle-check" className="h-4 w-4" />
                {t("approveAndApply")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"
              disabled={request.status !== "PENDING"}
              onClick={() => update({ ...request, status: "REJECTED" })}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:circle-x" className="h-4 w-4" />
                {t("reject")}
              </span>
            </Button>
            <Link href={`/${locale}/approvals`} className="mt-2 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
              {t("backToApprovals")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovalCommentBox({ onSubmit, t }: { onSubmit: (message: string) => void; t: (key: TranslationKey) => string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("addCommentPlaceholder")}
        className="border-border bg-muted/20 text-foreground placeholder:text-muted-foreground"
      />
      <Button
        variant="outline"
        className="border-border bg-card/50 text-foreground hover:bg-muted/30 hover:text-foreground"
        disabled={message.trim().length === 0}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:message-plus" className="h-4 w-4" />
          {t("addComment")}
        </span>
      </Button>
    </div>
  );
}

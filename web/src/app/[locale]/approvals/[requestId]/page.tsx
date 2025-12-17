"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ApprovalBadge } from "@/components/rag-badge";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/providers/locale-provider";
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
  const { locale, tr } = useLocale();
  const { user } = useAuth();

  const base = getBaseChangeRequest(params.requestId);
  const { value: request, update, hydrated } = useStoredEntity<PrototypeChangeRequest>(
    crStorageKey(params.requestId),
    base ? createDefaultChangeRequest(base) : createPlaceholderChangeRequest(params.requestId),
  );

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading request…", "جارٍ تحميل الطلب…")}</p>
      </div>
    );
  }

  if (!request.entityType) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Change request not found.", "طلب التغيير غير موجود.")}</p>
        <Link href={`/${locale}/approvals`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to approvals", "العودة للموافقات")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${request.entityType}: ${request.entityName}`}
        subtitle={`${tr("Requested by", "مقدم الطلب")} ${request.requestedBy} • ${
          request.createdAt ? new Date(request.createdAt).toLocaleDateString() : `${request.ageDays}${tr("d", "ي")}`
        }`}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
        actions={<ApprovalBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:diff" className="h-4 w-4 text-slate-100" />
                {tr("Change details (demo)", "تفاصيل التغيير (عرض تجريبي)")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Before/after diff, approvals log, and comments.", "مقارنة قبل/بعد، وسجل الموافقات، والتعليقات.")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Summary", "ملخص")}</p>
              <p className="mt-1 text-slate-100">
                {tr(
                  "In Phase 1, changes to KPI targets/formulas and strategy items require PMO approval. This view displays the proposed payload and audit metadata.",
                  "في المرحلة الأولى، تتطلب تغييرات مستهدفات/معادلات المؤشرات وعناصر الاستراتيجية موافقة PMO. تعرض هذه الصفحة تفاصيل الطلب وبيانات التدقيق.",
                )}
              </p>
            </div>
            <Separator className="bg-white/10" />
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Before", "قبل")}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-100">
{JSON.stringify(request.before ?? { example: "previous value" }, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("After", "بعد")}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-100">
{JSON.stringify(request.after ?? { example: "requested value" }, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Comments", "التعليقات")}</p>
              <div className="mt-3 space-y-3">
                <ApprovalCommentBox
                  tr={tr}
                  onSubmit={(message) =>
                    update({
                      ...request,
                      comments: [
                        { id: `c-${Date.now()}`, at: new Date().toISOString(), author: user?.name ?? tr("User", "مستخدم"), message },
                        ...(request.comments ?? []),
                      ],
                    })
                  }
                />
                {(request.comments ?? []).length === 0 ? (
                  <p className="text-xs text-slate-300">{tr("No comments yet.", "لا توجد تعليقات بعد.")}</p>
                ) : (
                  (request.comments ?? []).map((c) => (
                    <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{c.message}</p>
                      <p className="mt-1 text-xs text-slate-200">
                        {c.author} • {new Date(c.at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="tabler:bolt" className="h-4 w-4 text-slate-100" />
              {tr("Actions", "إجراءات")}
            </CardTitle>
            <CardDescription className="text-slate-200">{tr("Approve/reject workflow (demo).", "تدفق الموافقة/الرفض (عرض تجريبي).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-100">
            <Button
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
              disabled={request.status !== "PENDING"}
              onClick={() => {
                const next = { ...request, status: "APPROVED" as const };
                update(next);
                applyChangeRequest(next);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:circle-check" className="h-4 w-4" />
                {tr("Approve & apply", "موافقة وتطبيق")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              disabled={request.status !== "PENDING"}
              onClick={() => update({ ...request, status: "REJECTED" })}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:circle-x" className="h-4 w-4" />
                {tr("Reject", "رفض")}
              </span>
            </Button>
            <Link href={`/${locale}/approvals`} className="mt-2 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
              {tr("Back to approvals", "العودة للموافقات")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApprovalCommentBox({ onSubmit, tr }: { onSubmit: (message: string) => void; tr: (en: string, ar: string) => string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={tr("Add a comment for the approval trail…", "أضف تعليقًا لسجل الموافقة…")}
        className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
      />
      <Button
        variant="outline"
        className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        disabled={message.trim().length === 0}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:message-plus" className="h-4 w-4" />
          {tr("Add comment", "إضافة تعليق")}
        </span>
      </Button>
    </div>
  );
}

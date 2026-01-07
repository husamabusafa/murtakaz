"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";
import {
  createDefaultRisk,
  getBaseRisk,
  riskStorageKey,
  useStoredEntity,
  type PrototypeRisk,
} from "@/lib/prototype-store";

export default function RiskDetailPage() {
  const params = useParams<{ riskId: string }>();
  const { locale, tr, isArabic, t } = useLocale();
  const { user } = useAuth();

  const baseRisk = getBaseRisk(params.riskId);
  const { value: risk, update, hydrated } = useStoredEntity<PrototypeRisk>(
    riskStorageKey(params.riskId),
    baseRisk ? createDefaultRisk(baseRisk) : (null as unknown as PrototypeRisk),
  );

  if (!baseRisk) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Risk not found.", "المخاطرة غير موجودة.")}</p>
        <Link href={`/${locale}/risks`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to risks", "العودة إلى المخاطر")}
        </Link>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading risk…", "جارٍ تحميل المخاطرة…")}</p>
      </div>
    );
  }

  const context =
    (isArabic ? risk.context.projectAr : risk.context.project) ??
    (isArabic ? risk.context.initiativeAr : risk.context.initiative) ??
    (isArabic ? risk.context.pillarAr : risk.context.pillar) ??
    "—";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? risk.titleAr ?? risk.title : risk.title}
        subtitle={`${risk.severity} • ${risk.owner} • ${tr("Context:", "السياق:")} ${context}`}
        icon={<Icon name="tabler:shield-exclamation" className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() =>
                update({
                  ...risk,
                  escalated: !risk.escalated,
                  notes: [
                    {
                      id: `note-${Date.now()}`,
                      at: new Date().toISOString(),
                      author: user?.name ?? tr("User", "مستخدم"),
                      message: risk.escalated
                        ? tr("Removed escalation flag.", "تمت إزالة علامة التصعيد.")
                        : tr("Escalated risk for executive visibility.", "تم تصعيد المخاطرة لعرضها على الإدارة التنفيذية."),
                    },
                    ...risk.notes,
                  ],
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                <Icon name={risk.escalated ? "tabler:flag-3-off" : "tabler:flag-3"} className="h-4 w-4" />
                {risk.escalated ? tr("De-escalate", "خفض التصعيد") : tr("Escalate", "تصعيد")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() =>
                update({
                  ...risk,
                  status: risk.status === "COMPLETED" ? "ACTIVE" : "COMPLETED",
                  notes: [
                    {
                      id: `note-${Date.now()}`,
                      at: new Date().toISOString(),
                      author: user?.name ?? tr("User", "مستخدم"),
                      message: risk.status === "COMPLETED" ? tr("Reopened risk.", "تمت إعادة فتح المخاطرة.") : tr("Closed risk.", "تم إغلاق المخاطرة."),
                    },
                    ...risk.notes,
                  ],
                })
              }
            >
              <span className="inline-flex items-center gap-2">
                <Icon name={risk.status === "COMPLETED" ? "tabler:refresh" : "tabler:circle-check"} className="h-4 w-4" />
                {risk.status === "COMPLETED" ? tr("Reopen", "إعادة فتح") : tr("Close", "إغلاق")}
              </span>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Summary", "ملخص")}
          </TabsTrigger>
          <TabsTrigger value="mitigation" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Mitigation", "التخفيف")}
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("History", "السجل")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:info-circle" className="h-4 w-4 text-slate-100" />
                {t("riskSummary")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("riskSummaryDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-100">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("status")}</p>
                  <p className="mt-1 text-white">{risk.status}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("escalation")}</p>
                  <p className="mt-1 text-white">{risk.escalated ? t("escalated") : t("notEscalated")}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("context")}</p>
                <p className="mt-1 text-white">{context}</p>
              </div>
              <Separator className="bg-white/10" />
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{t("addNote")}</p>
                <RiskNoteEditor
                  onSubmit={(message) =>
                    update({
                      ...risk,
                      notes: [
                        { id: `note-${Date.now()}`, at: new Date().toISOString(), author: user?.name ?? tr("User", "مستخدم"), message },
                        ...risk.notes,
                      ],
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-list" className="h-4 w-4 text-slate-100" />
                {tr("Quick links", "روابط سريعة")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Related dashboards and queues.", "لوحات وقوائم ذات صلة.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-100">
              <Link
                href={`/${locale}/dashboards/risk-escalation`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Icon name="tabler:shield-exclamation" className="h-4 w-4 text-slate-100" />
                  {tr("Risk dashboard", "لوحة المخاطر")}
                </p>
                <p className="mt-1 text-xs text-slate-200">{tr("Severity distribution and escalations.", "توزيع الخطورة والتصعيدات.")}</p>
              </Link>
              <Link
                href={`/${locale}/approvals`}
                className="block rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 transition hover:bg-white/5"
              >
                <p className="flex items-center gap-2 font-semibold text-white">
                  <Icon name="tabler:gavel" className="h-4 w-4 text-slate-100" />
                  {tr("Governance queue", "قائمة الحوكمة")}
                </p>
                <p className="mt-1 text-xs text-slate-200">{tr("Review change requests and approvals.", "مراجعة طلبات التغيير والموافقات.")}</p>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigation" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:clipboard-text" className="h-4 w-4 text-slate-100" />
                {tr("Mitigation plan", "خطة التخفيف")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Add steps, owners, and due dates.", "إضافة خطوات ومسؤولين وتواريخ استحقاق.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MitigationEditor
                onAdd={(step) =>
                  update({
                    ...risk,
                    mitigation: [{ id: `step-${Date.now()}`, ...step }, ...risk.mitigation],
                    notes: [
                      { id: `note-${Date.now()}`, at: new Date().toISOString(), author: user?.name ?? tr("User", "مستخدم"), message: tr("Added mitigation step.", "تمت إضافة خطوة تخفيف.") },
                      ...risk.notes,
                    ],
                  })
                }
              />

              <Separator className="bg-white/10" />

              <div className="space-y-2">
                {risk.mitigation.length === 0 ? (
                  <p className="text-sm text-slate-200">{tr("No mitigation steps yet.", "لا توجد خطوات تخفيف بعد.")}</p>
                ) : (
                  risk.mitigation.map((step) => (
                    <div key={step.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">{step.text}</p>
                          <p className="text-xs text-slate-200">
                            {step.owner ? `${tr("Owner:", "المسؤول:")} ${step.owner}` : `${tr("Owner:", "المسؤول:")} —`}
                            {step.due ? ` • ${tr("Due:", "الاستحقاق:")} ${step.due}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          className="h-9 w-9 px-0 text-slate-200 hover:bg-white/5 hover:text-white"
                          onClick={() =>
                            update({
                              ...risk,
                              mitigation: risk.mitigation.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)),
                              notes: [
                                { id: `note-${Date.now()}`, at: new Date().toISOString(), author: user?.name ?? tr("User", "مستخدم"), message: tr("Updated mitigation step status.", "تم تحديث حالة خطوة التخفيف.") },
                                ...risk.notes,
                              ],
                            })
                          }
                        >
                          <Icon name={step.done ? "tabler:circle-check" : "tabler:circle"} className={step.done ? "text-emerald-200" : ""} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:alert-triangle" className="h-4 w-4 text-amber-200" />
                {tr("Guidance", "إرشادات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Recommended governance workflow.", "توصيات لمسار الحوكمة.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-100">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Assign owners", "تعيين المسؤولين")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("Define accountability and due dates.", "تحديد المسؤوليات وتواريخ الاستحقاق.")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Escalate critical risks", "تصعيد المخاطر الحرجة")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("Flag for executive visibility when needed.", "تحديدها للعرض التنفيذي عند الحاجة.")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">{tr("Close with a note", "الإغلاق مع توثيق")}</p>
                <p className="mt-1 text-xs text-slate-200">{tr("Ensure auditability and learnings.", "ضمان التدقيق واستخلاص الدروس.")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:history" className="h-4 w-4 text-slate-100" />
                {tr("Activity log", "سجل النشاط")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Timeline of risk updates (prototype).", "سجل زمني لتحديثات المخاطرة (نموذج أولي).")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {risk.notes.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No activity recorded yet.", "لا يوجد نشاط مسجل حتى الآن.")}</p>
              ) : (
                risk.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{note.message}</p>
                    <p className="mt-1 text-xs text-slate-200">
                      {note.author} • {new Date(note.at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiskNoteEditor({ onSubmit }: { onSubmit: (message: string) => void }) {
  const { tr } = useLocale();
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-3 pt-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={tr("Add a risk note, blocker, or escalation context…", "أضف ملاحظة للمخاطرة أو عائقًا أو سياق التصعيد…")}
        className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
      />
      <Button
        className="bg-white text-slate-900 hover:bg-slate-100"
        disabled={message.trim().length === 0}
        onClick={() => {
          onSubmit(message.trim());
          setMessage("");
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="tabler:send" className="h-4 w-4" />
          {tr("Add note", "إضافة ملاحظة")}
        </span>
      </Button>
    </div>
  );
}

function MitigationEditor({
  onAdd,
}: {
  onAdd: (step: { text: string; owner?: string; due?: string; done?: boolean }) => void;
}) {
  const { tr } = useLocale();
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-2 md:col-span-3">
        <p className="text-sm font-semibold text-white">{tr("New mitigation step", "خطوة تخفيف جديدة")}</p>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr("Describe the mitigation action…", "صف إجراء التخفيف…")}
          className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">{tr("Owner", "المسؤول")}</p>
        <Input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder={tr("Team / person", "فريق / شخص")}
          className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">{tr("Due date", "تاريخ الاستحقاق")}</p>
        <Input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="border-white/10 bg-black/20 text-white" />
      </div>
      <div className="flex items-end">
        <Button
          className="w-full bg-white text-slate-900 hover:bg-slate-100"
          disabled={text.trim().length === 0}
          onClick={() => {
            onAdd({ text: text.trim(), owner: owner.trim() || undefined, due: due || undefined, done: false });
            setText("");
            setOwner("");
            setDue("");
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="tabler:plus" className="h-4 w-4" />
            {tr("Add", "إضافة")}
          </span>
        </Button>
      </div>
    </div>
  );
}

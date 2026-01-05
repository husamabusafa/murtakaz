"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getOrgAdminKpiEditData, getOrgKpiPrimaryNodeOptions, updateOrgAdminKpi } from "@/actions/kpis";

type PrimaryNodeOption = Awaited<ReturnType<typeof getOrgKpiPrimaryNodeOptions>>[number];

type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

type VariableDataType = "NUMBER" | "PERCENTAGE";

type VariableDraft = {
  id?: string;
  tempId: string;
  code: string;
  displayName: string;
  dataType: VariableDataType;
  isRequired: boolean;
  isStatic: boolean;
  staticValue: string;
};

export default function EditKpiPage() {
  const router = useRouter();
  const params = useParams<{ kpiId: string }>();
  const { locale, tr } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [primaryNodes, setPrimaryNodes] = useState<PrimaryNodeOption[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    unit: string;
    periodType: PeriodType;
    baselineValue: string;
    targetValue: string;
    formula: string;
    primaryNodeId: string;
    variables: VariableDraft[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;

    (async () => {
      try {
        const [kpi, nodes] = await Promise.all([getOrgAdminKpiEditData({ kpiId: params.kpiId }), getOrgKpiPrimaryNodeOptions()]);
        if (!mounted) return;
        setPrimaryNodes(nodes);

        if (!kpi) {
          setDraft(null);
          return;
        }

        setDraft({
          name: kpi.name,
          description: kpi.description ?? "",
          unit: kpi.unit ?? "",
          periodType: kpi.periodType as PeriodType,
          baselineValue: typeof kpi.baselineValue === "number" ? String(kpi.baselineValue) : "",
          targetValue: typeof kpi.targetValue === "number" ? String(kpi.targetValue) : "",
          formula: kpi.formula ?? "",
          primaryNodeId: kpi.primaryNodeId,
          variables: (kpi.variables ?? []).length
            ? kpi.variables.map((v) => ({
                id: v.id,
                tempId: `var-${v.id}`,
                code: v.code,
                displayName: v.displayName,
                dataType: v.dataType as VariableDataType,
                isRequired: Boolean(v.isRequired),
                isStatic: Boolean(v.isStatic),
                staticValue: typeof v.staticValue === "number" ? String(v.staticValue) : "",
              }))
            : [
                {
                  tempId: `var-${Date.now()}`,
                  code: "A",
                  displayName: tr("Input A", "مدخل A"),
                  dataType: "NUMBER",
                  isRequired: true,
                  isStatic: false,
                  staticValue: "",
                },
              ],
        });
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.kpiId, sessionLoading, tr]);

  const canSubmit = useMemo(() => {
    if (!isAdmin) return false;
    if (!draft) return false;
    if (!draft.name.trim()) return false;
    if (!draft.primaryNodeId) return false;
    if (!draft.variables.length) return false;
    return true;
  }, [draft, isAdmin]);

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setIssues(null);
    setSubmitting(true);

    try {
      const baselineParsed = draft.baselineValue.trim().length ? Number(draft.baselineValue) : undefined;
      const targetParsed = draft.targetValue.trim().length ? Number(draft.targetValue) : undefined;

      const baselineValue = typeof baselineParsed === "number" && Number.isFinite(baselineParsed) ? baselineParsed : undefined;
      const targetValue = typeof targetParsed === "number" && Number.isFinite(targetParsed) ? targetParsed : undefined;

      const result = await updateOrgAdminKpi({
        kpiId: params.kpiId,
        name: draft.name,
        description: draft.description || undefined,
        primaryNodeId: draft.primaryNodeId,
        unit: draft.unit || undefined,
        periodType: draft.periodType,
        baselineValue,
        targetValue,
        formula: draft.formula || undefined,
        variables: draft.variables.map((v) => ({
          id: v.id,
          code: v.code,
          displayName: v.displayName,
          dataType: v.dataType,
          isRequired: v.isRequired,
          isStatic: v.isStatic,
          staticValue: v.isStatic
            ? (() => {
                const parsed = v.staticValue.trim().length ? Number(v.staticValue) : undefined;
                return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
              })()
            : undefined,
        })),
      });

      if (!result.success) {
        setError(result.error);
        const formatted = Array.isArray(result.issues)
          ? result.issues
              .map((i) => {
                const path = Array.isArray(i.path) ? i.path.join(".") : "";
                return path ? `${path}: ${i.message}` : i.message;
              })
              .join("\n")
          : null;
        if (formatted) setIssues(formatted);
        return;
      }

      router.push(`/${locale}/kpis/${params.kpiId}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Unauthorized", "غير مصرح")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back", "رجوع")}
        </Link>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("KPI not found.", "المؤشر غير موجود.")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back", "رجوع")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={tr("Edit KPI", "تعديل مؤشر")} subtitle={draft.name} icon={<Icon name="tabler:edit" className="h-5 w-5" />} />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{tr("Definition", "التعريف")}</CardTitle>
          <CardDescription className="text-slate-200">{tr("Update KPI details and inputs.", "قم بتحديث بيانات المؤشر والمدخلات.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{error}</div> : null}
          {issues ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{issues}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{tr("Name", "الاسم")}</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => (p ? { ...p, name: e.target.value } : p))} className="border-white/10 bg-black/20 text-white" />
            </div>
            <div className="grid gap-2">
              <Label>{tr("Unit", "الوحدة")}</Label>
              <Input value={draft.unit} onChange={(e) => setDraft((p) => (p ? { ...p, unit: e.target.value } : p))} className="border-white/10 bg-black/20 text-white" placeholder={tr("e.g. %", "مثل %")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{tr("Description", "الوصف")}</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft((p) => (p ? { ...p, description: e.target.value } : p))} className="border-white/10 bg-black/20 text-white" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{tr("Period", "الدورية")}</Label>
              <Select value={draft.periodType} onValueChange={(v) => setDraft((p) => (p ? { ...p, periodType: v as PeriodType } : p))}>
                <SelectTrigger className="border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder={tr("Select", "اختر")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{tr("Monthly", "شهري")}</SelectItem>
                  <SelectItem value="QUARTERLY">{tr("Quarterly", "ربع سنوي")}</SelectItem>
                  <SelectItem value="YEARLY">{tr("Yearly", "سنوي")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{tr("Linked item", "العنصر المرتبط")}</Label>
              <Select value={draft.primaryNodeId} onValueChange={(v) => setDraft((p) => (p ? { ...p, primaryNodeId: v } : p))}>
                <SelectTrigger className="border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder={tr("Select", "اختر")} />
                </SelectTrigger>
                <SelectContent>
                  {primaryNodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {(n.nodeType?.displayName ?? tr("Type", "النوع"))}: {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{tr("Baseline", "الأساس")}</Label>
              <Input value={draft.baselineValue} onChange={(e) => setDraft((p) => (p ? { ...p, baselineValue: e.target.value } : p))} className="border-white/10 bg-black/20 text-white" inputMode="decimal" />
            </div>
            <div className="grid gap-2">
              <Label>{tr("Target", "المستهدف")}</Label>
              <Input value={draft.targetValue} onChange={(e) => setDraft((p) => (p ? { ...p, targetValue: e.target.value } : p))} className="border-white/10 bg-black/20 text-white" inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{tr("Formula (optional)", "المعادلة (اختياري)")}</Label>
            <Input
              value={draft.formula}
              onChange={(e) => setDraft((p) => (p ? { ...p, formula: e.target.value } : p))}
              className="border-white/10 bg-black/20 text-white"
              placeholder={tr("Example: A + B", "مثال: A + B")}
            />
            <p className="text-xs text-slate-300">{tr("If empty, the result is the sum of inputs.", "إذا كانت فارغة فالنتيجة هي مجموع المدخلات.")}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{tr("Inputs", "المدخلات")}</CardTitle>
              <CardDescription className="text-slate-200">{tr("At least one input is required.", "يجب إضافة مدخل واحد على الأقل.")}</CardDescription>
            </div>
            <Button
              type="button"
              className="bg-white/10 text-white hover:bg-white/15"
              onClick={() =>
                setDraft((p) =>
                  p
                    ? {
                        ...p,
                        variables: [
                          ...p.variables,
                          {
                            tempId: `var-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                            code: `V${p.variables.length + 1}`,
                            displayName: tr("New input", "مدخل جديد"),
                            dataType: "NUMBER",
                            isRequired: false,
                            isStatic: false,
                            staticValue: "",
                          },
                        ],
                      }
                    : p,
                )
              }
            >
              <Plus className="h-4 w-4" />
              <span className="ms-2">{tr("Add", "إضافة")}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.variables.map((v, idx) => (
            <div key={v.tempId} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {tr("Input", "مدخل")} #{idx + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={draft.variables.length <= 1}
                  onClick={() => setDraft((p) => (p ? { ...p, variables: p.variables.filter((x) => x.tempId !== v.tempId) } : p))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{tr("Code", "الرمز")}</Label>
                  <Input
                    value={v.code}
                    onChange={(e) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, code: e.target.value } : x)),
                            }
                          : p,
                      )
                    }
                    className="border-white/10 bg-black/20 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{tr("Label", "الاسم")}</Label>
                  <Input
                    value={v.displayName}
                    onChange={(e) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, displayName: e.target.value } : x)),
                            }
                          : p,
                      )
                    }
                    className="border-white/10 bg-black/20 text-white"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{tr("Type", "النوع")}</Label>
                  <Select
                    value={v.dataType}
                    onValueChange={(val) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, dataType: val as VariableDataType } : x)),
                            }
                          : p,
                      )
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-black/20 text-white">
                      <SelectValue placeholder={tr("Select", "اختر")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUMBER">{tr("Number", "رقم")}</SelectItem>
                      <SelectItem value="PERCENTAGE">{tr("Percentage", "نسبة")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{tr("Required", "مطلوب")}</Label>
                  <Select
                    value={v.isRequired ? "yes" : "no"}
                    onValueChange={(val) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, isRequired: val === "yes" } : x)),
                            }
                          : p,
                      )
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-black/20 text-white">
                      <SelectValue placeholder={tr("Select", "اختر")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{tr("Yes", "نعم")}</SelectItem>
                      <SelectItem value="no">{tr("No", "لا")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{tr("Static", "ثابت")}</Label>
                  <Select
                    value={v.isStatic ? "yes" : "no"}
                    onValueChange={(val) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, isStatic: val === "yes" } : x)),
                            }
                          : p,
                      )
                    }
                  >
                    <SelectTrigger className="border-white/10 bg-black/20 text-white">
                      <SelectValue placeholder={tr("Select", "اختر")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{tr("Yes", "نعم")}</SelectItem>
                      <SelectItem value="no">{tr("No", "لا")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {v.isStatic ? (
                <div className="mt-3 grid gap-2">
                  <Label>{tr("Static value", "القيمة الثابتة")}</Label>
                  <Input
                    value={v.staticValue}
                    onChange={(e) =>
                      setDraft((p) =>
                        p
                          ? {
                              ...p,
                              variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, staticValue: e.target.value } : x)),
                            }
                          : p,
                      )
                    }
                    inputMode="decimal"
                    className="border-white/10 bg-black/20 text-white"
                  />
                </div>
              ) : null}
            </div>
          ))}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" asChild disabled={submitting}>
              <Link href={`/${locale}/kpis/${params.kpiId}`}>{tr("Cancel", "إلغاء")}</Link>
            </Button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={handleSave} disabled={!canSubmit || submitting}>
              {tr("Save", "حفظ")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

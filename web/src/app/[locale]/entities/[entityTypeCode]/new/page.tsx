"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useTheme } from "@/providers/theme-provider";
import { createOrgEntity, getOrgEntitiesByTypeCode, getOrgOwnerOptions, testOrgEntityFormula } from "@/actions/entities";

type EntityTypeRow = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>["entityType"];

type StatusCode = "PLANNED" | "ACTIVE" | "AT_RISK" | "COMPLETED";
type DirectionCode = "INCREASE_IS_GOOD" | "DECREASE_IS_GOOD";
type PeriodTypeCode = "MONTHLY" | "QUARTERLY" | "YEARLY";

type OwnerOption = Awaited<ReturnType<typeof getOrgOwnerOptions>>[number];

type VariableDataTypeCode = "NUMBER" | "PERCENTAGE";

type VariableDraft = {
  tempId: string;
  code: string;
  displayName: string;
  nameAr: string;
  dataType: VariableDataTypeCode;
  isRequired: boolean;
  isStatic: boolean;
  staticValue: string;
  testValue: string;
};

const UNASSIGNED_OWNER_VALUE = "__unassigned__";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), { ssr: false });

function makeTempId() {
  return Math.random().toString(36).slice(2);
}

function toNumberOrZero(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}


export default function NewEntityPage() {
  const params = useParams<{ entityTypeCode: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t, tr, df, te } = useLocale();
  const { theme } = useTheme();

  const userRole =
    typeof (user as unknown as { role?: unknown })?.role === "string"
      ? String((user as unknown as { role?: unknown })?.role)
      : undefined;

  const entityTypeCode = String(params.entityTypeCode ?? "");
  const isKpiType = entityTypeCode.toLowerCase() === "kpi";

  const [entityType, setEntityType] = useState<EntityTypeRow>(null);
  const [loadingType, setLoadingType] = useState(true);

  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");

  const [status, setStatus] = useState<StatusCode>("PLANNED");
  const [ownerUserId, setOwnerUserId] = useState<string | undefined>(undefined);

  const [periodType, setPeriodType] = useState<PeriodTypeCode | "NONE">(isKpiType ? "MONTHLY" : "NONE");
  const [unit, setUnit] = useState("");
  const [unitAr, setUnitAr] = useState("");

  const [direction, setDirection] = useState<DirectionCode>("INCREASE_IS_GOOD");

  const [baselineValue, setBaselineValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [weight, setWeight] = useState("");
  const [formula, setFormula] = useState("");

  const [variables, setVariables] = useState<VariableDraft[]>([]);

  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (userRole !== "ADMIN") return;

    let mounted = true;
    setLoadingType(true);
    setLoadingOwners(true);
    void (async () => {
      try {
        const [res, ownerRows] = await Promise.all([
          getOrgEntitiesByTypeCode({ entityTypeCode, page: 1, pageSize: 1 }),
          getOrgOwnerOptions(),
        ]);
        if (!mounted) return;
        setEntityType(res.entityType);
        setOwners(ownerRows);
      } finally {
        if (mounted) {
          setLoadingType(false);
          setLoadingOwners(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [entityTypeCode, loading, user, userRole]);

  const typeLabel = useMemo(() => {
    if (!entityType) return entityTypeCode;
    return df(entityType.name, entityType.nameAr);
  }, [df, entityType, entityTypeCode]);

  async function handleTestFormula() {
    setTestOutput(null);
    setTesting(true);
    try {
      const vars: Record<string, number> = {};
      for (const v of variables) {
        const code = v.code.trim();
        if (!code) continue;
        const raw = v.isStatic ? v.staticValue : v.testValue;
        vars[code] = toNumberOrZero(raw);
      }
      const raw = formula.trim();
      if (!raw) {
        setTestOutput(tr("No code to run.", "لا يوجد كود للتشغيل."));
        return;
      }

      const res = await testOrgEntityFormula({ formula: raw, vars });
      if (!res.success) {
        setTestOutput(tr("Error", "خطأ") + ": " + String(res.error));
        return;
      }

      setTestOutput(tr("Result", "النتيجة") + ": " + String(res.value));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestOutput(tr("Error", "خطأ") + ": " + msg);
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await createOrgEntity({
        entityTypeCode,
        title,
        titleAr: titleAr.trim() ? titleAr : undefined,
        key: key.trim() ? key : undefined,
        description: description.trim() ? description : undefined,
        descriptionAr: descriptionAr.trim() ? descriptionAr : undefined,

        status,
        ownerUserId,

        periodType: periodType === "NONE" ? null : periodType,
        unit: unit.trim() ? unit : undefined,
        unitAr: unitAr.trim() ? unitAr : undefined,
        direction,
        baselineValue: baselineValue.trim() ? Number(baselineValue) : undefined,
        targetValue: targetValue.trim() ? Number(targetValue) : undefined,
        weight: weight.trim() ? Number(weight) : undefined,
        formula: formula.trim() ? formula : undefined,

        variables:
          variables.length > 0
            ? variables
                .map((v) => {
                  const code = v.code.trim();
                  if (!code) return null;
                  const displayName = v.displayName.trim() ? v.displayName.trim() : code;
                  return {
                    code,
                    displayName,
                    nameAr: v.nameAr.trim() ? v.nameAr.trim() : undefined,
                    dataType: v.dataType,
                    isRequired: v.isRequired,
                    isStatic: v.isStatic,
                    staticValue: v.isStatic && v.staticValue.trim() ? Number(v.staticValue) : undefined,
                  };
                })
                .filter((v): v is NonNullable<typeof v> => Boolean(v))
            : undefined,
      });

      if (!res.success) {
        setError(te(res.error) || res.error || t("failedToCreate"));
        return;
      }

      router.push(`/${locale}/entities/${entityTypeCode}/${res.entityId}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("failedToCreate");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("createItemTitle", { type: typeLabel })}
        subtitle={loadingType ? t("loading") : tr("Create a new item.", "إنشاء عنصر جديد.")}
        actions={
          <Button asChild variant="ghost">
            <Link href={`/${locale}/entities/${entityTypeCode}`}>{t("back")}</Link>
          </Button>
        }
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{typeLabel}</CardTitle>
          <CardDescription>{tr("Details.", "التفاصيل.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity-title">{t("name")}</Label>
                <Input id="entity-title" value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-title-ar">{t("nameAr")}</Label>
                <Input id="entity-title-ar" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="bg-card" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity-key">{t("code")}</Label>
                <Input id="entity-key" value={key} onChange={(e) => setKey(e.target.value)} className="bg-card" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusCode)}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">{t("planned")}</SelectItem>
                    <SelectItem value="ACTIVE">{t("active")}</SelectItem>
                    <SelectItem value="AT_RISK">{t("atRisk")}</SelectItem>
                    <SelectItem value="COMPLETED">{t("completed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("owner")}</Label>
                <Select
                  value={ownerUserId ?? UNASSIGNED_OWNER_VALUE}
                  onValueChange={(v) => setOwnerUserId(v === UNASSIGNED_OWNER_VALUE ? undefined : v)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={loadingOwners ? t("loading") : tr("Unassigned", "غير محدد")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_OWNER_VALUE}>{tr("Unassigned", "غير محدد")}</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name} ({String(o.role)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity-desc">{t("description")}</Label>
                <Textarea id="entity-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-desc-ar">{t("descriptionAr")}</Label>
                <Textarea id="entity-desc-ar" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="bg-card" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{tr("Measurement", "القياس")}</p>
                  <p className="text-sm text-muted-foreground">{tr("Configure how this is measured (for KPIs).", "تهيئة كيفية قياس هذا (لمؤشرات الأداء).")}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("period")}</Label>
                    <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodTypeCode | "NONE")}>
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{tr("None", "بدون")}</SelectItem>
                        <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                        <SelectItem value="QUARTERLY">{t("quarterly")}</SelectItem>
                        <SelectItem value="YEARLY">{t("yearly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("unit")}</Label>
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="bg-card" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tr("Direction", "الاتجاه")}</Label>
                    <Select value={direction} onValueChange={(v) => setDirection(v as DirectionCode)}>
                      <SelectTrigger className="bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCREASE_IS_GOOD">{tr("Increase is good", "الزيادة أفضل")}</SelectItem>
                        <SelectItem value="DECREASE_IS_GOOD">{tr("Decrease is good", "الانخفاض أفضل")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr("Weight", "الوزن")}</Label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} className="bg-card" inputMode="decimal" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("unitAr")}</Label>
                    <Input value={unitAr} onChange={(e) => setUnitAr(e.target.value)} className="bg-card" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("baseline")}</Label>
                    <Input value={baselineValue} onChange={(e) => setBaselineValue(e.target.value)} className="bg-card" inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("target")}</Label>
                    <Input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="bg-card" inputMode="decimal" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tr("Variables", "المتغيرات")}</Label>
                  <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {tr(
                        "You can reference variables in code as vars.CODE.",
                        "يمكنك استخدام المتغيرات في الكود مثل vars.CODE.",
                      )}
                    </div>

                    {variables.length ? (
                      <div className="space-y-3">
                        {variables.map((v) => (
                          <div key={v.tempId} className="grid gap-3 rounded-xl border border-border bg-card/40 p-3 md:grid-cols-6">
                            <div className="space-y-1 md:col-span-2">
                              <Label className="text-xs">{tr("Code", "الرمز")}</Label>
                              <Input
                                value={v.code}
                                onChange={(e) =>
                                  setVariables((prev) => prev.map((row) => (row.tempId === v.tempId ? { ...row, code: e.target.value } : row)))
                                }
                                className="bg-card"
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <Label className="text-xs">{tr("Name", "الاسم")}</Label>
                              <Input
                                value={v.displayName}
                                onChange={(e) =>
                                  setVariables((prev) =>
                                    prev.map((row) => (row.tempId === v.tempId ? { ...row, displayName: e.target.value } : row)),
                                  )
                                }
                                className="bg-card"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{tr("Type", "النوع")}</Label>
                              <Select
                                value={v.dataType}
                                onValueChange={(next) =>
                                  setVariables((prev) =>
                                    prev.map((row) => (row.tempId === v.tempId ? { ...row, dataType: next as VariableDataTypeCode } : row)),
                                  )
                                }
                              >
                                <SelectTrigger className="bg-card">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NUMBER">{tr("Number", "رقم")}</SelectItem>
                                  <SelectItem value="PERCENTAGE">{tr("Percentage", "نسبة")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end justify-between gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setVariables((prev) => prev.filter((row) => row.tempId !== v.tempId))}
                                aria-label={t("delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-1 md:col-span-3">
                              <Label className="text-xs">{tr("Arabic name (optional)", "الاسم بالعربية (اختياري)")}</Label>
                              <Input
                                value={v.nameAr}
                                onChange={(e) =>
                                  setVariables((prev) => prev.map((row) => (row.tempId === v.tempId ? { ...row, nameAr: e.target.value } : row)))
                                }
                                className="bg-card"
                              />
                            </div>

                            <div className="md:col-span-2 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={v.isRequired}
                                  onChange={(e) =>
                                    setVariables((prev) =>
                                      prev.map((row) => (row.tempId === v.tempId ? { ...row, isRequired: e.target.checked } : row)),
                                    )
                                  }
                                />
                                <span>{tr("Required", "مطلوب")}</span>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={v.isStatic}
                                  onChange={(e) =>
                                    setVariables((prev) =>
                                      prev.map((row) => (row.tempId === v.tempId ? { ...row, isStatic: e.target.checked } : row)),
                                    )
                                  }
                                />
                                <span>{tr("Static", "ثابت")}</span>
                              </div>
                            </div>

                            <div className="space-y-1 md:col-span-1">
                              <Label className="text-xs">{v.isStatic ? tr("Static value", "القيمة الثابتة") : tr("Test value", "قيمة للاختبار")}</Label>
                              <Input
                                value={v.isStatic ? v.staticValue : v.testValue}
                                onChange={(e) =>
                                  setVariables((prev) =>
                                    prev.map((row) =>
                                      row.tempId === v.tempId
                                        ? v.isStatic
                                          ? { ...row, staticValue: e.target.value }
                                          : { ...row, testValue: e.target.value }
                                        : row,
                                    ),
                                  )
                                }
                                className="bg-card"
                                inputMode="decimal"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">{tr("No variables yet.", "لا توجد متغيرات بعد.")}</div>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setVariables((prev) => [
                          ...prev,
                          {
                            tempId: makeTempId(),
                            code: "",
                            displayName: "",
                            nameAr: "",
                            dataType: "NUMBER",
                            isRequired: false,
                            isStatic: false,
                            staticValue: "",
                            testValue: "",
                          },
                        ])
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {tr("Add variable", "إضافة متغير")}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tr("Formula code", "كود المعادلة")}</Label>
                  <div className="rounded-xl border border-border overflow-hidden bg-card">
                    <MonacoEditor
                      height="260px"
                      defaultLanguage="javascript"
                      value={formula}
                      onChange={(v) => setFormula(v ?? "")}
                      theme={theme === "dark" ? "vs-dark" : "light"}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-line">
                    {tr(
                      "Use vars.CODE for variables and get(\"KEY\") for other items. You can write a full JS body with return, or just an expression.",
                      "استخدم vars.CODE للمتغيرات و get(\"KEY\") لعناصر أخرى. يمكنك كتابة كود كامل مع return أو كتابة تعبير فقط.",
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tr("Test", "اختبار")}</Label>
                  <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {tr(
                        "Test the formula with the current variable values.",
                        "اختبر المعادلة باستخدام قيم المتغيرات الحالية.",
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => void handleTestFormula()} disabled={testing}>
                        {testing ? t("loading") : tr("Run test", "تشغيل الاختبار")}
                      </Button>
                      {testOutput ? <div className="text-sm text-muted-foreground whitespace-pre-line">{testOutput}</div> : null}
                    </div>
                  </div>
                </div>
              </div>

            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href={`/${locale}/entities/${entityTypeCode}`}>{t("cancel")}</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("creating") : t("create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

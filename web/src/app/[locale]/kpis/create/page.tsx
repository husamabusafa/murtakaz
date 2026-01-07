"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { createOrgAdminKpi, getOrgKpiPrimaryNodeOptions } from "@/actions/kpis";
import { NodePickerDialog } from "@/components/node-picker-dialog";

type PrimaryNodeOption = Awaited<ReturnType<typeof getOrgKpiPrimaryNodeOptions>>[number];

type PeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";
type VariableDataType = "NUMBER" | "PERCENTAGE";

type VariableDraft = {
  tempId: string;
  code: string;
  displayName: string;
  nameAr: string;
  dataType: VariableDataType;
  isRequired: boolean;
  isStatic: boolean;
  staticValue: string;
};

export default function CreateKpiPage() {
  const router = useRouter();
  const { locale, t, tr, df } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [primaryNodes, setPrimaryNodes] = useState<PrimaryNodeOption[]>([]);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState(() => ({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    unit: "",
    unitAr: "",
    periodType: "MONTHLY" as PeriodType,
    baselineValue: "",
    targetValue: "",
    formula: "",
    primaryNodeId: "",
    variables: [
      {
        tempId: `var-${Date.now()}`,
        code: "A",
        displayName: t("inputA"),
        nameAr: "",
        dataType: "NUMBER" as const,
        isRequired: true,
        isStatic: false,
        staticValue: "",
      },
    ] as VariableDraft[],
  }));

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;

    (async () => {
      try {
        const nodes = await getOrgKpiPrimaryNodeOptions();
        if (!mounted) return;
        setPrimaryNodes(nodes);
        if (!draft.primaryNodeId && nodes[0]?.id) {
          setDraft((p) => ({ ...p, primaryNodeId: nodes[0].id }));
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  const canSubmit = useMemo(() => {
    if (!isAdmin) return false;
    if (!draft.name.trim()) return false;
    if (!draft.primaryNodeId) return false;
    if (!draft.variables.length) return false;
    return true;
  }, [draft.name, draft.primaryNodeId, draft.variables.length, isAdmin]);

  const selectedPrimaryNodeLabel = useMemo(() => {
    const found = primaryNodes.find((n) => n.id === draft.primaryNodeId);
    if (!found) return "";
    const typeLabel = df(found.nodeType?.displayName, (found.nodeType as any)?.nameAr) || t("type");
    return `${typeLabel}: ${df(found.name, (found as any).nameAr)}`;
  }, [df, draft.primaryNodeId, primaryNodes, t]);

  async function handleCreate() {
    setError(null);
    setIssues(null);
    setSubmitting(true);

    try {
      const baselineParsed = draft.baselineValue.trim().length ? Number(draft.baselineValue) : undefined;
      const targetParsed = draft.targetValue.trim().length ? Number(draft.targetValue) : undefined;

      const baselineValue = typeof baselineParsed === "number" && Number.isFinite(baselineParsed) ? baselineParsed : undefined;
      const targetValue = typeof targetParsed === "number" && Number.isFinite(targetParsed) ? targetParsed : undefined;

      const result = await createOrgAdminKpi({
        name: draft.name,
        nameAr: draft.nameAr || undefined,
        description: draft.description || undefined,
        descriptionAr: draft.descriptionAr || undefined,
        primaryNodeId: draft.primaryNodeId,
        unit: draft.unit || undefined,
        unitAr: draft.unitAr || undefined,
        periodType: draft.periodType,
        baselineValue,
        targetValue,
        formula: draft.formula || undefined,
        variables: draft.variables.map((v) => ({
          code: v.code,
          displayName: v.displayName,
          nameAr: v.nameAr || undefined,
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

      router.push(`/${locale}/kpis/${result.kpiId}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("createKpi")} subtitle={t("adminOnly")} icon={<Icon name="tabler:plus" className="h-5 w-5" />} />

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("definition")}</CardTitle>
          <CardDescription className="text-muted-foreground">{t("configureKpiDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{error}</div> : null}
          {issues ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 whitespace-pre-wrap">{issues}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("name")}</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="border-border bg-muted/20 text-foreground" />
            </div>
            <div className="grid gap-2">
              <Label>{t("nameAr")}</Label>
              <Input value={draft.nameAr} onChange={(e) => setDraft((p) => ({ ...p, nameAr: e.target.value }))} className="border-border bg-muted/20 text-foreground" dir="rtl" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("unit")}</Label>
              <Input
                value={draft.unit}
                onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
                className="border-border bg-muted/20 text-foreground"
                placeholder={t("formulaExample")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("unitAr")}</Label>
              <Input
                value={draft.unitAr}
                onChange={(e) => setDraft((p) => ({ ...p, unitAr: e.target.value }))}
                className="border-border bg-muted/20 text-foreground"
                placeholder={t("formulaExample")}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("description")}</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} className="border-border bg-muted/20 text-foreground" />
            </div>
            <div className="grid gap-2">
              <Label>{t("descriptionAr")}</Label>
              <Textarea value={draft.descriptionAr} onChange={(e) => setDraft((p) => ({ ...p, descriptionAr: e.target.value }))} className="border-border bg-muted/20 text-foreground" dir="rtl" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("period")}</Label>
              <Select value={draft.periodType} onValueChange={(v) => setDraft((p) => ({ ...p, periodType: v as PeriodType }))}>
                <SelectTrigger className="border-border bg-muted/20 text-foreground">
                  <SelectValue placeholder={t("select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                  <SelectItem value="QUARTERLY">{t("quarterly")}</SelectItem>
                  <SelectItem value="YEARLY">{t("yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t("linkedItem")}</Label>
              <button
                type="button"
                onClick={() => setNodePickerOpen(true)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted/20 px-3 text-left text-sm text-foreground hover:bg-card/50"
              >
                <span className={selectedPrimaryNodeLabel ? "truncate" : "text-muted-foreground"}>
                  {selectedPrimaryNodeLabel || t("selectLinkedItem")}
                </span>
                <span className="text-muted-foreground">{t("change")}</span>
              </button>
            </div>
          </div>

          <NodePickerDialog
            open={nodePickerOpen}
            onOpenChange={setNodePickerOpen}
            nodes={primaryNodes}
            selectedId={draft.primaryNodeId || null}
            onSelect={(nodeId) => setDraft((p) => ({ ...p, primaryNodeId: nodeId }))}
            title={t("selectLinkedItem")}
            description={t("pickNodeDesc")}
            searchPlaceholder={t("searchNodesPlaceholder")}
            clearLabel={t("clear")}
            typeFallbackLabel={t("type")}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("baseline")}</Label>
              <Input value={draft.baselineValue} onChange={(e) => setDraft((p) => ({ ...p, baselineValue: e.target.value }))} className="border-border bg-muted/20 text-foreground" inputMode="decimal" />
            </div>
            <div className="grid gap-2">
              <Label>{t("target")}</Label>
              <Input value={draft.targetValue} onChange={(e) => setDraft((p) => ({ ...p, targetValue: e.target.value }))} className="border-border bg-muted/20 text-foreground" inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t("formulaOptional")}</Label>
            <Input
              value={draft.formula}
              onChange={(e) => setDraft((p) => ({ ...p, formula: e.target.value }))}
              className="border-border bg-muted/20 text-foreground"
              placeholder={t("formulaExample")}
            />
            <p className="text-xs text-muted-foreground">{t("formulaHelp")}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("inputs")}</CardTitle>
              <CardDescription className="text-muted-foreground">{t("atLeastOneInputDesc")}</CardDescription>
            </div>
            <Button
              type="button"
              className="variant="secondary""
              disabled={submitting}
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  variables: [
                    ...p.variables,
                    {
                      tempId: `var-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      code: `V${p.variables.length + 1}`,
                      displayName: t("newInput"),
                      nameAr: "",
                      dataType: "NUMBER",
                      isRequired: false,
                      isStatic: false,
                      staticValue: "",
                    },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              <span className="ms-2">{t("add")}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.variables.map((v, idx) => (
            <div key={v.tempId} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {t("input")} #{idx + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={draft.variables.length <= 1}
                  onClick={() => setDraft((p) => ({ ...p, variables: p.variables.filter((x) => x.tempId !== v.tempId) }))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("code")}</Label>
                  <Input
                    value={v.code}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, code: e.target.value } : x)),
                      }))
                    }
                    className="border-border bg-muted/20 text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("label")}</Label>
                  <Input
                    value={v.displayName}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, displayName: e.target.value } : x)),
                      }))
                    }
                    className="border-border bg-muted/20 text-foreground"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Label>{t("labelAr")}</Label>
                <Input
                  value={v.nameAr}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, nameAr: e.target.value } : x)),
                    }))
                  }
                  className="border-border bg-muted/20 text-foreground"
                  dir="rtl"
                />
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{t("type")}</Label>
                  <Select
                    value={v.dataType}
                    onValueChange={(val) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, dataType: val as VariableDataType } : x)),
                      }))
                    }
                  >
                    <SelectTrigger className="border-border bg-muted/20 text-foreground">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUMBER">{t("number")}</SelectItem>
                      <SelectItem value="PERCENTAGE">{t("percentage")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t("required")}</Label>
                  <Select
                    value={v.isRequired ? "yes" : "no"}
                    onValueChange={(val) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, isRequired: val === "yes" } : x)),
                      }))
                    }
                  >
                    <SelectTrigger className="border-border bg-muted/20 text-foreground">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("yes")}</SelectItem>
                      <SelectItem value="no">{t("no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t("static")}</Label>
                  <Select
                    value={v.isStatic ? "yes" : "no"}
                    onValueChange={(val) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, isStatic: val === "yes" } : x)),
                      }))
                    }
                  >
                    <SelectTrigger className="border-border bg-muted/20 text-foreground">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t("yes")}</SelectItem>
                      <SelectItem value="no">{t("no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {v.isStatic ? (
                <div className="mt-3 grid gap-2">
                  <Label>{t("staticValue")}</Label>
                  <Input
                    value={v.staticValue}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        variables: p.variables.map((x) => (x.tempId === v.tempId ? { ...x, staticValue: e.target.value } : x)),
                      }))
                    }
                    inputMode="decimal"
                    className="border-border bg-muted/20 text-foreground"
                  />
                </div>
              ) : null}
            </div>
          ))}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" asChild disabled={submitting}>
              <Link href={`/${locale}/kpis`}>{t("cancel")}</Link>
            </Button>
            <Button className="variant="secondary"" onClick={handleCreate} disabled={!canSubmit || submitting}>
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creating")}…
                </span>
              ) : (
                t("create")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

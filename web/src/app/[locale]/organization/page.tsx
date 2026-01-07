"use client";

import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useMemo, useState } from "react";
import {
  getOrgAdminOrganizationSettings,
  updateOrgAdminEnabledNodeTypes,
  updateOrgAdminOrganizationSettings,
} from "@/actions/org-admin";
import Link from "next/link";

export default function OrganizationPage() {
  const { tr } = useLocale();
  const { locale } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;
  const isAdmin = userRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingOrg, setSubmittingOrg] = useState(false);
  const [submittingNodeTypes, setSubmittingNodeTypes] = useState(false);

  const [editingOrg, setEditingOrg] = useState(false);
  const [editingNodeTypes, setEditingNodeTypes] = useState(false);

  const [org, setOrg] = useState<Awaited<ReturnType<typeof getOrgAdminOrganizationSettings>>["org"]>(null);
  const [nodeTypeOptions, setNodeTypeOptions] = useState<
    Awaited<ReturnType<typeof getOrgAdminOrganizationSettings>>["nodeTypeOptions"]
  >([]);
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<
    Awaited<ReturnType<typeof getOrgAdminOrganizationSettings>>["enabledNodeTypes"]
  >([]);
  const [enabledNodeTypeCounts, setEnabledNodeTypeCounts] = useState<
    Awaited<ReturnType<typeof getOrgAdminOrganizationSettings>>["enabledNodeTypeCounts"]
  >([]);

  const [nameDraft, setNameDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [kpiApprovalDraft, setKpiApprovalDraft] = useState<"MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN">("MANAGER");
  const [selectedNodeTypeIds, setSelectedNodeTypeIds] = useState<string[]>([]);

  async function reload() {
    const data = await getOrgAdminOrganizationSettings();
    setOrg(data.org);
    setNodeTypeOptions(data.nodeTypeOptions);
    setEnabledNodeTypes(data.enabledNodeTypes);
    setEnabledNodeTypeCounts(data.enabledNodeTypeCounts ?? []);
    setNameDraft(data.org?.name ?? "");
    setDomainDraft(data.org?.domain ?? "");
    setKpiApprovalDraft((String(data.org?.kpiApprovalLevel ?? "MANAGER") as typeof kpiApprovalDraft) || "MANAGER");
    setSelectedNodeTypeIds(data.enabledNodeTypes.map((nt) => nt.id));
    setEditingOrg(false);
    setEditingNodeTypes(false);
  }

  useEffect(() => {
    let mounted = true;
    if (sessionLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        if (!mounted) return;
        await reload();
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : tr("Failed to load", "فشل التحميل"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, sessionLoading]);

  const enabledNodeTypeIdSet = useMemo(() => new Set(selectedNodeTypeIds), [selectedNodeTypeIds]);

  async function saveOrg() {
    setSubmittingOrg(true);
    setError(null);
    try {
      const res = await updateOrgAdminOrganizationSettings({
        name: nameDraft.trim(),
        domain: domainDraft.trim(),
        kpiApprovalLevel: kpiApprovalDraft,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to save", "فشل الحفظ"));
    } finally {
      setSubmittingOrg(false);
    }
  }

  async function saveNodeTypes() {
    if (selectedNodeTypeIds.length === 0) {
      setError(tr("Select at least one node type.", "اختر نوع عقدة واحدًا على الأقل."));
      return;
    }

    setSubmittingNodeTypes(true);
    setError(null);
    try {
      const res = await updateOrgAdminEnabledNodeTypes({ nodeTypeIds: selectedNodeTypeIds });
      if (!res.success) {
        setError(res.error);
        return;
      }
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr("Failed to save", "فشل الحفظ"));
    } finally {
      setSubmittingNodeTypes(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Organization", "الجهة")}
        subtitle={tr("Organization settings and configuration (Admin only).", "إعدادات الجهة والتهيئة (للمسؤول فقط).")}
        icon={<Icon name="tabler:building" className="h-5 w-5" />}
      />

      {sessionLoading || loading ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Loading…", "جارٍ التحميل…")}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ) : !isAdmin ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Unauthorized", "غير مصرح")}</CardTitle>
            <CardDescription>{tr("This page is available to organization admins only.", "هذه الصفحة متاحة لمسؤولي الجهة فقط.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/overview`} className="text-sm font-semibold text-primary hover:opacity-90">
              {tr("Back", "رجوع")}
            </Link>
          </CardContent>
        </Card>
      ) : !org ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Organization not found", "الجهة غير موجودة")}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{tr("Organization", "الجهة")}</CardTitle>
                {!editingOrg ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingOrg(true)}>
                    {tr("Edit", "تعديل")}
                  </Button>
                ) : null}
              </div>
              <CardDescription>
                {tr("Basic details and governance settings.", "البيانات الأساسية وإعدادات الحوكمة.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>
              ) : null}

              {!editingOrg ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Name", "الاسم")}</p>
                    <p className="mt-1 font-semibold">{org.name}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Domain", "النطاق")}</p>
                    <p className="mt-1">{org.domain || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("KPI Approval Level", "مستوى اعتماد مؤشرات الأداء الرئيسية")}</p>
                    <p className="mt-1">{String(org.kpiApprovalLevel ?? "MANAGER")}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tr("Minimum role required to approve KPI values.", "أقل مستوى دور مطلوب لاعتماد قيم مؤشرات الأداء الرئيسية.")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{tr("Name", "الاسم")}</Label>
                      <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>{tr("Domain", "النطاق")}</Label>
                      <Input value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} className="bg-card" placeholder="example.com" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{tr("KPI Approval Level", "مستوى اعتماد مؤشرات الأداء الرئيسية")}</Label>
                    <Select value={kpiApprovalDraft} onValueChange={(v) => setKpiApprovalDraft(v as typeof kpiApprovalDraft)}>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder={tr("Select", "اختر")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">{tr("Manager", "مدير")}</SelectItem>
                        <SelectItem value="PMO">{tr("PMO", "مكتب إدارة المشاريع")}</SelectItem>
                        <SelectItem value="EXECUTIVE">{tr("Executive", "تنفيذي")}</SelectItem>
                        <SelectItem value="ADMIN">{tr("Admin", "مسؤول")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNameDraft(org.name ?? "");
                        setDomainDraft(org.domain ?? "");
                        setKpiApprovalDraft((String(org.kpiApprovalLevel ?? "MANAGER") as typeof kpiApprovalDraft) || "MANAGER");
                        setError(null);
                        setEditingOrg(false);
                      }}
                      disabled={submittingOrg}
                    >
                      {tr("Cancel", "إلغاء")}
                    </Button>
                    <Button type="button" onClick={saveOrg} disabled={submittingOrg || !nameDraft.trim()}>
                      {submittingOrg ? tr("Saving…", "جارٍ الحفظ…") : tr("Save", "حفظ")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{tr("Overview", "نظرة عامة")}</CardTitle>
              <CardDescription>{tr("Tenant metrics", "مؤشرات الجهة")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Users", "المستخدمون")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.users ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Departments", "الإدارات")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.departments ?? 0}</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Items", "العناصر")}</p>
                <div className="mt-2 grid gap-2">
                  {enabledNodeTypeCounts.length ? (
                    enabledNodeTypeCounts.map((r) => (
                      <div key={r.nodeTypeId} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{r.displayName}</span>
                        <span className="text-sm font-semibold">{r.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{tr("No item types enabled.", "لا توجد أنواع عناصر مفعلة.")}</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("KPIs", "مؤشرات الأداء الرئيسية")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.kpis ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Created", "تاريخ الإنشاء")}</p>
                <p className="mt-1">{new Date(org.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{tr("Node types", "أنواع العقد")}</CardTitle>
                {!editingNodeTypes ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingNodeTypes(true)}>
                    {tr("Edit", "تعديل")}
                  </Button>
                ) : null}
              </div>
              <CardDescription>
                {tr("Enable the node types available in this organization.", "قم بتفعيل أنواع العقد المتاحة في هذه الجهة.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingNodeTypes ? (
                enabledNodeTypes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {tr("No node types enabled.", "لا توجد أنواع عقد مفعلة.")}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {enabledNodeTypes.map((nt) => (
                      <span key={nt.id} className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
                        {nt.displayName}
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {nodeTypeOptions.map((nt) => {
                      const active = enabledNodeTypeIdSet.has(nt.id);
                      return (
                        <button
                          key={nt.id}
                          type="button"
                          onClick={() =>
                            setSelectedNodeTypeIds((prev) => (prev.includes(nt.id) ? prev.filter((x) => x !== nt.id) : [...prev, nt.id]))
                          }
                          className={
                            active
                              ? "flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-left"
                              : "flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-left hover:bg-accent"
                          }
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{nt.displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {tr("Level", "المستوى")}: {nt.levelOrder} · {String(nt.code)}
                            </p>
                          </div>
                          <span className={active ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground"}>
                            {active ? tr("Enabled", "مفعل") : tr("Disabled", "غير مفعل")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedNodeTypeIds(enabledNodeTypes.map((nt) => nt.id));
                        setError(null);
                        setEditingNodeTypes(false);
                      }}
                      disabled={submittingNodeTypes}
                    >
                      {tr("Cancel", "إلغاء")}
                    </Button>
                    <Button type="button" onClick={saveNodeTypes} disabled={submittingNodeTypes || selectedNodeTypeIds.length === 0}>
                      {submittingNodeTypes ? tr("Saving…", "جارٍ الحفظ…") : tr("Save", "حفظ")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const { t, locale, formatDate } = useLocale();
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
  const [nameArDraft, setNameArDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [logoUrlDraft, setLogoUrlDraft] = useState("");
  const [missionDraft, setMissionDraft] = useState("");
  const [missionArDraft, setMissionArDraft] = useState("");
  const [visionDraft, setVisionDraft] = useState("");
  const [visionArDraft, setVisionArDraft] = useState("");
  const [aboutDraft, setAboutDraft] = useState("");
  const [aboutArDraft, setAboutArDraft] = useState("");
  const [kpiApprovalDraft, setKpiApprovalDraft] = useState<"MANAGER" | "EXECUTIVE" | "ADMIN">("MANAGER");
  const [selectedNodeTypeIds, setSelectedNodeTypeIds] = useState<string[]>([]);

  async function reload() {
    const data = await getOrgAdminOrganizationSettings();
    setOrg(data.org);
    setNodeTypeOptions(data.nodeTypeOptions);
    setEnabledNodeTypes(data.enabledNodeTypes);
    setEnabledNodeTypeCounts(data.enabledNodeTypeCounts ?? []);
    setNameDraft(data.org?.name ?? "");
    setNameArDraft(data.org?.nameAr ?? "");
    setDomainDraft(data.org?.domain ?? "");
    setLogoUrlDraft(data.org?.logoUrl ?? "");
    setMissionDraft(data.org?.mission ?? "");
    setMissionArDraft(data.org?.missionAr ?? "");
    setVisionDraft(data.org?.vision ?? "");
    setVisionArDraft(data.org?.visionAr ?? "");
    setAboutDraft(data.org?.about ?? "");
    setAboutArDraft(data.org?.aboutAr ?? "");
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
        setError(e instanceof Error ? e.message : t("failedToLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, sessionLoading, t]);

  const enabledNodeTypeIdSet = useMemo(() => new Set(selectedNodeTypeIds), [selectedNodeTypeIds]);

  async function saveOrg() {
    setSubmittingOrg(true);
    setError(null);
    try {
      const res = await updateOrgAdminOrganizationSettings({
        name: nameDraft.trim(),
        nameAr: nameArDraft.trim() || undefined,
        domain: domainDraft.trim() || undefined,
        logoUrl: logoUrlDraft.trim() || undefined,
        mission: missionDraft.trim() || undefined,
        missionAr: missionArDraft.trim() || undefined,
        vision: visionDraft.trim() || undefined,
        visionAr: visionArDraft.trim() || undefined,
        about: aboutDraft.trim() || undefined,
        aboutAr: aboutArDraft.trim() || undefined,
        kpiApprovalLevel: kpiApprovalDraft,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("failedToSave"));
    } finally {
      setSubmittingOrg(false);
    }
  }

  async function saveNodeTypes() {
    if (selectedNodeTypeIds.length === 0) {
      setError(t("selectAtLeastOneNodeType"));
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
      setError(e instanceof Error ? e.message : t("failedToSave"));
    } finally {
      setSubmittingNodeTypes(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("organization")}
        subtitle={t("organizationSubtitle")}
        icon={<Icon name="tabler:building" className="h-5 w-5" />}
      />

      {sessionLoading || loading ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("loadingEllipsis")}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ) : !isAdmin ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("unauthorized")}</CardTitle>
            <CardDescription>{t("availableToAdminsOnlyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/overview`} className="text-sm font-semibold text-primary hover:opacity-90">
              {t("back")}
            </Link>
          </CardContent>
        </Card>
      ) : !org ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("organizationNotFound")}</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{t("organization")}</CardTitle>
                {!editingOrg ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingOrg(true)}>
                    {t("edit")}
                  </Button>
                ) : null}
              </div>
              <CardDescription>
                {t("basicDetailsAndGovernanceDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-wrap">{error}</div>
              ) : null}

              {!editingOrg ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("name")}</p>
                    <p className="mt-1 font-semibold">{org.name}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("nameAr")}</p>
                    <p className="mt-1 font-semibold" dir="rtl">{org.nameAr || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("domain")}</p>
                    <p className="mt-1">{org.domain || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("logoUrl")}</p>
                    <p className="mt-1 truncate">{org.logoUrl || "—"}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("mission")}</p>
                      <p className="mt-1 whitespace-pre-wrap">{org.mission || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("missionAr")}</p>
                      <p className="mt-1 whitespace-pre-wrap" dir="rtl">{org.missionAr || "—"}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("vision")}</p>
                      <p className="mt-1 whitespace-pre-wrap">{org.vision || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("visionAr")}</p>
                      <p className="mt-1 whitespace-pre-wrap" dir="rtl">{org.visionAr || "—"}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("about")}</p>
                      <p className="mt-1 whitespace-pre-wrap">{org.about || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("aboutAr")}</p>
                      <p className="mt-1 whitespace-pre-wrap" dir="rtl">{org.aboutAr || "—"}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kpiApprovalLevel")}</p>
                    <p className="mt-1">{String(org.kpiApprovalLevel ?? "MANAGER")}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("minRoleRequiredToApproveKpiDesc")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("name")}</Label>
                      <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("nameAr")}</Label>
                      <Input value={nameArDraft} onChange={(e) => setNameArDraft(e.target.value)} className="bg-card" dir="rtl" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("domain")}</Label>
                      <Input value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} className="bg-card" placeholder="example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("logoUrl")}</Label>
                      <Input value={logoUrlDraft} onChange={(e) => setLogoUrlDraft(e.target.value)} className="bg-card" placeholder="https://..." />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("mission")}</Label>
                      <Textarea value={missionDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMissionDraft(e.target.value)} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("missionAr")}</Label>
                      <Textarea value={missionArDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMissionArDraft(e.target.value)} className="bg-card" dir="rtl" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("vision")}</Label>
                      <Textarea value={visionDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisionDraft(e.target.value)} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("visionAr")}</Label>
                      <Textarea value={visionArDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisionArDraft(e.target.value)} className="bg-card" dir="rtl" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("about")}</Label>
                      <Textarea value={aboutDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAboutDraft(e.target.value)} className="bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("aboutAr")}</Label>
                      <Textarea value={aboutArDraft} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAboutArDraft(e.target.value)} className="bg-card" dir="rtl" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("kpiApprovalLevel")}</Label>
                    <Select value={kpiApprovalDraft} onValueChange={(v) => setKpiApprovalDraft(v as typeof kpiApprovalDraft)}>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder={t("select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">{t("roleManager")}</SelectItem>
                        <SelectItem value="PMO">{t("rolePMO")}</SelectItem>
                        <SelectItem value="EXECUTIVE">{t("roleExecutive")}</SelectItem>
                        <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
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
                      {t("cancel")}
                    </Button>
                    <Button type="button" onClick={saveOrg} disabled={submittingOrg || !nameDraft.trim()}>
                      {submittingOrg ? t("saving") : t("save")}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("overview")}</CardTitle>
              <CardDescription>{t("tenantMetrics")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("users")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.users ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("departments")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.departments ?? 0}</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("items")}</p>
                <div className="mt-2 grid gap-2">
                  {enabledNodeTypeCounts.length ? (
                    enabledNodeTypeCounts.map((it) => (
                      <div key={it.nodeTypeId} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{it.displayName}</span>
                        <span className="text-sm font-semibold">{it.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noItemTypesEnabled")}</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kpis")}</p>
                <p className="mt-1 text-lg font-semibold">{org._count?.kpis ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("created")}</p>
                <p className="mt-1">{formatDate(org.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">{t("nodeTypes")}</CardTitle>
                {!editingNodeTypes ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingNodeTypes(true)}>
                    {t("edit")}
                  </Button>
                ) : null}
              </div>
              <CardDescription>
                {t("enableNodeTypesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingNodeTypes ? (
                enabledNodeTypes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/10 p-6 text-sm text-muted-foreground">
                    {t("noNodeTypesEnabled")}
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
                              {t("level")}: {nt.levelOrder} · {String(nt.code)}
                            </p>
                          </div>
                          <span className={active ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground"}>
                            {active ? t("enabled") : t("disabled")}
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
                      {t("cancel")}
                    </Button>
                    <Button type="button" onClick={saveNodeTypes} disabled={submittingNodeTypes || selectedNodeTypeIds.length === 0}>
                      {submittingNodeTypes ? t("saving") : t("save")}
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

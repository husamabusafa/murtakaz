"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { ActionValidationIssue } from "@/types/actions";
import { createOrganizationWithUsers } from "@/actions/admin";

type PendingUser = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "EXECUTIVE" | "MANAGER";
};

type PendingEntityType = {
  code: string;
  name: string;
  nameAr: string;
};

const defaultEntityTypes: PendingEntityType[] = [
  { code: "pillar", name: "Pillars", nameAr: "الركائز" },
  { code: "objective", name: "Objectives", nameAr: "الأهداف" },
  { code: "department", name: "Departments", nameAr: "الإدارات" },
  { code: "initiative", name: "Initiatives", nameAr: "المبادرات" },
  { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء" },
];

export default function CreateOrganizationPage() {
  const { t, locale, isArabic, te, tr } = useLocale();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [orgNameAr, setOrgNameAr] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mission, setMission] = useState("");
  const [missionAr, setMissionAr] = useState("");
  const [vision, setVision] = useState("");
  const [visionAr, setVisionAr] = useState("");
  const [about, setAbout] = useState("");
  const [aboutAr, setAboutAr] = useState("");
  const [kpiApprovalLevel, setKpiApprovalLevel] = useState<"MANAGER" | "EXECUTIVE" | "ADMIN">("MANAGER");
  const [entityTypes, setEntityTypes] = useState<PendingEntityType[]>(defaultEntityTypes);

  const [users, setUsers] = useState<PendingUser[]>([
    { name: "", email: "", password: "", role: "ADMIN" },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ActionValidationIssue[]>([]);

  const roleOptions = useMemo(() => [
    { value: "ADMIN" as const, label: t("roleAdmin") },
    { value: "EXECUTIVE" as const, label: t("roleExecutive") },
    { value: "MANAGER" as const, label: t("roleManager") },
  ], [t]);

  function getFieldIssues(pathPrefix: Array<string | number>) {
    return issues.filter((i) => {
      if (i.path.length < pathPrefix.length) return false;
      for (let idx = 0; idx < pathPrefix.length; idx += 1) {
        if (i.path[idx] !== pathPrefix[idx]) return false;
      }
      return true;
    });
  }

  function getFirstFieldMessage(pathPrefix: Array<string | number>) {
    const issue = getFieldIssues(pathPrefix)[0];
    if (!issue) return undefined;
    return te(issue.message, issue.params ? [issue] : undefined);
  }

  const hasAdminUser = useMemo(() => users.some((u) => u.role === "ADMIN"), [users]);

  const entityTypeCount = entityTypes.length;

  function updateEntityType(index: number, patch: Partial<PendingEntityType>) {
    setEntityTypes((prev) => prev.map((et, i) => (i === index ? { ...et, ...patch } : et)));
  }

  function addEntityType() {
    setEntityTypes((prev) => [...prev, { code: "", name: "", nameAr: "" }]);
  }

  function removeEntityType(index: number) {
    setEntityTypes((prev) => prev.filter((_, i) => i !== index));
  }

  function moveEntityType(index: number, direction: "up" | "down") {
    setEntityTypes((prev) => {
      const next = prev.slice();
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

  function updateUser(index: number, patch: Partial<PendingUser>) {
    setUsers((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function addUser() {
    setUsers((prev) => [...prev, { name: "", email: "", password: "", role: "MANAGER" }]);
  }

  function removeUser(index: number) {
    setUsers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIssues([]);

    const localIssues: ActionValidationIssue[] = [];

    if (!orgName.trim()) {
      localIssues.push({ path: ["name"], message: "organizationNameRequired" });
    }

    if (entityTypes.length === 0) {
      localIssues.push({ path: ["entityTypes"], message: "atLeastOneInputDesc" });
    } else {
      const normalizedCodes = entityTypes.map((et) => et.code.trim().toLowerCase()).filter(Boolean);
      const uniqueCodes = new Set(normalizedCodes);
      if (uniqueCodes.size !== normalizedCodes.length) {
        localIssues.push({ path: ["entityTypes"], message: "validationFailed" });
      }

      entityTypes.forEach((et, idx) => {
        if (!et.code.trim()) localIssues.push({ path: ["entityTypes", idx, "code"], message: "valueIsRequired" });
        if (!et.name.trim()) localIssues.push({ path: ["entityTypes", idx, "name"], message: "valueIsRequired" });
      });
    }

    if (!hasAdminUser) {
      localIssues.push({ path: ["users"], message: "atLeastOneAdminUserRequired" });
    }

    const normalizedUsers = users.map((u) => ({
      name: u.name.trim(),
      email: u.email.trim().toLowerCase(),
      password: u.password,
      role: u.role,
    }));

    const normalizedEntityTypes = entityTypes.map((et) => ({
      code: et.code.trim().toLowerCase(),
      name: et.name.trim(),
      nameAr: et.nameAr.trim() || undefined,
    }));

    normalizedUsers.forEach((u, idx) => {
      if (!u.name) localIssues.push({ path: ["users", idx, "name"], message: "nameIsRequired" });
      if (!u.email) localIssues.push({ path: ["users", idx, "email"], message: "emailIsRequired" });
      if (!u.password) localIssues.push({ path: ["users", idx, "password"], message: "passwordIsRequired" });
    });

    if (localIssues.length) {
      setIssues(localIssues);
      setError(t("fixHighlightedFields"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrganizationWithUsers({
        name: orgName,
        nameAr: orgNameAr || undefined,
        domain: orgDomain || undefined,
        logoUrl: logoUrl || undefined,
        mission: mission || undefined,
        missionAr: missionAr || undefined,
        vision: vision || undefined,
        visionAr: visionAr || undefined,
        about: about || undefined,
        aboutAr: aboutAr || undefined,
        kpiApprovalLevel,
        entityTypes: normalizedEntityTypes,
        users: normalizedUsers,
      });

      if (!result.success) {
        const serverIssues = (result as { issues?: ActionValidationIssue[] }).issues ?? [];
        setIssues(serverIssues);
        setError(te(result.error));
        return;
      }

      router.push(`/${locale}/super-admin/organizations/${result.orgId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(t("unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("createOrganization")}
        subtitle={t("createOrganizationSubtitle")}
        actions={
          <Button asChild variant="ghost">
            <Link href={`/${locale}/super-admin/organizations`}>{t("back")}</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("organization")}</CardTitle>
              <CardDescription>
                {t("basicDetailsTenantDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">{t("name")}</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t("acmeCorpPlaceholder")}
                    required
                    className={cn("bg-background", getFieldIssues(["name"]).length && "border-destructive focus-visible:ring-destructive")}
                  />
                  {getFirstFieldMessage(["name"]) ? (
                    <p className="text-xs text-destructive">{getFirstFieldMessage(["name"])}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-name-ar">{t("nameAr")}</Label>
                  <Input
                    id="org-name-ar"
                    value={orgNameAr}
                    onChange={(e) => setOrgNameAr(e.target.value)}
                    placeholder="شركة أكمي"
                    className="bg-background"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-domain">{t("domainOptional")}</Label>
                  <Input
                    id="org-domain"
                    value={orgDomain}
                    onChange={(e) => setOrgDomain(e.target.value)}
                    placeholder="acme.com"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-logo">{t("logoUrl")}</Label>
                  <Input
                    id="org-logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-mission">{t("mission")}</Label>
                  <Textarea
                    id="org-mission"
                    value={mission}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMission(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-mission-ar">{t("missionAr")}</Label>
                  <Textarea
                    id="org-mission-ar"
                    value={missionAr}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMissionAr(e.target.value)}
                    className="bg-background"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-vision">{t("vision")}</Label>
                  <Textarea
                    id="org-vision"
                    value={vision}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVision(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-vision-ar">{t("visionAr")}</Label>
                  <Textarea
                    id="org-vision-ar"
                    value={visionAr}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisionAr(e.target.value)}
                    className="bg-background"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-about">{t("about")}</Label>
                  <Textarea
                    id="org-about"
                    value={about}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAbout(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-about-ar">{t("aboutAr")}</Label>
                  <Textarea
                    id="org-about-ar"
                    value={aboutAr}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAboutAr(e.target.value)}
                    className="bg-background"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("kpiApprovalLevel")}</Label>
                <Select value={kpiApprovalLevel} onValueChange={(v) => setKpiApprovalLevel(v as typeof kpiApprovalLevel)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t("selectLevel")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">{t("roleManager")}</SelectItem>
                    <SelectItem value="EXECUTIVE">{t("roleExecutive")}</SelectItem>
                    <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className={cn("text-xs text-muted-foreground", isArabic && "text-right")}>
                  {t("minRoleLevelApprovalHelp")}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className={cn("flex items-start justify-between gap-4", isArabic && "flex-row-reverse")}> 
                  <div className={cn("space-y-1", isArabic && "text-right")}>
                    <p className="text-sm font-semibold">{tr("Entities", "الكيانات")}</p>
                    <p className="text-sm text-muted-foreground">
                      {tr(
                        "Define the entity types this organization can use. You can reorder them; the order will be used in the sidebar.",
                        "حدّد أنواع الكيانات المتاحة لهذه الجهة. يمكنك إعادة ترتيبها؛ وسيُستخدم الترتيب في الشريط الجانبي.",
                      )}
                    </p>
                  </div>
                  <Badge variant={entityTypeCount === 0 ? "destructive" : "secondary"}>
                    {t("selected")}: {entityTypeCount}
                  </Badge>
                </div>

                {getFirstFieldMessage(["entityTypes"]) ? (
                  <p className={cn("mt-3 text-xs text-destructive", isArabic && "text-right")}>{getFirstFieldMessage(["entityTypes"])}</p>
                ) : null}

                <div className="mt-4">
                  <div className="overflow-hidden rounded-xl border border-border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>{t("code")}</TableHead>
                          <TableHead>{t("name")}</TableHead>
                          <TableHead>{t("nameAr")}</TableHead>
                          <TableHead className="text-right">{t("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entityTypes.map((et, idx) => (
                          <TableRow key={`${et.code}-${idx}`} className="hover:bg-muted/50">
                            <TableCell className="align-top text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1">
                                <Input
                                  value={et.code}
                                  onChange={(e) => updateEntityType(idx, { code: e.target.value })}
                                  onBlur={() => updateEntityType(idx, { code: et.code.trim().toLowerCase() })}
                                  className={cn(
                                    "bg-background",
                                    getFieldIssues(["entityTypes", idx, "code"]).length && "border-destructive focus-visible:ring-destructive",
                                  )}
                                />
                                {getFirstFieldMessage(["entityTypes", idx, "code"]) ? (
                                  <p className="text-xs text-destructive">{getFirstFieldMessage(["entityTypes", idx, "code"])}</p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1">
                                <Input
                                  value={et.name}
                                  onChange={(e) => updateEntityType(idx, { name: e.target.value })}
                                  className={cn(
                                    "bg-background",
                                    getFieldIssues(["entityTypes", idx, "name"]).length && "border-destructive focus-visible:ring-destructive",
                                  )}
                                />
                                {getFirstFieldMessage(["entityTypes", idx, "name"]) ? (
                                  <p className="text-xs text-destructive">{getFirstFieldMessage(["entityTypes", idx, "name"])}</p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              <Input
                                value={et.nameAr}
                                onChange={(e) => updateEntityType(idx, { nameAr: e.target.value })}
                                className="bg-background"
                                dir="rtl"
                              />
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <div className={cn("flex justify-end gap-1", isArabic && "flex-row-reverse")}> 
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => moveEntityType(idx, "up")}
                                  disabled={idx === 0}
                                  aria-label="Move up"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => moveEntityType(idx, "down")}
                                  disabled={idx === entityTypes.length - 1}
                                  aria-label="Move down"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeEntityType(idx)}
                                  disabled={entityTypes.length <= 1}
                                  aria-label={t("remove")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className={cn("mt-3 flex items-center justify-end", isArabic && "flex-row-reverse")}>
                    <Button type="button" variant="outline" size="sm" onClick={addEntityType} className={cn(isArabic && "flex-row-reverse")}> 
                      <Plus className={cn("h-4 w-4", isArabic ? "ms-2" : "me-2")} />
                      {t("add")}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t("validation")}</CardTitle>
              <CardDescription>
                {t("rulesEnforcedDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <span className="text-muted-foreground">{t("atLeast1AdminUser")}</span>
                <Badge variant={hasAdminUser ? "secondary" : "destructive"}>{hasAdminUser ? t("ok") : t("required")}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <span className="text-muted-foreground">{tr("At least 1 entity type", "نوع كيان واحد على الأقل")}</span>
                <Badge variant={entityTypeCount > 0 ? "secondary" : "destructive"}>{entityTypeCount > 0 ? t("ok") : t("required")}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <div className={cn("flex items-start justify-between gap-4", isArabic && "flex-row-reverse")}>
              <div className={cn("space-y-1", isArabic && "text-right")}>
                <CardTitle className="text-base">{t("users")}</CardTitle>
                <CardDescription>
                  {t("createInitialUsersDesc")}
                </CardDescription>
              </div>
              <Button type="button" onClick={addUser} className={cn(isArabic && "flex-row-reverse")}> 
                <Plus className={cn("h-4 w-4", isArabic ? "ms-2" : "me-2")} />
                {t("addUser")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                    <TableHead>{t("password")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Input
                            value={u.name}
                            onChange={(e) => updateUser(idx, { name: e.target.value })}
                            placeholder={t("fullName")}
                            className={cn(
                              "bg-background",
                              getFieldIssues(["users", idx, "name"]).length && "border-destructive focus-visible:ring-destructive",
                            )}
                          />
                          {getFirstFieldMessage(["users", idx, "name"]) ? (
                            <p className="text-xs text-destructive">{getFirstFieldMessage(["users", idx, "name"])}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Input
                            value={u.email}
                            onChange={(e) => updateUser(idx, { email: e.target.value })}
                            placeholder="name@acme.com"
                            className={cn(
                              "bg-background",
                              getFieldIssues(["users", idx, "email"]).length && "border-destructive focus-visible:ring-destructive",
                            )}
                          />
                          {getFirstFieldMessage(["users", idx, "email"]) ? (
                            <p className="text-xs text-destructive">{getFirstFieldMessage(["users", idx, "email"])}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={u.role} onValueChange={(value) => updateUser(idx, { role: value as PendingUser["role"] })}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder={t("selectRole")} />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Input
                            value={u.password}
                            onChange={(e) => updateUser(idx, { password: e.target.value })}
                            placeholder={t("minimum6Characters")}
                            className={cn(
                              "bg-background",
                              getFieldIssues(["users", idx, "password"]).length && "border-destructive focus-visible:ring-destructive",
                            )}
                          />
                          {getFirstFieldMessage(["users", idx, "password"]) ? (
                            <p className="text-xs text-destructive">{getFirstFieldMessage(["users", idx, "password"])}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 w-9 px-0"
                          onClick={() => removeUser(idx)}
                          disabled={users.length <= 1}
                          aria-label={t("removeUser")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {getFirstFieldMessage(["users"]) ? (
              <div className={cn("mt-3 text-xs text-destructive", isArabic && "text-right")}>
                {getFirstFieldMessage(["users"])}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className={cn("flex items-center justify-end gap-2", isArabic && "flex-row-reverse")}> 
          <Button type="button" variant="ghost" asChild>
            <Link href={`/${locale}/super-admin/organizations`}>{t("cancel")}</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t("creating") : t("createOrganization")}
          </Button>
        </div>
      </form>
    </div>
  );
}

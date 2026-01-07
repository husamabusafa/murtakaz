"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { type ActionValidationIssue, createOrganizationWithUsers, getNodeTypes } from "@/actions/admin";

type NodeTypeRow = Awaited<ReturnType<typeof getNodeTypes>>[number];

type PendingUser = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "EXECUTIVE" | "PMO" | "MANAGER" | "EMPLOYEE";
};

export default function CreateOrganizationPage() {
  const { t, locale, isArabic } = useLocale();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [nodeTypes, setNodeTypes] = useState<NodeTypeRow[]>([]);
  const [loadingNodeTypes, setLoadingNodeTypes] = useState(true);

  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [kpiApprovalLevel, setKpiApprovalLevel] = useState<"MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN">("MANAGER");
  const [selectedNodeTypeIds, setSelectedNodeTypeIds] = useState<string[]>([]);

  const [users, setUsers] = useState<PendingUser[]>([
    { name: "", email: "", password: "", role: "ADMIN" },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ActionValidationIssue[]>([]);

  const roleOptions = useMemo(() => [
    { value: "ADMIN" as const, label: t("roleAdmin") },
    { value: "EXECUTIVE" as const, label: t("roleExecutive") },
    { value: "PMO" as const, label: t("rolePMO") },
    { value: "MANAGER" as const, label: t("roleManager") },
    { value: "EMPLOYEE" as const, label: t("roleEmployee") },
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
    return getFieldIssues(pathPrefix)[0]?.message;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingNodeTypes(true);
      try {
        const rows = await getNodeTypes();
        if (!mounted) return;
        setNodeTypes(rows);
        const defaultCodes = new Set(["STRATEGY", "INITIATIVE", "PROJECT"]);
        setSelectedNodeTypeIds(rows.filter((r) => defaultCodes.has(r.code)).map((r) => r.id));
      } catch (e) {
        console.error(e);
        if (mounted) setNodeTypes([]);
      } finally {
        if (mounted) setLoadingNodeTypes(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const hasAdminUser = useMemo(() => users.some((u) => u.role === "ADMIN"), [users]);

  const selectedNodeTypeCount = selectedNodeTypeIds.length;

  function toggleNodeType(id: string) {
    setSelectedNodeTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function updateUser(index: number, patch: Partial<PendingUser>) {
    setUsers((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function addUser() {
    setUsers((prev) => [...prev, { name: "", email: "", password: "", role: "EMPLOYEE" }]);
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
      localIssues.push({ path: ["name"], message: t("organizationNameRequired") });
    }

    if (selectedNodeTypeIds.length === 0) {
      localIssues.push({ path: ["nodeTypeIds"], message: t("selectAtLeastOneNodeType") });
    }

    if (!hasAdminUser) {
      localIssues.push({ path: ["users"], message: t("atLeastOneAdminUserRequired") });
    }

    const normalizedUsers = users.map((u) => ({
      name: u.name.trim(),
      email: u.email.trim().toLowerCase(),
      password: u.password,
      role: u.role,
    }));

    normalizedUsers.forEach((u, idx) => {
      if (!u.name) localIssues.push({ path: ["users", idx, "name"], message: t("nameIsRequired") });
      if (!u.email) localIssues.push({ path: ["users", idx, "email"], message: t("emailIsRequired") });
      if (!u.password) localIssues.push({ path: ["users", idx, "password"], message: t("passwordIsRequired") });
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
        domain: orgDomain || undefined,
        kpiApprovalLevel,
        nodeTypeIds: selectedNodeTypeIds,
        users: normalizedUsers,
      });

      if (!result.success) {
        const serverIssues = (result as { issues?: ActionValidationIssue[] }).issues ?? [];
        setIssues(serverIssues);
        setError(result.error || t("failedToCreateOrganization"));
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
                  <Label htmlFor="org-domain">{t("domainOptional")}</Label>
                  <Input
                    id="org-domain"
                    value={orgDomain}
                    onChange={(e) => setOrgDomain(e.target.value)}
                    placeholder="acme.com"
                    className="bg-background"
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
                    <SelectItem value="PMO">{t("rolePMO")}</SelectItem>
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
                    <p className="text-sm font-semibold">{t("nodeTypes")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("pickOrgNodeTypesDesc")}
                    </p>
                  </div>
                  <Badge variant={selectedNodeTypeCount === 0 ? "destructive" : "secondary"}>
                    {t("selected")}: {selectedNodeTypeCount}
                  </Badge>
                </div>

                {getFirstFieldMessage(["nodeTypeIds"]) ? (
                  <p className={cn("mt-3 text-xs text-destructive", isArabic && "text-right")}>{getFirstFieldMessage(["nodeTypeIds"])}</p>
                ) : null}

                <div className="mt-4">
                  {loadingNodeTypes ? (
                    <div className="text-sm text-muted-foreground">{t("loadingEllipsis")}</div>
                  ) : nodeTypes.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {t("noNodeTypesFoundDesc")}
                    </div>
                  ) : (
                    <div className={cn("grid gap-2 sm:grid-cols-2", isArabic && "text-right")}>
                      {nodeTypes.map((nt) => {
                        const active = selectedNodeTypeIds.includes(nt.id);
                        return (
                          <button
                            key={nt.id}
                            type="button"
                            onClick={() => toggleNodeType(nt.id)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition",
                              "border-border bg-background hover:bg-muted/50",
                              active && "border-primary/30 bg-primary/10",
                              isArabic && "text-right",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{nt.displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {t("level")}: {nt.levelOrder} · {nt.code}
                              </p>
                            </div>
                            <Badge variant={active ? "default" : "outline"}>{active ? t("enabled") : t("disabled")}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                <span className="text-muted-foreground">{t("atLeast1NodeTypeSelected")}</span>
                <Badge variant={selectedNodeTypeCount > 0 ? "secondary" : "destructive"}>{selectedNodeTypeCount > 0 ? t("ok") : t("required")}</Badge>
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

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

const roleOptions: Array<{ value: PendingUser["role"]; label: string; labelAr: string }> = [
  { value: "ADMIN", label: "Admin", labelAr: "مسؤول" },
  { value: "EXECUTIVE", label: "Executive", labelAr: "تنفيذي" },
  { value: "PMO", label: "PMO", labelAr: "مكتب إدارة المشاريع" },
  { value: "MANAGER", label: "Manager", labelAr: "مدير" },
  { value: "EMPLOYEE", label: "Employee", labelAr: "موظف" },
];

export default function CreateOrganizationPage() {
  const { tr, locale, isArabic } = useLocale();
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
      localIssues.push({ path: ["name"], message: tr("Organization name is required.", "اسم الجهة مطلوب.") });
    }

    if (selectedNodeTypeIds.length === 0) {
      localIssues.push({ path: ["nodeTypeIds"], message: tr("Select at least one node type.", "اختر نوع عقدة واحدًا على الأقل.") });
    }

    if (!hasAdminUser) {
      localIssues.push({ path: ["users"], message: tr("At least one ADMIN user is required.", "يجب إضافة مستخدم مسؤول واحد على الأقل.") });
    }

    const normalizedUsers = users.map((u) => ({
      name: u.name.trim(),
      email: u.email.trim().toLowerCase(),
      password: u.password,
      role: u.role,
    }));

    normalizedUsers.forEach((u, idx) => {
      if (!u.name) localIssues.push({ path: ["users", idx, "name"], message: tr("Name is required.", "الاسم مطلوب.") });
      if (!u.email) localIssues.push({ path: ["users", idx, "email"], message: tr("Email is required.", "البريد مطلوب.") });
      if (!u.password) localIssues.push({ path: ["users", idx, "password"], message: tr("Password is required.", "كلمة المرور مطلوبة.") });
    });

    if (localIssues.length) {
      setIssues(localIssues);
      setError(tr("Please fix the highlighted fields.", "يرجى تصحيح الحقول المظللة."));
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
        setError(result.error || tr("Failed to create organization.", "فشل إنشاء الجهة."));
        return;
      }

      router.push(`/${locale}/super-admin/organizations/${result.orgId}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(tr("An unexpected error occurred.", "حدث خطأ غير متوقع."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Create organization", "إنشاء جهة")}
        subtitle={tr(
          "Create a tenant, configure node types, and bootstrap users.",
          "أنشئ جهة، حدّد أنواع العقد، وأنشئ المستخدمين المبدئيين.",
        )}
        actions={
          <Button asChild variant="ghost">
            <Link href={`/${locale}/super-admin/organizations`}>{tr("Back", "رجوع")}</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{tr("Organization", "الجهة")}</CardTitle>
              <CardDescription>
                {tr("Basic details for the tenant.", "البيانات الأساسية للجهة.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">{tr("Name", "الاسم")}</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={tr("Acme Corp", "شركة أكمي")}
                    required
                    className={cn("bg-background", getFieldIssues(["name"]).length && "border-destructive focus-visible:ring-destructive")}
                  />
                  {getFirstFieldMessage(["name"]) ? (
                    <p className="text-xs text-destructive">{getFirstFieldMessage(["name"])}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-domain">{tr("Domain (optional)", "النطاق (اختياري)")}</Label>
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
                <Label>{tr("KPI Approval Level", "مستوى اعتماد مؤشرات الأداء الرئيسية")}</Label>
                <Select value={kpiApprovalLevel} onValueChange={(v) => setKpiApprovalLevel(v as typeof kpiApprovalLevel)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={tr("Select level", "اختر المستوى")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">{tr("Manager", "مدير")}</SelectItem>
                    <SelectItem value="PMO">{tr("PMO", "مكتب إدارة المشاريع")}</SelectItem>
                    <SelectItem value="EXECUTIVE">{tr("Executive", "تنفيذي")}</SelectItem>
                    <SelectItem value="ADMIN">{tr("Admin", "مسؤول")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className={cn("text-xs text-muted-foreground", isArabic && "text-right")}>
                  {tr(
                    "Minimum role level allowed to approve KPI values.",
                    "أقل مستوى دور مسموح له باعتماد قيم مؤشرات الأداء الرئيسية.",
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className={cn("flex items-start justify-between gap-4", isArabic && "flex-row-reverse")}> 
                  <div className={cn("space-y-1", isArabic && "text-right")}>
                    <p className="text-sm font-semibold">{tr("Node types", "أنواع العقد")}</p>
                    <p className="text-sm text-muted-foreground">
                      {tr(
                        "Pick which node types this organization can use.",
                        "حدّد أنواع العقد المتاحة لهذه الجهة.",
                      )}
                    </p>
                  </div>
                  <Badge variant={selectedNodeTypeCount === 0 ? "destructive" : "secondary"}>
                    {tr("Selected", "المحدد")}: {selectedNodeTypeCount}
                  </Badge>
                </div>

                {getFirstFieldMessage(["nodeTypeIds"]) ? (
                  <p className={cn("mt-3 text-xs text-destructive", isArabic && "text-right")}>{getFirstFieldMessage(["nodeTypeIds"])}</p>
                ) : null}

                <div className="mt-4">
                  {loadingNodeTypes ? (
                    <div className="text-sm text-muted-foreground">{tr("Loading…", "جارٍ التحميل…")}</div>
                  ) : nodeTypes.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {tr(
                        "No node types found. Make sure you seeded NodeType rows.",
                        "لا توجد أنواع عقد. تأكد من تهيئة بيانات NodeType.",
                      )}
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
                                {tr("Level", "المستوى")}: {nt.levelOrder} · {nt.code}
                              </p>
                            </div>
                            <Badge variant={active ? "default" : "outline"}>{active ? tr("Enabled", "مفعل") : tr("Disabled", "غير مفعل")}</Badge>
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
              <CardTitle className="text-base">{tr("Validation", "التحقق")}</CardTitle>
              <CardDescription>
                {tr("Rules enforced before creation.", "القواعد المطلوبة قبل الإنشاء.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <span className="text-muted-foreground">{tr("At least 1 admin user", "مستخدم مسؤول واحد على الأقل")}</span>
                <Badge variant={hasAdminUser ? "secondary" : "destructive"}>{hasAdminUser ? tr("OK", "تم") : tr("Required", "مطلوب")}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <span className="text-muted-foreground">{tr("At least 1 node type selected", "نوع عقدة واحد على الأقل")}</span>
                <Badge variant={selectedNodeTypeCount > 0 ? "secondary" : "destructive"}>{selectedNodeTypeCount > 0 ? tr("OK", "تم") : tr("Required", "مطلوب")}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <div className={cn("flex items-start justify-between gap-4", isArabic && "flex-row-reverse")}>
              <div className={cn("space-y-1", isArabic && "text-right")}>
                <CardTitle className="text-base">{tr("Users", "المستخدمون")}</CardTitle>
                <CardDescription>
                  {tr("Create initial users for this organization.", "أنشئ المستخدمين المبدئيين لهذه الجهة.")}
                </CardDescription>
              </div>
              <Button type="button" onClick={addUser} className={cn(isArabic && "flex-row-reverse")}> 
                <Plus className={cn("h-4 w-4", isArabic ? "ms-2" : "me-2")} />
                {tr("Add user", "إضافة مستخدم")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("Name", "الاسم")}</TableHead>
                    <TableHead>{tr("Email", "البريد")}</TableHead>
                    <TableHead>{tr("Role", "الدور")}</TableHead>
                    <TableHead>{tr("Password", "كلمة المرور")}</TableHead>
                    <TableHead className="text-right">{tr("Actions", "إجراءات")}</TableHead>
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
                            placeholder={tr("Full name", "الاسم الكامل")}
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
                            <SelectValue placeholder={tr("Select role", "اختر الدور")} />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {tr(opt.label, opt.labelAr)}
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
                            placeholder={tr("Minimum 6 characters", "6 أحرف على الأقل")}
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
                          aria-label={tr("Remove user", "حذف المستخدم")}
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
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className={cn("flex items-center justify-end gap-2", isArabic && "flex-row-reverse")}> 
          <Button type="button" variant="ghost" asChild>
            <Link href={`/${locale}/super-admin/organizations`}>{tr("Cancel", "إلغاء")}</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? tr("Creating…", "جارٍ الإنشاء…") : tr("Create organization", "إنشاء الجهة")}
          </Button>
        </div>
      </form>
    </div>
  );
}

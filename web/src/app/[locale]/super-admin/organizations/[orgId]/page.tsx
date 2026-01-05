"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { createUser, deleteOrganization, getNodeTypes, getOrganizationDetails, updateOrganization, updateOrganizationNodeTypes } from "@/actions/admin";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Role } from "@prisma/client";

type OrgDetails = Awaited<ReturnType<typeof getOrganizationDetails>>;

type OrgUserRow = NonNullable<OrgDetails> extends { users: Array<infer U> } ? U : never;
type OrgNodeTypeRow = NonNullable<OrgDetails> extends { nodeTypes: Array<infer N> } ? N : never;
type NodeTypeOption = Awaited<ReturnType<typeof getNodeTypes>>[number];

export default function OrganizationDetailsPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const { locale, tr } = useLocale();

  const [org, setOrg] = useState<OrgDetails>(null);
  const [loading, setLoading] = useState(true);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDomainOpen, setEditDomainOpen] = useState(false);
  const [editKpiApprovalOpen, setEditKpiApprovalOpen] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [kpiApprovalDraft, setKpiApprovalDraft] = useState<"MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN">("MANAGER");

  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  const [nodeTypesOpen, setNodeTypesOpen] = useState(false);
  const [savingNodeTypes, setSavingNodeTypes] = useState(false);
  const [availableNodeTypes, setAvailableNodeTypes] = useState<NodeTypeOption[]>([]);
  const [selectedNodeTypeIds, setSelectedNodeTypeIds] = useState<string[]>([]);

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as Role,
  });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getOrganizationDetails(params.orgId);
        if (isMounted) {
          setOrg(data);
          setNameDraft(data?.name ?? "");
          setDomainDraft(data?.domain ?? "");
          setKpiApprovalDraft((data?.kpiApprovalLevel as typeof kpiApprovalDraft) ?? "MANAGER");
          setSelectedNodeTypeIds(
            (data?.nodeTypes ?? [])
              .map((nt) => (nt as OrgNodeTypeRow).nodeTypeId)
              .filter((id): id is string => typeof id === "string"),
          );
        }
      } catch (error) {
        console.error("Failed to load organization", error);
        if (isMounted) setOrg(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [params.orgId]);

  useEffect(() => {
    let isMounted = true;
    async function loadNodeTypes() {
      try {
        const data = await getNodeTypes();
        if (isMounted) setAvailableNodeTypes(data);
      } catch (error) {
        console.error("Failed to load node types", error);
      }
    }

    void loadNodeTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  const users = useMemo(() => (org ? (org.users as OrgUserRow[]) : []), [org]);
  const enabledNodeTypes = useMemo(() => {
    if (!org) return [] as Array<{ id: string; displayName: string; code: string }>;
    return ((org.nodeTypes as OrgNodeTypeRow[]) ?? [])
      .map((nt) => nt.nodeType)
      .filter(Boolean)
      .map((nt) => ({ id: nt.id, displayName: nt.displayName, code: String(nt.code) }));
  }, [org]);

  async function handleDeleteOrg() {
    if (!org) return;
    setDeletingOrg(true);
    try {
      const result = await deleteOrganization({ orgId: org.id });
      if (result.success) {
        setDeleteOrgOpen(false);
        router.push(`/${locale}/super-admin/organizations`);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to delete organization", "فشل حذف المؤسسة"));
      }
    } finally {
      setDeletingOrg(false);
    }
  }

  async function handleSaveNodeTypes() {
    if (!org) return;
    setSavingNodeTypes(true);
    try {
      const result = await updateOrganizationNodeTypes({ orgId: org.id, nodeTypeIds: selectedNodeTypeIds });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data);
        setNodeTypesOpen(false);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to update node types", "فشل تحديث أنواع العقد"));
      }
    } finally {
      setSavingNodeTypes(false);
    }
  }

  async function handleSaveName() {
    if (!org) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization({ orgId: org.id, name: nameDraft.trim() });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data);
        setEditNameOpen(false);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to update organization", "فشل تحديث المؤسسة"));
      }
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleSaveKpiApprovalLevel() {
    if (!org) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization({ orgId: org.id, kpiApprovalLevel: kpiApprovalDraft });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data);
        setEditKpiApprovalOpen(false);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to update organization", "فشل تحديث المؤسسة"));
      }
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleSaveDomain() {
    if (!org) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization({ orgId: org.id, domain: domainDraft.trim() });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data);
        setEditDomainOpen(false);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to update organization", "فشل تحديث المؤسسة"));
      }
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;

    setCreatingUser(true);
    try {
      const result = await createUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        orgId: org.id,
      });

      if (result.success) {
        setCreateUserOpen(false);
        setNewUser({ name: "", email: "", password: "", role: "EMPLOYEE" as Role });
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to create user", "فشل إنشاء المستخدم"));
      }
    } finally {
      setCreatingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Organization not found.", "المؤسسة غير موجودة.")}</p>
        <Link
          href={`/${locale}/super-admin/organizations`}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90"
        >
          {tr("Back to organizations", "العودة للمؤسسات")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span>{org.name}</span>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
              onClick={() => {
                setNameDraft(org.name ?? "");
                setEditNameOpen(true);
              }}
              aria-label={tr("Edit organization name", "تعديل اسم المؤسسة")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </span>
        }
        subtitle={tr(
          "Organization details and user directory.",
          "تفاصيل المؤسسة ودليل المستخدمين.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={() => setDeleteOrgOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {tr("Delete", "حذف")}
            </Button>
            <Link
              href={`/${locale}/super-admin/organizations`}
              className="inline-flex text-sm font-semibold text-primary hover:opacity-90"
            >
              {tr("Back", "رجوع")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Overview", "نظرة عامة")}</CardTitle>
            <CardDescription>{tr("Tenant metadata", "بيانات المؤسسة")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Domain", "النطاق")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDomainDraft(org.domain ?? "");
                    setEditDomainOpen(true);
                  }}
                  aria-label={tr("Edit organization domain", "تعديل نطاق المؤسسة")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">{org.domain || "—"}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("KPI Approval Level", "مستوى اعتماد المؤشرات")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setKpiApprovalDraft((org.kpiApprovalLevel as typeof kpiApprovalDraft) ?? "MANAGER");
                    setEditKpiApprovalOpen(true);
                  }}
                  aria-label={tr("Edit KPI approval level", "تعديل مستوى اعتماد المؤشرات")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">{String(org.kpiApprovalLevel ?? "MANAGER")}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Users", "المستخدمون")}</p>
              <p className="mt-1">{org._count?.users ?? users.length}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Node Types", "أنواع العقد")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => setNodeTypesOpen(true)}
                  aria-label={tr("Edit node types", "تعديل أنواع العقد")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {enabledNodeTypes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{tr("No node types selected.", "لم يتم اختيار أنواع عقد.")}</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {enabledNodeTypes.map((nt) => (
                    <span key={nt.id} className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
                      {nt.displayName}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Created", "تاريخ الإنشاء")}</p>
              <p className="mt-1">{new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{tr("Users", "المستخدمون")}</CardTitle>
              <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {tr("Create", "إنشاء")}
              </Button>
            </div>
            <CardDescription>
              {tr("All users assigned to this organization.", "جميع المستخدمين في هذه المؤسسة.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("Name", "الاسم")}</TableHead>
                    <TableHead>{tr("Email", "البريد")}</TableHead>
                    <TableHead>{tr("Role", "الدور")}</TableHead>
                    <TableHead className="text-right">{tr("Joined", "تاريخ الانضمام")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {tr("No users found.", "لا يوجد مستخدمين.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/${locale}/super-admin/users/${user.id}`)}
                      >
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">{user.role}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Edit organization name", "تعديل اسم المؤسسة")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Update the organization name.", "قم بتحديث اسم المؤسسة.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="org-name">{tr("Name", "الاسم")}</Label>
            <Input
              id="org-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="bg-card"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setNameDraft(org?.name ?? "");
                setEditNameOpen(false);
              }}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" onClick={handleSaveName} disabled={savingOrg}>
              {savingOrg ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editKpiApprovalOpen} onOpenChange={setEditKpiApprovalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Edit KPI Approval Level", "تعديل مستوى اعتماد المؤشرات")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Choose the minimum role level allowed to approve KPI values.", "اختر أقل مستوى دور يمكنه اعتماد قيم المؤشرات.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{tr("KPI Approval Level", "مستوى اعتماد المؤشرات")}</Label>
            <Select value={kpiApprovalDraft} onValueChange={(v) => setKpiApprovalDraft(v as typeof kpiApprovalDraft)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">{tr("Manager", "مدير")}</SelectItem>
                <SelectItem value="PMO">{tr("PMO", "مكتب إدارة المشاريع")}</SelectItem>
                <SelectItem value="EXECUTIVE">{tr("Executive", "تنفيذي")}</SelectItem>
                <SelectItem value="ADMIN">{tr("Admin", "مسؤول")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setKpiApprovalDraft((org?.kpiApprovalLevel as typeof kpiApprovalDraft) ?? "MANAGER");
                setEditKpiApprovalOpen(false);
              }}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" onClick={handleSaveKpiApprovalLevel} disabled={savingOrg}>
              {savingOrg ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nodeTypesOpen} onOpenChange={setNodeTypesOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr("Edit Node Types", "تعديل أنواع العقد")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Choose which node types are enabled for this organization.", "اختر أنواع العقد المفعلة لهذه المؤسسة.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {availableNodeTypes.map((nt) => {
              const selected = selectedNodeTypeIds.includes(nt.id);
              return (
                <button
                  key={nt.id}
                  type="button"
                  onClick={() => {
                    setSelectedNodeTypeIds((prev) => (selected ? prev.filter((x) => x !== nt.id) : [...prev, nt.id]));
                  }}
                  className={
                    selected
                      ? "inline-flex items-center rounded-md border border-border bg-primary px-2 py-1 text-xs text-primary-foreground"
                      : "inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
                  }
                >
                  {nt.displayName}
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedNodeTypeIds(
                  (org?.nodeTypes ?? [])
                    .map((nt) => (nt as OrgNodeTypeRow).nodeTypeId)
                    .filter((id): id is string => typeof id === "string"),
                );
                setNodeTypesOpen(false);
              }}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" onClick={handleSaveNodeTypes} disabled={savingNodeTypes || selectedNodeTypeIds.length === 0}>
              {savingNodeTypes ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDomainOpen} onOpenChange={setEditDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Edit organization domain", "تعديل نطاق المؤسسة")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Set the domain (optional).", "قم بتحديد النطاق (اختياري).")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="org-domain">{tr("Domain", "النطاق")}</Label>
            <Input
              id="org-domain"
              value={domainDraft}
              onChange={(e) => setDomainDraft(e.target.value)}
              placeholder={tr("example.com", "example.com")}
              className="bg-card"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDomainDraft(org?.domain ?? "");
                setEditDomainOpen(false);
              }}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" onClick={handleSaveDomain} disabled={savingOrg}>
              {savingOrg ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr("Create User", "إنشاء مستخدم")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Add a new user to this organization.", "إضافة مستخدم جديد إلى هذه المؤسسة.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">{tr("Full Name", "الاسم الكامل")}</Label>
              <Input
                id="user-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">{tr("Email", "البريد الإلكتروني")}</Label>
              <Input
                id="user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">{tr("Password", "كلمة المرور")}</Label>
              <Input
                id="user-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
                minLength={6}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>{tr("Role", "الدور")}</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val as Role })}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select Role", "اختر الدور")} />
                </SelectTrigger>
                <SelectContent>
                  {(["ADMIN", "EXECUTIVE", "PMO", "MANAGER", "EMPLOYEE"] as Role[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateUserOpen(false)}>
                {tr("Cancel", "إلغاء")}
              </Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? tr("Creating...", "جارٍ الإنشاء...") : tr("Create", "إنشاء")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Delete Organization", "حذف المؤسسة")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr(
                "This will soft-delete the organization and its users.",
                "سيتم حذف المؤسسة ومستخدميها (حذف منطقي).",
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOrgOpen(false)}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteOrg} disabled={deletingOrg}>
              {deletingOrg ? tr("Deleting...", "جارٍ الحذف...") : tr("Delete", "حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { createUser, deleteOrganization, getOrganizationDetails, updateOrganization, updateOrganizationEntityTypes } from "@/actions/admin";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { Role } from "@/generated/prisma-client";

type OrgDetails = {
  id: string;
  name: string;
  nameAr: string | null;
  domain: string | null;
  logoUrl: string | null;
  mission: string | null;
  missionAr: string | null;
  vision: string | null;
  visionAr: string | null;
  about: string | null;
  aboutAr: string | null;
  contacts: unknown;
  kpiApprovalLevel: "MANAGER" | "EXECUTIVE" | "ADMIN";
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  _count?: {
    users?: number;
  };
  entityTypes: Array<{
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
    sortOrder: number;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string | Date;
  }>;
};

type OrgUserRow = OrgDetails["users"][number];

type PendingEntityType = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
};

export default function OrganizationDetailsPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const { t, locale, formatDate, te } = useLocale();

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editDomainOpen, setEditDomainOpen] = useState(false);
  const [editKpiApprovalOpen, setEditKpiApprovalOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

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

  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);

  const [entityTypesOpen, setEntityTypesOpen] = useState(false);
  const [savingEntityTypes, setSavingEntityTypes] = useState(false);
  const [entityTypesDraft, setEntityTypesDraft] = useState<PendingEntityType[]>([]);

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "MANAGER" as Role,
  });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = (await getOrganizationDetails(params.orgId)) as OrgDetails | null;
        if (isMounted) {
          setOrg(data);
          setNameDraft(data?.name ?? "");
          setNameArDraft(data?.nameAr ?? "");
          setDomainDraft(data?.domain ?? "");
          setLogoUrlDraft(data?.logoUrl ?? "");
          setMissionDraft(data?.mission ?? "");
          setMissionArDraft(data?.missionAr ?? "");
          setVisionDraft(data?.vision ?? "");
          setVisionArDraft(data?.visionAr ?? "");
          setAboutDraft(data?.about ?? "");
          setAboutArDraft(data?.aboutAr ?? "");
          setKpiApprovalDraft((data?.kpiApprovalLevel as typeof kpiApprovalDraft) ?? "MANAGER");
          const types = (data?.entityTypes ?? []) as OrgDetails["entityTypes"];
          setEntityTypesDraft(
            types
              .slice()
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((et) => ({
                id: et.id,
                code: String(et.code ?? ""),
                name: String(et.name ?? ""),
                nameAr: et.nameAr ? String(et.nameAr) : "",
              })),
          );
        }
      } catch (error) {
        console.error("Failed to load organization", error);
        if (isMounted) {
          setOrg(null);
          setLoadError(error instanceof Error ? error.message : "Failed to load organization");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [params.orgId]);

  const users = useMemo<OrgUserRow[]>(() => (org ? org.users : []), [org]);
  const enabledEntityTypes = useMemo(() => {
    if (!org) return [] as Array<{ id: string; code: string; name: string; nameAr: string | null; sortOrder: number }>;
    const rows = (org.entityTypes ?? []) as OrgDetails["entityTypes"];
    return rows.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [org]);

  function updateEntityTypeDraft(index: number, patch: Partial<PendingEntityType>) {
    setEntityTypesDraft((prev) => prev.map((et, i) => (i === index ? { ...et, ...patch } : et)));
  }

  function addEntityTypeDraft() {
    setEntityTypesDraft((prev) => [...prev, { id: "", code: "", name: "", nameAr: "" }]);
  }

  function removeEntityTypeDraft(index: number) {
    setEntityTypesDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function moveEntityTypeDraft(index: number, direction: "up" | "down") {
    setEntityTypesDraft((prev) => {
      const next = prev.slice();
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

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
        alert(te(result.error) || t("failedToDeleteOrganization"));
      }
    } finally {
      setDeletingOrg(false);
    }
  }

  async function handleSaveEntityTypes() {
    if (!org) return;
    setSavingEntityTypes(true);
    try {
      const normalized = entityTypesDraft.map((et) => ({
        id: et.id && et.id.length ? et.id : undefined,
        code: et.code.trim().toLowerCase(),
        name: et.name.trim(),
        nameAr: et.nameAr.trim() || undefined,
      }));

      const result = await updateOrganizationEntityTypes({ orgId: org.id, entityTypes: normalized });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data as OrgDetails);
        setEntityTypesOpen(false);
        router.refresh();
      } else {
        alert(te(result.error) || t("unexpectedError"));
      }
    } finally {
      setSavingEntityTypes(false);
    }
  }

  async function handleSaveName() {
    if (!org) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization({
        orgId: org.id,
        name: nameDraft.trim(),
        nameAr: nameArDraft.trim() || undefined,
      });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data as OrgDetails);
        setEditNameOpen(false);
        router.refresh();
      } else {
        alert(te(result.error) || t("failedToUpdateOrganization"));
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
        setOrg(data as OrgDetails);
        setEditKpiApprovalOpen(false);
        router.refresh();
      } else {
        alert(te(result.error) || t("failedToUpdateOrganization"));
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
        setOrg(data as OrgDetails);
        setEditDomainOpen(false);
        router.refresh();
      } else {
        alert(te(result.error) || t("failedToUpdateOrganization"));
      }
    } finally {
      setSavingOrg(false);
    }
  }

  async function handleSaveDetails() {
    if (!org) return;
    setSavingOrg(true);
    try {
      const result = await updateOrganization({
        orgId: org.id,
        logoUrl: logoUrlDraft.trim() || undefined,
        mission: missionDraft.trim() || undefined,
        missionAr: missionArDraft.trim() || undefined,
        vision: visionDraft.trim() || undefined,
        visionAr: visionArDraft.trim() || undefined,
        about: aboutDraft.trim() || undefined,
        aboutAr: aboutArDraft.trim() || undefined,
      });
      if (result.success) {
        const data = await getOrganizationDetails(params.orgId);
        setOrg(data as OrgDetails);
        setEditDetailsOpen(false);
        router.refresh();
      } else {
        alert(te(result.error) || t("failedToUpdateOrganization"));
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
        setOrg(data as OrgDetails);
        router.refresh();
      } else {
        alert(te(result.error) || t("failedToCreateUser"));
      }
    } finally {
      setCreatingUser(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loadingEllipsis")}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{loadError ? te(loadError) || loadError : t("organizationNotFound")}</p>
        <Link
          href={`/${locale}/super-admin/organizations`}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90"
        >
          {t("backToOrganizations")}
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
                setNameArDraft(org.nameAr ?? "");
                setEditNameOpen(true);
              }}
              aria-label={t("editOrgName")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </span>
        }
        subtitle={t("organizationDetailsSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={() => setDeleteOrgOpen(true)}>
              <Trash2 className="me-2 h-4 w-4" />
              {t("delete")}
            </Button>
            <Link
              href={`/${locale}/super-admin/organizations`}
              className="inline-flex text-sm font-semibold text-primary hover:opacity-90"
            >
              {t("back")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{t("overview")}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDetailsOpen(true)}>
                {t("edit")}
              </Button>
            </div>
            <CardDescription>{t("tenantMetadata")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("domain")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDomainDraft(org.domain ?? "");
                    setEditDomainOpen(true);
                  }}
                  aria-label={t("editOrgDomain")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">{org.domain || "—"}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("logoUrl")}</p>
              <p className="mt-1 truncate">{org.logoUrl || "—"}</p>
            </div>

            <div className="grid gap-2">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("mission")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap">{org.mission || "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("missionAr")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap" dir="rtl">{org.missionAr || "—"}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("vision")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap">{org.vision || "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("visionAr")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap" dir="rtl">{org.visionAr || "—"}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("about")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap">{org.about || "—"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("aboutAr")}</p>
                <p className="mt-1 text-xs whitespace-pre-wrap" dir="rtl">{org.aboutAr || "—"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("kpiApprovalLevel")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setKpiApprovalDraft((org.kpiApprovalLevel as typeof kpiApprovalDraft) ?? "MANAGER");
                    setEditKpiApprovalOpen(true);
                  }}
                  aria-label={t("editKpiApprovalLevel")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">{String(org.kpiApprovalLevel ?? "MANAGER")}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entities</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => setEntityTypesOpen(true)}
                  aria-label="Edit entities"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              {enabledEntityTypes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">—</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {enabledEntityTypes.map((et) => (
                    <span key={et.id} className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs">
                      {String(et.name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("users")}</p>
              <p className="mt-1">{org._count?.users ?? users.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("created")}</p>
              <p className="mt-1">{formatDate(org.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{t("users")}</CardTitle>
              <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                {t("create")}
              </Button>
            </div>
            <CardDescription>
              {t("userDirectoryAllOrgsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                    <TableHead className="text-right">{t("joined")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {t("noUsersFound")}
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
                        <TableCell className="text-right text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
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
            <DialogTitle>{t("editOrgName")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("updateOrgNameDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">{t("name")}</Label>
              <Input
                id="org-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-name-ar">{t("nameAr")}</Label>
              <Input
                id="org-name-ar"
                value={nameArDraft}
                onChange={(e) => setNameArDraft(e.target.value)}
                className="bg-card"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setNameDraft(org?.name ?? "");
                setNameArDraft(org?.nameAr ?? "");
                setEditNameOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSaveName} disabled={savingOrg}>
              {savingOrg ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("basicDetailsTenantDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-logo">{t("logoUrl")}</Label>
              <Input
                id="org-logo"
                value={logoUrlDraft}
                onChange={(e) => setLogoUrlDraft(e.target.value)}
                placeholder="https://..."
                className="bg-card"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-mission">{t("mission")}</Label>
                <Textarea
                  id="org-mission"
                  value={missionDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMissionDraft(e.target.value)}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-mission-ar">{t("missionAr")}</Label>
                <Textarea
                  id="org-mission-ar"
                  value={missionArDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMissionArDraft(e.target.value)}
                  className="bg-card"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-vision">{t("vision")}</Label>
                <Textarea
                  id="org-vision"
                  value={visionDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisionDraft(e.target.value)}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-vision-ar">{t("visionAr")}</Label>
                <Textarea
                  id="org-vision-ar"
                  value={visionArDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVisionArDraft(e.target.value)}
                  className="bg-card"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-about">{t("about")}</Label>
                <Textarea
                  id="org-about"
                  value={aboutDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAboutDraft(e.target.value)}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-about-ar">{t("aboutAr")}</Label>
                <Textarea
                  id="org-about-ar"
                  value={aboutArDraft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAboutArDraft(e.target.value)}
                  className="bg-card"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setLogoUrlDraft(org?.logoUrl ?? "");
                setMissionDraft(org?.mission ?? "");
                setMissionArDraft(org?.missionAr ?? "");
                setVisionDraft(org?.vision ?? "");
                setVisionArDraft(org?.visionAr ?? "");
                setAboutDraft(org?.about ?? "");
                setAboutArDraft(org?.aboutAr ?? "");
                setEditDetailsOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSaveDetails} disabled={savingOrg}>
              {savingOrg ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editKpiApprovalOpen} onOpenChange={setEditKpiApprovalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editKpiApprovalLevel")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("chooseMinRoleApprovalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t("kpiApprovalLevel")}</Label>
            <Select value={kpiApprovalDraft} onValueChange={(v) => setKpiApprovalDraft(v as typeof kpiApprovalDraft)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">{t("roleManager")}</SelectItem>
                <SelectItem value="EXECUTIVE">{t("roleExecutive")}</SelectItem>
                <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
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
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSaveKpiApprovalLevel} disabled={savingOrg}>
              {savingOrg ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entityTypesOpen} onOpenChange={setEntityTypesOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entities</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage the entity types and their order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {entityTypesDraft.map((et, idx) => (
              <div key={`${et.id || et.code}-${idx}`} className="rounded-xl border border-border bg-card p-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input
                      value={et.code}
                      onChange={(e) => updateEntityTypeDraft(idx, { code: e.target.value })}
                      onBlur={() => updateEntityTypeDraft(idx, { code: et.code.trim().toLowerCase() })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("name")}</Label>
                    <Input
                      value={et.name}
                      onChange={(e) => updateEntityTypeDraft(idx, { name: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("nameAr")}</Label>
                    <Input
                      value={et.nameAr}
                      onChange={(e) => updateEntityTypeDraft(idx, { nameAr: e.target.value })}
                      className="bg-background"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" onClick={() => moveEntityTypeDraft(idx, "up")} disabled={idx === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveEntityTypeDraft(idx, "down")}
                      disabled={idx === entityTypesDraft.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button type="button" size="icon" variant="ghost" onClick={() => removeEntityTypeDraft(idx)} disabled={entityTypesDraft.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addEntityTypeDraft}>
              <Plus className="me-2 h-4 w-4" />
              {t("add")}
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const types = ((org?.entityTypes ?? []) as OrgDetails["entityTypes"]) ?? [];
                setEntityTypesDraft(
                  types
                    .slice()
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((t) => ({
                      id: t.id,
                      code: String(t.code ?? ""),
                      name: String(t.name ?? ""),
                      nameAr: t.nameAr ? String(t.nameAr) : "",
                    })),
                );
                setEntityTypesOpen(false);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSaveEntityTypes} disabled={savingEntityTypes || entityTypesDraft.length === 0}>
              {savingEntityTypes ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDomainOpen} onOpenChange={setEditDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editOrgDomain")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("setDomainOptionalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="org-domain">{t("domain")}</Label>
            <Input
              id="org-domain"
              value={domainDraft}
              onChange={(e) => setDomainDraft(e.target.value)}
              placeholder="example.com"
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
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSaveDomain} disabled={savingOrg}>
              {savingOrg ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createUser")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("addUserToOrg")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">{t("fullName")}</Label>
              <Input
                id="user-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">{t("email")}</Label>
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
              <Label htmlFor="user-password">{t("password")}</Label>
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
              <Label>{t("role")}</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val as Role })}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  {(["ADMIN", "EXECUTIVE", "MANAGER"] as Role[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateUserOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? t("creating") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteOrganization")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("softDeleteOrgWarning")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOrgOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteOrg} disabled={deletingOrg}>
              {deletingOrg ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/providers/locale-provider";
import { deleteUser, getOrganizations, getUserDetails, updateUser } from "@/actions/admin";
import { Pencil, Trash2 } from "lucide-react";
import type { Organization, Role } from "@prisma/client";

type UserDetails = Awaited<ReturnType<typeof getUserDetails>>;

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { locale, tr } = useLocale();
  const [userDetails, setUserDetails] = useState<UserDetails>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "EMPLOYEE" as Role,
    orgId: "",
  });

  const initials = useMemo(() => {
    const name = userDetails?.name?.trim() ?? "";
    if (!name) return "—";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [userDetails?.name]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getUserDetails(params.userId);
        if (isMounted) {
          setUserDetails(data);
          setDraft({
            name: data?.name ?? "",
            email: data?.email ?? "",
            role: (data?.role ?? "EMPLOYEE") as Role,
            orgId: data?.org?.id ?? "",
          });
        }
      } catch (error) {
        console.error("Failed to load user", error);
        if (isMounted) setUserDetails(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [params.userId]);

  useEffect(() => {
    let isMounted = true;
    async function loadOrgs() {
      try {
        const data = await getOrganizations();
        if (isMounted) setOrgs(data);
      } catch (error) {
        console.error("Failed to load organizations", error);
      }
    }

    void loadOrgs();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (!userDetails) return;

    setSaving(true);
    try {
      const result = await updateUser({
        userId: userDetails.id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        role: draft.role,
        orgId: draft.orgId,
      });

      if (result.success && result.user) {
        setUserDetails(result.user as UserDetails);
        setEditOpen(false);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to update user", "فشل تحديث المستخدم"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!userDetails) return;
    setDeleting(true);
    try {
      const result = await deleteUser({ userId: userDetails.id });
      if (result.success) {
        setDeleteOpen(false);
        router.push(`/${locale}/super-admin/users`);
        router.refresh();
      } else {
        alert(result.error || tr("Failed to delete user", "فشل حذف المستخدم"));
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{tr("User not found.", "المستخدم غير موجود.")}</p>
        <Link
          href={`/${locale}/super-admin/users`}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90"
        >
          {tr("Back to users", "العودة للمستخدمين")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span>{userDetails.name}</span>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
              onClick={() => {
                setDraft({
                  name: userDetails.name ?? "",
                  email: userDetails.email ?? "",
                  role: (userDetails.role ?? "EMPLOYEE") as Role,
                  orgId: userDetails.org?.id ?? "",
                });
                setEditOpen(true);
              }}
              aria-label={tr("Edit user", "تعديل المستخدم")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </span>
        }
        subtitle={tr(
          `User details for ${userDetails.org?.name ?? "—"}.`,
          `تفاصيل المستخدم للمؤسسة ${userDetails.org?.name ?? "—"}.`,
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {tr("Delete", "حذف")}
            </Button>
            <Link
              href={`/${locale}/super-admin/users`}
              className="inline-flex text-sm font-semibold text-primary hover:opacity-90"
            >
              {tr("Back", "رجوع")}
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border bg-card">
                <AvatarFallback className="bg-muted text-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{userDetails.name}</CardTitle>
                <CardDescription>{userDetails.role}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Email", "البريد الإلكتروني")}</p>
              <p className="mt-1">{userDetails.email}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Role", "الدور")}</p>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDraft({
                      name: userDetails.name ?? "",
                      email: userDetails.email ?? "",
                      role: (userDetails.role ?? "EMPLOYEE") as Role,
                      orgId: userDetails.org?.id ?? "",
                    });
                    setEditOpen(true);
                  }}
                  aria-label={tr("Edit role", "تعديل الدور")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1">{userDetails.role}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Organization", "المؤسسة")}</p>
              {userDetails.org?.id ? (
                <Link
                  href={`/${locale}/super-admin/organizations/${userDetails.org.id}`}
                  className="mt-1 inline-flex font-medium text-primary hover:opacity-90"
                >
                  {userDetails.org.name}
                </Link>
              ) : (
                <p className="mt-1">—</p>
              )}
            </div>
            <Separator className="bg-border" />
            <p className="text-xs text-muted-foreground">{tr("Use the edit button above to update this user.", "استخدم زر التعديل أعلاه لتحديث هذا المستخدم.")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Metadata", "معلومات")}</CardTitle>
            <CardDescription>
              {tr(
                "Basic user metadata for support and audit purposes.",
                "بيانات المستخدم الأساسية لأغراض الدعم والتدقيق.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold">{tr("User ID", "معرّف المستخدم")}</p>
              <p className="mt-1 text-xs text-muted-foreground break-all">{userDetails.id}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="font-semibold">{tr("Created", "تاريخ الإنشاء")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(userDetails.createdAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr("Edit User", "تعديل المستخدم")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("Update user details.", "قم بتحديث بيانات المستخدم.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{tr("Full Name", "الاسم الكامل")}</Label>
              <Input id="edit-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="bg-card" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">{tr("Email", "البريد الإلكتروني")}</Label>
              <Input
                id="edit-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>{tr("Role", "الدور")}</Label>
              <Select value={draft.role} onValueChange={(val) => setDraft({ ...draft, role: val as Role })}>
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

            <div className="space-y-2">
              <Label>{tr("Organization", "المؤسسة")}</Label>
              <Select value={draft.orgId} onValueChange={(val) => setDraft({ ...draft, orgId: val })}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder={tr("Select Organization", "اختر المؤسسة")} />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft({
                  name: userDetails?.name ?? "",
                  email: userDetails?.email ?? "",
                  role: (userDetails?.role ?? "EMPLOYEE") as Role,
                  orgId: userDetails?.org?.id ?? "",
                });
                setEditOpen(false);
              }}
            >
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? tr("Saving...", "جارٍ الحفظ...") : tr("Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Delete User", "حذف المستخدم")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {tr("This will soft-delete the user (can be restored in DB).", "سيتم حذف المستخدم (حذف منطقي).")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {tr("Cancel", "إلغاء")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? tr("Deleting...", "جارٍ الحذف...") : tr("Delete", "حذف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

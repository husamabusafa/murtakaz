"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { getUsers, createUser, getOrganizations } from "@/actions/admin";
import type { User, Organization, Role } from "@prisma/client";

const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "PMO", "MANAGER", "EMPLOYEE"] as Role[];

export default function UsersManagementPage() {
  const { tr } = useLocale();
  const router = useRouter();

  const [users, setUsers] = useState<(User & { org: Organization })[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as Role,
    orgId: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, orgsData] = await Promise.all([getUsers(), getOrganizations()]);
      setUsers(usersData as (User & { org: Organization })[]);
      setOrgs(orgsData);
      if (orgsData.length > 0) {
        setNewUser((prev) => ({ ...prev, orgId: orgsData[0].id }));
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.orgId) {
      alert("Please select an organization");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createUser(newUser);
      if (result.success) {
        setCreateOpen(false);
        setNewUser({
          name: "",
          email: "",
          password: "",
          role: "EMPLOYEE",
          orgId: orgs[0]?.id || "",
        });
        loadData();
        router.refresh();
      } else {
        alert(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title={tr("Users", "المستخدمون")}
          subtitle={tr("Manage users, roles, and organization assignment.", "إدارة المستخدمين والأدوار وتعيين المؤسسات.")}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tr("New User", "مستخدم جديد")}
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-slate-900 text-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{tr("Create User", "إنشاء مستخدم")}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {tr("Add a new user to an organization.", "إضافة مستخدم جديد إلى مؤسسة.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tr("Full Name", "الاسم الكامل")}</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="border-white/10 bg-slate-950/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{tr("Email", "البريد الإلكتروني")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="border-white/10 bg-slate-950/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{tr("Password", "كلمة المرور")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="******"
                  required
                  minLength={6}
                  className="border-white/10 bg-slate-950/50"
                />
              </div>

              <div className="space-y-2">
                <Label>{tr("Organization", "المؤسسة")}</Label>
                <Select value={newUser.orgId} onValueChange={(val) => setNewUser({ ...newUser, orgId: val })}>
                  <SelectTrigger className="border-white/10 bg-slate-950/50">
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

              <div className="space-y-2">
                <Label>{tr("Role", "الدور")}</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val as Role })}>
                  <SelectTrigger className="border-white/10 bg-slate-950/50">
                    <SelectValue placeholder={tr("Select Role", "اختر الدور")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  {tr("Cancel", "إلغاء")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? tr("Creating...", "جارٍ الإنشاء...") : tr("Create", "إنشاء")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{tr("User Directory", "دليل المستخدمين")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr("View and manage users across all organizations.", "عرض وإدارة المستخدمين في جميع المؤسسات.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("User", "المستخدم")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Organization", "المؤسسة")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Role", "الدور")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Joined", "تاريخ الانضمام")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      {tr("Loading...", "جارٍ التحميل...")}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      {tr("No users found.", "لا يوجد مستخدمين.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-slate-400">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-200">{user.org?.name || "—"}</TableCell>
                      <TableCell className="text-slate-100">
                        <Badge variant="outline" className="border-white/20 bg-white/5">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

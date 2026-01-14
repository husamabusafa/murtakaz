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
import type { User, Organization, Role } from "@/generated/prisma-client";

const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "MANAGER"] as Role[];

export default function UsersManagementPage() {
  const { t, locale } = useLocale();
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
    role: "MANAGER" as Role,
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
      alert(t("selectOrganization"));
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
          role: "MANAGER",
          orgId: orgs[0]?.id || "",
        });
        loadData();
        router.refresh();
      } else {
        alert(result.error || t("failedToCreateUser"));
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
          title={t("users")}
          subtitle={t("superAdminUsersSubtitle")}
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="me-2 h-4 w-4" />
              {t("newUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
            <DialogHeader>
              <DialogTitle>{t("createUser")}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t("addUserToOrgDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("fullName")}</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="******"
                  required
                  minLength={6}
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("organization")}</Label>
                <Select value={newUser.orgId} onValueChange={(val) => setNewUser({ ...newUser, orgId: val })}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={t("selectOrganization")} />
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
                <Label>{t("role")}</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val as Role })}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={t("selectRole")} />
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
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("userDirectory")}</CardTitle>
          <CardDescription>
            {t("userDirectoryAllOrgsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("user")}</TableHead>
                  <TableHead>{t("organization")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead className="text-right">{t("joined")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t("loadingEllipsis")}
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
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
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.org?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border bg-muted/30">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
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

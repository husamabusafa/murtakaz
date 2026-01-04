"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { createOrganization, getOrganizations } from "@/actions/admin";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import type { Organization } from "@prisma/client";

export default function OrganizationsPage() {
  const { tr, locale } = useLocale();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<(Organization & { _count?: { users: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");

  useEffect(() => {
    void loadOrganizations();
  }, []);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error("Failed to load organizations", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await createOrganization({ name, domain });
      if (result.success) {
        setCreateOpen(false);
        setName("");
        setDomain("");
        await loadOrganizations();
        router.refresh();
      } else {
        alert(result.error || "Failed to create organization");
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
          title={tr("Organizations", "المؤسسات")}
          subtitle={tr("Manage tenant organizations and their settings.", "إدارة المؤسسات وإعداداتها.")}
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tr("New Organization", "مؤسسة جديدة")}
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-slate-900 text-white">
            <DialogHeader>
              <DialogTitle>{tr("Create Organization", "إنشاء مؤسسة")}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {tr("Add a new tenant to the system.", "إضافة مستأجر جديد للنظام.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tr("Name", "الاسم")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Corp"
                  required
                  className="border-white/10 bg-slate-950/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">{tr("Domain", "النطاق")}</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="acme.com"
                  className="border-white/10 bg-slate-950/50"
                />
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
          <CardTitle className="text-base">{tr("All Organizations", "جميع المؤسسات")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr("List of all registered organizations in the system.", "قائمة بجميع المؤسسات المسجلة في النظام.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("Name", "الاسم")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Domain", "النطاق")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Users", "المستخدمين")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Created At", "تاريخ الإنشاء")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      {tr("Loading...", "جارٍ التحميل...")}
                    </TableCell>
                  </TableRow>
                ) : organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      {tr("No organizations found.", "لا توجد مؤسسات.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow
                      key={org.id}
                      className="border-white/10 hover:bg-white/5 cursor-pointer"
                      onClick={() => router.push(`/${locale}/super-admin/organizations/${org.id}`)}
                    >
                      <TableCell className="font-medium text-white">{org.name}</TableCell>
                      <TableCell className="text-slate-200">{org.domain || "—"}</TableCell>
                      <TableCell className="text-slate-200">{org._count?.users || 0}</TableCell>
                      <TableCell className="text-right text-slate-400">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
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

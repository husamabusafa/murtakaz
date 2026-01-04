"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { getOrganizations } from "@/actions/admin";
import { Plus } from "lucide-react";
import type { Organization } from "@prisma/client";

export default function OrganizationsPage() {
  const { tr, locale } = useLocale();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<(Organization & { _count?: { users: number } })[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title={tr("Organizations", "المؤسسات")}
          subtitle={tr("Manage tenant organizations and their settings.", "إدارة المؤسسات وإعداداتها.")}
        />
        <Button asChild>
          <Link href={`/${locale}/super-admin/organizations/create`}>
            <Plus className="mr-2 h-4 w-4" />
            {tr("New Organization", "مؤسسة جديدة")}
          </Link>
        </Button>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("All Organizations", "جميع المؤسسات")}</CardTitle>
          <CardDescription>
            {tr("List of all registered organizations in the system.", "قائمة بجميع المؤسسات المسجلة في النظام.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Name", "الاسم")}</TableHead>
                  <TableHead>{tr("Domain", "النطاق")}</TableHead>
                  <TableHead>{tr("Users", "المستخدمين")}</TableHead>
                  <TableHead className="text-right">{tr("Created At", "تاريخ الإنشاء")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {tr("Loading...", "جارٍ التحميل...")}
                    </TableCell>
                  </TableRow>
                ) : organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {tr("No organizations found.", "لا توجد مؤسسات.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/${locale}/super-admin/organizations/${org.id}`)}
                    >
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">{org.domain || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{org._count?.users || 0}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
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

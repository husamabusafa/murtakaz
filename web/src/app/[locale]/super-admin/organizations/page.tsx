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
import type { Organization } from "@/generated/prisma-client";

export default function OrganizationsPage() {
  const { t, locale } = useLocale();
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
          title={t("organizations")}
          subtitle={t("organizationsSubtitle")}
        />
        <Button asChild>
          <Link href={`/${locale}/super-admin/organizations/create`}>
            <Plus className="me-2 h-4 w-4" />
            {t("newOrganization")}
          </Link>
        </Button>
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("allOrganizations")}</CardTitle>
          <CardDescription>
            {t("organizationsListDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("domain")}</TableHead>
                  <TableHead>{t("users")}</TableHead>
                  <TableHead className="text-right">{t("createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("loadingEllipsis")}
                    </TableCell>
                  </TableRow>
                ) : organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t("noOrganizationsFound")}
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

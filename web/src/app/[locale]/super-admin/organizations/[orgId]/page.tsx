"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { getOrganizationDetails } from "@/actions/admin";

type OrgDetails = Awaited<ReturnType<typeof getOrganizationDetails>>;

type OrgUserRow = NonNullable<OrgDetails> extends { users: Array<infer U> } ? U : never;

export default function OrganizationDetailsPage() {
  const params = useParams<{ orgId: string }>();
  const router = useRouter();
  const { locale, tr } = useLocale();

  const [org, setOrg] = useState<OrgDetails>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getOrganizationDetails(params.orgId);
        if (isMounted) setOrg(data);
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

  const users = useMemo(() => (org ? (org.users as OrgUserRow[]) : []), [org]);

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
        title={org.name}
        subtitle={tr(
          "Organization details and user directory.",
          "تفاصيل المؤسسة ودليل المستخدمين.",
        )}
        actions={
          <Link
            href={`/${locale}/super-admin/organizations`}
            className="inline-flex text-sm font-semibold text-primary hover:opacity-90"
          >
            {tr("Back", "رجوع")}
          </Link>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Domain", "النطاق")}</p>
              <p className="mt-1">{org.domain || "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Users", "المستخدمون")}</p>
              <p className="mt-1">{org._count?.users ?? users.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tr("Created", "تاريخ الإنشاء")}</p>
              <p className="mt-1">{new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Users", "المستخدمون")}</CardTitle>
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
    </div>
  );
}

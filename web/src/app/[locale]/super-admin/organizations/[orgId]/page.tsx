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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Organization not found.", "المؤسسة غير موجودة.")}</p>
        <Link
          href={`/${locale}/super-admin/organizations`}
          className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
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
            className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100"
          >
            {tr("Back", "رجوع")}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-base">{tr("Overview", "نظرة عامة")}</CardTitle>
            <CardDescription className="text-slate-200">{tr("Tenant metadata", "بيانات المؤسسة")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Domain", "النطاق")}</p>
              <p className="mt-1 text-white">{org.domain || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Users", "المستخدمون")}</p>
              <p className="mt-1 text-white">{org._count?.users ?? users.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Created", "تاريخ الإنشاء")}</p>
              <p className="mt-1 text-white">{new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{tr("Users", "المستخدمون")}</CardTitle>
            <CardDescription className="text-slate-200">
              {tr("All users assigned to this organization.", "جميع المستخدمين في هذه المؤسسة.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/0">
                    <TableHead className="text-slate-200">{tr("Name", "الاسم")}</TableHead>
                    <TableHead className="text-slate-200">{tr("Email", "البريد")}</TableHead>
                    <TableHead className="text-slate-200">{tr("Role", "الدور")}</TableHead>
                    <TableHead className="text-right text-slate-200">{tr("Joined", "تاريخ الانضمام")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        {tr("No users found.", "لا يوجد مستخدمين.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => router.push(`/${locale}/super-admin/users/${user.id}`)}
                      >
                        <TableCell className="font-medium text-white">{user.name}</TableCell>
                        <TableCell className="text-slate-200">{user.email}</TableCell>
                        <TableCell className="text-slate-200">{user.role}</TableCell>
                        <TableCell className="text-right text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
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

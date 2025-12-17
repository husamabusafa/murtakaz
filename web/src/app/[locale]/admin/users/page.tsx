"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ApprovalBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoUsers, isAdmin } from "@/lib/demo-users";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function UsersManagementPage() {
  const { user, loading } = useAuth();
  const { locale, tr } = useLocale();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading…", "جارٍ التحميل…")}</p>
      </div>
    );
  }

  if (!isAdmin(user)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Access denied. Admin role is required.", "لا يوجد صلاحية. يتطلب دور مسؤول.")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to overview", "العودة للنظرة العامة")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={tr("Users", "المستخدمون")} subtitle={tr("User directory, roles, and profile management (prototype).", "دليل المستخدمين والأدوار وإدارة الملف الشخصي (نموذج أولي).")} />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{tr("Directory", "الدليل")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr("In Phase 1, users come from SSO (NextAuth) and are assigned roles/departments.", "في المرحلة الأولى يتم جلب المستخدمين من SSO (NextAuth) وتعيين الأدوار/الإدارات.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("User", "المستخدم")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Department", "الإدارة")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Role", "الدور")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Status", "الحالة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoUsers.map((demoUser) => (
                  <TableRow key={demoUser.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <Link href={`/${locale}/admin/users/${demoUser.id}`} className="hover:underline">
                        {demoUser.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-200">{demoUser.email}</p>
                    </TableCell>
                    <TableCell className="text-slate-200">{demoUser.department ?? "—"}</TableCell>
                    <TableCell className="text-slate-100">{demoUser.role}</TableCell>
                    <TableCell className="text-right">
                      <ApprovalBadge status="APPROVED" className="ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

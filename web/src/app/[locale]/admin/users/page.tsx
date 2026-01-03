"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function UsersManagementPage() {
  const { tr } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Users", "المستخدمون")}
        subtitle={tr(
          "Organization user management will be implemented for ADMIN role.",
          "سيتم تنفيذ إدارة مستخدمي المؤسسة لدور المسؤول.",
        )}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-base">{tr("User Management", "إدارة المستخدمين")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr(
              "This section is reserved for managing users within your organization.",
              "هذا القسم مخصص لإدارة المستخدمين ضمن مؤسستك.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-200">
            {tr(
              "For now, tenant-wide user creation is under Super Admin. Regular ADMIN user management will be added next.",
              "حاليًا إنشاء المستخدمين على مستوى النظام متاح في الإدارة العليا. سيتم إضافة إدارة المستخدمين للمسؤول لاحقًا.",
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

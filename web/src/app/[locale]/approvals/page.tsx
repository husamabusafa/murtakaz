"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ApprovalBadge } from "@/components/rag-badge";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/providers/locale-provider";
import { useAllChangeRequests } from "@/lib/prototype-store";

export default function ApprovalsPage() {
  const { locale, t, tr } = useLocale();
  const changeRequests = useAllChangeRequests();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("approvals")}
        subtitle={tr("Governance queue for change requests across strategy items and KPIs.", "قائمة الحوكمة لطلبات التغيير عبر عناصر الاستراتيجية والمؤشرات.")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:checks" className="h-4 w-4 text-slate-100" />
            {tr("Approval queue", "قائمة الموافقات")}
          </CardTitle>
          <CardDescription className="text-slate-200">{tr("Review, compare before/after, approve or reject (demo).", "مراجعة ومقارنة قبل/بعد، ثم الموافقة أو الرفض (عرض تجريبي).")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("Entity", "العنصر")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Requested by", "مقدم الطلب")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Age", "العمر")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Status", "الحالة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((cr) => (
                  <TableRow key={cr.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <Link href={`/${locale}/approvals/${cr.id}`} className="hover:underline">
                        {cr.entityType}: {cr.entityName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-200">{cr.requestedBy}</TableCell>
                    <TableCell className="text-slate-200">
                      {cr.createdAt ? Math.max(0, Math.ceil((Date.now() - new Date(cr.createdAt).getTime()) / (24 * 60 * 60 * 1000))) : cr.ageDays}d
                    </TableCell>
                    <TableCell className="text-right">
                      <ApprovalBadge status={cr.status} className="ml-auto" />
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

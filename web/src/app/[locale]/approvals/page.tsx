"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { getOrgKpiApprovals } from "@/actions/kpis";
import { useEffect, useMemo, useState } from "react";

export default function ApprovalsPage() {
  const { locale, t, tr, nodeTypeLabel, kpiValueStatusLabel } = useLocale();

  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getOrgKpiApprovals>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusParam = useMemo(() => {
    if (filter === "PENDING") return "SUBMITTED" as const;
    if (filter === "APPROVED") return "APPROVED" as const;
    return undefined;
  }, [filter]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getOrgKpiApprovals(statusParam ? { status: statusParam } : undefined);
        if (!mounted) return;
        setRows(data);
      } catch (e: unknown) {
        if (!mounted) return;
        setRows([]);
        setError(e instanceof Error ? e.message : tr("Failed to load approvals", "فشل تحميل الموافقات"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [statusParam, tr]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("approvals")}
        subtitle={tr("Approval queue and history for KPI values.", "قائمة الاعتماد والسجل لقيم مؤشرات الأداء الرئيسية.")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:checks" className="h-4 w-4 text-slate-100" />
            {tr("KPI approvals", "اعتمادات مؤشرات الأداء الرئيسية")}
          </CardTitle>
          <CardDescription className="text-slate-200">
            {tr("Submitted KPI values waiting for approval and full approval history.", "قيم مؤشرات الأداء الرئيسية المرسلة بانتظار الاعتماد وسجل الاعتمادات بالكامل.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filter === "PENDING" ? "default" : "outline"}
              className={filter === "PENDING" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setFilter("PENDING")}
            >
              {tr("Pending", "قيد الاعتماد")}
            </Button>
            <Button
              size="sm"
              variant={filter === "APPROVED" ? "default" : "outline"}
              className={filter === "APPROVED" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setFilter("APPROVED")}
            >
              {tr("Approved", "معتمد")}
            </Button>
            <Button
              size="sm"
              variant={filter === "ALL" ? "default" : "outline"}
              className={filter === "ALL" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setFilter("ALL")}
            >
              {tr("All", "الكل")}
            </Button>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 whitespace-pre-wrap">
              {error}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{tr("KPI", "مؤشر أداء رئيسي")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Period", "الفترة")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Value", "القيمة")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Submitted by", "مرسل بواسطة")}</TableHead>
                  <TableHead className="text-slate-200">{tr("Submitted at", "تاريخ الإرسال")}</TableHead>
                  <TableHead className="text-right text-slate-200">{tr("Status", "الحالة")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="py-8 text-center text-slate-200">
                      {tr("Loading…", "جارٍ التحميل…")}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="py-8 text-center text-slate-200">
                      {tr("No approvals found.", "لا توجد موافقات.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <Link href={`/${locale}/kpis/${row.kpiId}`} className="hover:underline">
                          {row.kpi.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-200">
                          {(row.kpi.primaryNode?.nodeType
                            ? nodeTypeLabel(row.kpi.primaryNode.nodeType.code, row.kpi.primaryNode.nodeType.displayName)
                            : tr("Type", "النوع"))}{" "}
                          • {row.kpi.primaryNode?.name ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {new Date(row.periodEnd).toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {typeof row.calculatedValue === "number" ? row.calculatedValue : "—"}
                      </TableCell>
                      <TableCell className="text-slate-200">{row.submittedByUser?.name ?? "—"}</TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right text-slate-200">{kpiValueStatusLabel(String(row.status))}</TableCell>
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

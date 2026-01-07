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
  const { locale, t, nodeTypeLabel, kpiValueStatusLabel, formatDate, formatNumber } = useLocale();

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
        setError(e instanceof Error ? e.message : t("approvalsFailedToLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [statusParam, t]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("approvals")}
        subtitle={t("approvalsSubtitle")}
        icon={<Icon name="tabler:gavel" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon name="tabler:checks" className="h-4 w-4 text-slate-100" />
            {t("kpiApprovals")}
          </CardTitle>
          <CardDescription className="text-slate-200">
            {t("submittedKpiValuesDesc")}
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
              {t("pending")}
            </Button>
            <Button
              size="sm"
              variant={filter === "APPROVED" ? "default" : "outline"}
              className={filter === "APPROVED" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setFilter("APPROVED")}
            >
              {t("approved")}
            </Button>
            <Button
              size="sm"
              variant={filter === "ALL" ? "default" : "outline"}
              className={filter === "ALL" ? "" : "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"}
              onClick={() => setFilter("ALL")}
            >
              {t("all")}
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
                  <TableHead className="text-slate-200">{t("kpi")}</TableHead>
                  <TableHead className="text-slate-200">{t("period")}</TableHead>
                  <TableHead className="text-slate-200">{t("value")}</TableHead>
                  <TableHead className="text-slate-200">{t("submittedBy")}</TableHead>
                  <TableHead className="text-slate-200">{t("submittedAt")}</TableHead>
                  <TableHead className="text-right text-slate-200">{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="py-8 text-center text-slate-200">
                      {t("loading")}…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="py-8 text-center text-slate-200">
                      {t("noApprovalsFound")}
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
                            : t("type"))}{" "}
                          • {row.kpi.primaryNode?.name ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {formatDate(row.periodEnd)}
                      </TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {formatNumber(row.calculatedValue)}
                      </TableCell>
                      <TableCell className="text-slate-200">{row.submittedByUser?.name ?? "—"}</TableCell>
                      <TableCell className="text-slate-200" dir="ltr">
                        {row.submittedAt ? formatDate(row.submittedAt, { dateStyle: "medium", timeStyle: "short" }) : "—"}
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
